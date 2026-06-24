import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';
import { STATION_ID } from '../../common/supabase/station.js';

interface CreateDto {
  slug: string;
  label: string;
  platform: 'youtube' | 'twitch' | 'facebook' | 'discord' | 'rtmp_custom';
  rtmpUrl?: string;
  streamKey?: string;
  discordGuildId?: string;
  discordChannelId?: string;
  discordBotToken?: string;
  videoMode?: 'static' | 'waveform' | 'none';
  backgroundUrl?: string;
  videoBitrateKbps?: number;
  audioBitrateKbps?: number;
  sourceUrl?: string;
  sourceFormat?: string;
  enabled?: boolean;
}

type UpdateDto = Partial<CreateDto>;

interface EventInsert {
  destinationId: string;
  eventType: 'start' | 'stop' | 'heartbeat' | 'error' | 'reconnect';
  status?: string;
  message?: string;
  bitrateKbps?: number;
  fps?: number;
  bytesOut?: number;
}

const PLATFORM_DEFAULTS: Record<string, Partial<CreateDto>> = {
  youtube:     { rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2', videoMode: 'static', videoBitrateKbps: 2500 },
  twitch:      { rtmpUrl: 'rtmp://live.twitch.tv/app',       videoMode: 'static', videoBitrateKbps: 3500 },
  facebook:    { rtmpUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/', videoMode: 'static', videoBitrateKbps: 2500 },
  rtmp_custom: { videoMode: 'static' },
  discord:     { videoMode: 'none' },
};

/**
 * Mask a stream-key-like secret for safe display. Keeps last 4 chars only.
 */
function maskSecret(s?: string | null): string | null {
  if (!s) return null;
  if (s.length <= 4) return '****';
  return '*'.repeat(Math.max(s.length - 4, 8)) + s.slice(-4);
}

function publicShape(row: any) {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    platform: row.platform,
    rtmpUrl: row.rtmp_url,
    streamKeyMasked: maskSecret(row.stream_key),
    streamKeySet: !!row.stream_key,
    discordGuildId: row.discord_guild_id,
    discordChannelId: row.discord_channel_id,
    discordBotTokenSet: !!row.discord_bot_token,
    videoMode: row.video_mode,
    backgroundUrl: row.background_url,
    videoBitrateKbps: row.video_bitrate_kbps,
    audioBitrateKbps: row.audio_bitrate_kbps,
    enabled: row.enabled,
    status: row.status,
    statusMessage: row.status_message,
    lastActiveAt: row.last_active_at,
    lastErrorAt: row.last_error_at,
    lastErrorMsg: row.last_error_msg,
    consecutiveFailures: row.consecutive_failures,
    sourceUrl: row.source_url,
    sourceFormat: row.source_format,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class RestreamService {
  private readonly logger = new Logger(RestreamService.name);

  constructor(
    private readonly db: SupabaseDbService,
    private readonly config: ConfigService,
  ) {}

  // ─── CRUD ──────────────────────────────────────────────────────────────

  async list() {
    const { data, error } = await this.db.from('restream_destinations')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    return (data ?? []).map(publicShape);
  }

  async create(dto: CreateDto) {
    if (!dto.slug || !dto.label || !dto.platform) {
      throw new BadRequestException('slug, label, platform required');
    }
    if (!/^[a-z0-9-]+$/.test(dto.slug)) {
      throw new BadRequestException('slug must be lowercase letters, digits, hyphens');
    }
    const defaults = PLATFORM_DEFAULTS[dto.platform] ?? {};
    const merged = { ...defaults, ...dto };

    if (merged.platform === 'discord') {
      if (!merged.discordGuildId || !merged.discordChannelId) {
        throw new BadRequestException('Discord requires guild + channel ids');
      }
    } else {
      if (!merged.rtmpUrl) throw new BadRequestException('rtmpUrl required');
    }

    const { data, error } = await this.db.from('restream_destinations')
      .insert({
        station_id: STATION_ID,
        slug: merged.slug,
        label: merged.label,
        platform: merged.platform,
        rtmp_url: merged.rtmpUrl ?? null,
        stream_key: merged.streamKey ?? null,
        discord_guild_id: merged.discordGuildId ?? null,
        discord_channel_id: merged.discordChannelId ?? null,
        discord_bot_token: merged.discordBotToken ?? null,
        video_mode: merged.videoMode ?? 'static',
        background_url: merged.backgroundUrl ?? null,
        video_bitrate_kbps: merged.videoBitrateKbps ?? 2500,
        audio_bitrate_kbps: merged.audioBitrateKbps ?? 128,
        source_url: merged.sourceUrl ?? this.defaultSource(),
        source_format: merged.sourceFormat ?? 'mp3',
        enabled: merged.enabled ?? false,
      })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return publicShape(data);
  }

  async update(id: string, dto: UpdateDto) {
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (dto.slug !== undefined)             patch.slug = dto.slug;
    if (dto.label !== undefined)            patch.label = dto.label;
    if (dto.platform !== undefined)         patch.platform = dto.platform;
    if (dto.rtmpUrl !== undefined)          patch.rtmp_url = dto.rtmpUrl;
    if (dto.streamKey !== undefined)        patch.stream_key = dto.streamKey || null;
    if (dto.discordGuildId !== undefined)   patch.discord_guild_id = dto.discordGuildId;
    if (dto.discordChannelId !== undefined) patch.discord_channel_id = dto.discordChannelId;
    if (dto.discordBotToken !== undefined)  patch.discord_bot_token = dto.discordBotToken || null;
    if (dto.videoMode !== undefined)        patch.video_mode = dto.videoMode;
    if (dto.backgroundUrl !== undefined)    patch.background_url = dto.backgroundUrl;
    if (dto.videoBitrateKbps !== undefined) patch.video_bitrate_kbps = dto.videoBitrateKbps;
    if (dto.audioBitrateKbps !== undefined) patch.audio_bitrate_kbps = dto.audioBitrateKbps;
    if (dto.sourceUrl !== undefined)        patch.source_url = dto.sourceUrl;
    if (dto.sourceFormat !== undefined)     patch.source_format = dto.sourceFormat;
    if (dto.enabled !== undefined)          patch.enabled = dto.enabled;

    const { data, error } = await this.db.from('restream_destinations')
      .update(patch).eq('id', id).select().single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException();
    return publicShape(data);
  }

  async toggle(id: string, enabled: boolean) {
    return this.update(id, { enabled });
  }

  async remove(id: string) {
    const { error } = await this.db.from('restream_destinations').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { ok: true };
  }

  // ─── Worker callbacks (bearer-auth in controller) ──────────────────────

  /** Worker calls after starting a destination, on heartbeat, on error, etc. */
  async recordEvent(dto: EventInsert) {
    if (!dto.destinationId || !dto.eventType) {
      throw new BadRequestException('destinationId + eventType required');
    }
    await this.db.from('restream_events').insert({
      station_id: STATION_ID,
      destination_id: dto.destinationId,
      event_type: dto.eventType,
      status: dto.status ?? null,
      message: dto.message ?? null,
      bitrate_kbps: dto.bitrateKbps ?? null,
      fps: dto.fps ?? null,
      bytes_out: dto.bytesOut ?? null,
    });

    // Update destination status when the event implies it.
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    switch (dto.eventType) {
      case 'start':
        patch.status = 'live';
        patch.status_message = dto.message ?? null;
        patch.last_active_at = new Date().toISOString();
        patch.consecutive_failures = 0;
        break;
      case 'stop':
        patch.status = 'stopped';
        patch.status_message = dto.message ?? null;
        break;
      case 'heartbeat':
        patch.status = 'live';
        patch.last_active_at = new Date().toISOString();
        break;
      case 'reconnect':
        patch.status = 'reconnecting';
        patch.status_message = dto.message ?? null;
        break;
      case 'error': {
        patch.status = 'failed';
        patch.status_message = dto.message ?? null;
        patch.last_error_at = new Date().toISOString();
        patch.last_error_msg = dto.message ?? null;
        const { data: cur } = await this.db.from('restream_destinations')
          .select('consecutive_failures').eq('id', dto.destinationId).maybeSingle();
        patch.consecutive_failures = (cur?.consecutive_failures ?? 0) + 1;
        break;
      }
    }
    await this.db.from('restream_destinations').update(patch).eq('id', dto.destinationId);
    return { ok: true };
  }

  /**
   * GET /restream/agent/destinations — what the worker should run.
   * Returns full secrets (workers need them to start ffmpeg). Auth is
   * a shared RESTREAM_AGENT_TOKEN bearer, same idea as STUDIO_AGENT_TOKEN.
   */
  async agentDestinations() {
    const { data } = await this.db.from('restream_destinations')
      .select('*')
      .eq('enabled', true);
    // Return raw rows — agent NEEDS the stream keys to run ffmpeg.
    return data ?? [];
  }

  // ─── helpers ───────────────────────────────────────────────────────────

  requireAgentToken(authHeader: string | undefined) {
    const configured = this.config.get<string>('RESTREAM_AGENT_TOKEN');
    if (!configured) throw new UnauthorizedException('RESTREAM_AGENT_TOKEN not configured');
    const presented = (authHeader || '').replace(/^Bearer\s+/i, '').trim();
    if (!presented || presented !== configured) {
      throw new UnauthorizedException('invalid restream agent token');
    }
  }

  recentEvents(destinationId: string, limit = 50) {
    return this.db.from('restream_events')
      .select('*')
      .eq('destination_id', destinationId)
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 500))
      .then((r: any) => r.data ?? []);
  }

  private defaultSource(): string {
    return (
      this.config.get<string>('WCCG_RESTREAM_DEFAULT_SOURCE') ??
      'http://stream.wccg1045fm.com:8000/wccg'
    );
  }
}
