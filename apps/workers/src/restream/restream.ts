/**
 * Restream worker — runs on the host with ffmpeg installed (VPS or studio
 * PC). Polls the API for enabled destinations and spawns one ffmpeg process
 * per destination, piping the WCCG Icecast/Shoutcast stream to RTMP
 * (YouTube / Twitch / Facebook / custom) or to Discord (via the discord.js
 * voice gateway — left as TODO for v1).
 *
 * Design:
 *   - ONE ffmpeg subprocess per enabled destination.
 *   - Reconciliation loop every 30s — enable/disable changes get picked up.
 *   - Heartbeat to the API every 60s while a process is alive.
 *   - Auto-restart with exponential backoff on crash (1s, 2s, 4s, … capped 60s).
 *   - All status reported to the API via POST /restream/agent/events.
 *
 * Required env:
 *   WCCG_API_URL                  api base
 *   RESTREAM_AGENT_TOKEN          bearer for /restream/agent/*
 *
 * Optional:
 *   FFMPEG_BIN                    path to ffmpeg (default: 'ffmpeg' on PATH)
 *   WCCG_RESTREAM_POLL_MS         reconcile interval (default 30000)
 *
 * The worker no-ops gracefully if ffmpeg isn't installed; the operator
 * gets a per-destination error event explaining the missing binary.
 */

import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const DEFAULT_POLL_MS = 30_000;
const HEARTBEAT_MS = 60_000;
const MAX_BACKOFF_MS = 60_000;

interface Destination {
  id: string;
  slug: string;
  label: string;
  platform: 'youtube' | 'twitch' | 'facebook' | 'discord' | 'rtmp_custom';
  rtmp_url: string | null;
  stream_key: string | null;
  discord_guild_id: string | null;
  discord_channel_id: string | null;
  discord_bot_token: string | null;
  video_mode: 'static' | 'waveform' | 'none';
  background_url: string | null;
  video_bitrate_kbps: number | null;
  audio_bitrate_kbps: number | null;
  source_url: string | null;
  source_format: string | null;
  enabled: boolean;
}

interface Config {
  apiUrl: string;
  agentToken: string;
  ffmpeg: string;
  pollMs: number;
}

function loadConfig(): Config | null {
  const apiUrl = process.env.WCCG_API_URL;
  const agentToken = process.env.RESTREAM_AGENT_TOKEN;
  if (!apiUrl || !agentToken) return null;
  return {
    apiUrl,
    agentToken,
    ffmpeg: process.env.FFMPEG_BIN || 'ffmpeg',
    pollMs: Number(process.env.WCCG_RESTREAM_POLL_MS) || DEFAULT_POLL_MS,
  };
}

function logTs(): string { return new Date().toISOString(); }

class FfmpegStream {
  proc: ChildProcessWithoutNullStreams | null = null;
  heartbeatTimer: NodeJS.Timeout | null = null;
  restartTimer: NodeJS.Timeout | null = null;
  backoffMs = 1000;
  stopped = false;

  constructor(private readonly c: Config, private readonly dest: Destination) {}

  async start(): Promise<void> {
    if (this.proc) return;
    this.stopped = false;
    const args = this.buildArgs();
    if (!args) {
      await reportEvent(this.c, {
        destinationId: this.dest.id,
        eventType: 'error',
        message: `unsupported platform ${this.dest.platform} (Discord not yet implemented in v1)`,
      });
      return;
    }

    let proc: ChildProcessWithoutNullStreams;
    try {
      proc = spawn(this.c.ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      await reportEvent(this.c, {
        destinationId: this.dest.id,
        eventType: 'error',
        message: `failed to spawn ffmpeg: ${(e as Error).message}`,
      });
      this.scheduleRestart();
      return;
    }

    this.proc = proc;
    console.log(`[${logTs()}] [restream] ${this.dest.slug} → ffmpeg pid=${proc.pid}`);
    await reportEvent(this.c, {
      destinationId: this.dest.id,
      eventType: 'start',
      message: `pid=${proc.pid}`,
    });

    let stderrBuf = '';
    proc.stderr.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString();
      if (stderrBuf.length > 4096) stderrBuf = stderrBuf.slice(-4096);
    });

    this.heartbeatTimer = setInterval(() => {
      void reportEvent(this.c, {
        destinationId: this.dest.id,
        eventType: 'heartbeat',
      }).catch(() => null);
    }, HEARTBEAT_MS);

    proc.on('exit', (code, signal) => {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
      this.proc = null;
      const msg = `exit code=${code} signal=${signal ?? '-'} | tail=${stderrBuf.split('\n').slice(-3).join(' | ')}`;
      console.warn(`[${logTs()}] [restream] ${this.dest.slug} exited: ${msg}`);

      if (this.stopped) {
        void reportEvent(this.c, {
          destinationId: this.dest.id,
          eventType: 'stop',
          message: 'stopped by reconciler',
        }).catch(() => null);
      } else {
        void reportEvent(this.c, {
          destinationId: this.dest.id,
          eventType: 'error',
          message: msg,
        }).catch(() => null);
        this.scheduleRestart();
      }
    });
  }

  stop(): void {
    this.stopped = true;
    if (this.restartTimer) clearTimeout(this.restartTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.proc) {
      // SIGTERM is the right signal; ffmpeg flushes RTMP cleanly.
      this.proc.kill('SIGTERM');
    }
  }

  scheduleRestart() {
    if (this.stopped) return;
    this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
    void reportEvent(this.c, {
      destinationId: this.dest.id,
      eventType: 'reconnect',
      message: `restarting in ${Math.round(this.backoffMs / 1000)}s`,
    }).catch(() => null);
    this.restartTimer = setTimeout(() => this.start(), this.backoffMs);
  }

  /** Build ffmpeg args for the destination. Returns null if not implementable here. */
  private buildArgs(): string[] | null {
    if (this.dest.platform === 'discord') return null;
    const src = this.dest.source_url || 'http://stream.wccg1045fm.com:8000/wccg';
    const dst = `${this.dest.rtmp_url ?? ''}/${this.dest.stream_key ?? ''}`.replace(/\/+$/, '');
    const vBitrate = `${this.dest.video_bitrate_kbps ?? 2500}k`;
    const aBitrate = `${this.dest.audio_bitrate_kbps ?? 128}k`;

    if (this.dest.video_mode === 'none') {
      // Pure audio relay (works for custom RTMP audio endpoints, NOT YouTube/Twitch).
      return [
        '-re',
        '-i', src,
        '-c:a', 'aac', '-b:a', aBitrate, '-ar', '44100',
        '-f', 'flv',
        '-rtmp_live', 'live',
        dst,
      ];
    }

    // Static image + audio (the common YouTube/Twitch "radio show" pattern).
    const bg = this.dest.background_url || 'https://app.wccg1045fm.com/assets/restream-bg.png';
    return [
      '-re',
      '-loop', '1',
      '-i', bg,
      '-i', src,
      '-c:v', 'libx264', '-tune', 'stillimage',
      '-r', '24', '-g', '48',
      '-pix_fmt', 'yuv420p',
      '-b:v', vBitrate, '-maxrate', vBitrate, '-bufsize', '4M',
      '-c:a', 'aac', '-b:a', aBitrate, '-ar', '44100',
      '-shortest',
      '-f', 'flv',
      dst,
    ];
  }
}

async function reportEvent(c: Config, body: {
  destinationId: string;
  eventType: 'start' | 'stop' | 'heartbeat' | 'error' | 'reconnect';
  message?: string;
  status?: string;
  bitrateKbps?: number;
  fps?: number;
  bytesOut?: number;
}): Promise<void> {
  try {
    await fetch(`${c.apiUrl}/restream/agent/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.agentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    /* don't crash the worker on API hiccups */
  }
}

async function fetchDestinations(c: Config): Promise<Destination[]> {
  const r = await fetch(`${c.apiUrl}/restream/agent/destinations`, {
    headers: { Authorization: `Bearer ${c.agentToken}` },
  });
  if (!r.ok) throw new Error(`GET /restream/agent/destinations -> ${r.status}`);
  return (await r.json()) as Destination[];
}

export function startRestream(): void {
  const c = loadConfig();
  if (!c) {
    console.log(
      '[restream] disabled — set WCCG_API_URL + RESTREAM_AGENT_TOKEN to enable.',
    );
    return;
  }
  console.log(`[restream] reconciler starting; poll=${c.pollMs}ms ffmpeg=${c.ffmpeg}`);

  const streams = new Map<string, FfmpegStream>();

  void (async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const desired = await fetchDestinations(c);
        const desiredIds = new Set(desired.map((d) => d.id));

        // Stop streams that are no longer enabled.
        for (const [id, s] of streams) {
          if (!desiredIds.has(id)) {
            s.stop();
            streams.delete(id);
            console.log(`[${logTs()}] [restream] stopped ${id}`);
          }
        }

        // Start newly-enabled streams.
        for (const d of desired) {
          if (!streams.has(d.id)) {
            const s = new FfmpegStream(c, d);
            streams.set(d.id, s);
            await s.start();
          }
        }
      } catch (e) {
        console.error(`[${logTs()}] [restream] reconcile error: ${(e as Error).message}`);
      }
      await sleep(c.pollMs);
    }
  })();

  // Graceful shutdown.
  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sig, () => {
      console.log(`[restream] ${sig} — stopping ${streams.size} stream(s)`);
      for (const s of streams.values()) s.stop();
    });
  }
}
