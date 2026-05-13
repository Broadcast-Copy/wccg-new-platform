"use client";

/**
 * Admin — restream destinations.
 *
 * Manage YouTube Live / Twitch / Facebook / custom RTMP / Discord
 * simulcast destinations. Toggle, edit, see live status with
 * heartbeat from the worker.
 */

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Tv2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

interface Destination {
  id: string;
  slug: string;
  label: string;
  platform: "youtube" | "twitch" | "facebook" | "discord" | "rtmp_custom";
  rtmpUrl: string | null;
  streamKeyMasked: string | null;
  streamKeySet: boolean;
  discordGuildId: string | null;
  discordChannelId: string | null;
  discordBotTokenSet: boolean;
  videoMode: "static" | "waveform" | "none";
  backgroundUrl: string | null;
  videoBitrateKbps: number | null;
  audioBitrateKbps: number | null;
  enabled: boolean;
  status: "idle" | "starting" | "live" | "reconnecting" | "failed" | "stopped";
  statusMessage: string | null;
  lastActiveAt: string | null;
  lastErrorAt: string | null;
  lastErrorMsg: string | null;
  consecutiveFailures: number;
  sourceUrl: string | null;
  sourceFormat: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLOR: Record<Destination["status"], string> = {
  idle: "bg-muted text-muted-foreground border-border",
  starting: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  live: "bg-[#74ddc7]/15 text-[#74ddc7] border-[#74ddc7]/40",
  reconnecting: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  failed: "bg-red-500/15 text-red-400 border-red-500/40",
  stopped: "bg-muted text-muted-foreground border-border",
};

const PLATFORM_LABEL = {
  youtube: "YouTube Live",
  twitch: "Twitch",
  facebook: "Facebook Live",
  discord: "Discord",
  rtmp_custom: "Custom RTMP",
};

export default function RestreamPage() {
  const [items, setItems] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [revealKey, setRevealKey] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient<Destination[]>("/restream");
      setItems(r);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  const toggle = async (d: Destination) => {
    setSavingId(d.id);
    try {
      await apiClient(`/restream/${d.id}/toggle`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !d.enabled }),
      });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (d: Destination) => {
    if (!window.confirm(`Remove "${d.label}"?`)) return;
    setSavingId(d.id);
    try {
      await apiClient(`/restream/${d.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Operations
          </p>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
            Restream destinations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Simulcast the WCCG live feed to YouTube, Twitch, Facebook, custom RTMP, or Discord.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={load} variant="outline" size="sm" className="rounded-full">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button onClick={() => setShowForm((v) => !v)} size="sm" className="rounded-full">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New destination
          </Button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {showForm && <NewDestinationForm onSaved={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />}

      {loading && items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
          <Tv2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No destinations yet. Add your first.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((d) => {
            const showKey = revealKey[d.id];
            return (
              <article key={d.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold tracking-tight">{d.label}</h2>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${STATUS_COLOR[d.status]}`}>
                        {d.status === "live" && (
                          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#74ddc7] animate-pulse" />
                        )}
                        {d.status}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {PLATFORM_LABEL[d.platform]}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{d.slug}</p>
                    {d.platform !== "discord" && d.rtmpUrl && (
                      <p className="mt-2 font-mono text-xs text-muted-foreground">
                        {d.rtmpUrl}/
                        <button
                          type="button"
                          onClick={() => setRevealKey((m) => ({ ...m, [d.id]: !m[d.id] }))}
                          className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                        >
                          {showKey ? "••• show secret in PATCH only •••" : (d.streamKeyMasked ?? "(no key set)")}
                          {d.streamKeySet && (showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />)}
                        </button>
                      </p>
                    )}
                    {d.platform === "discord" && (
                      <p className="mt-2 font-mono text-xs text-muted-foreground">
                        guild={d.discordGuildId} channel={d.discordChannelId}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span>{d.videoMode}</span>
                      {d.videoBitrateKbps && <span>{d.videoBitrateKbps} kbps video</span>}
                      {d.audioBitrateKbps && <span>{d.audioBitrateKbps} kbps audio</span>}
                      {d.lastActiveAt && <span>active {fmtRelative(d.lastActiveAt)}</span>}
                      {d.consecutiveFailures > 0 && (
                        <span className="text-amber-400">
                          {d.consecutiveFailures} consec. failures
                        </span>
                      )}
                    </div>
                    {d.lastErrorMsg && d.status === "failed" && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
                        <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                        <span className="line-clamp-2">{d.lastErrorMsg}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant={d.enabled ? "outline" : "default"}
                      className="rounded-full"
                      disabled={savingId === d.id}
                      onClick={() => toggle(d)}
                    >
                      {savingId === d.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : d.enabled ? (
                        <span>Disable</span>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Enable
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-red-400"
                      disabled={savingId === d.id}
                      onClick={() => remove(d)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Auto-refresh 15s. Status is reported by the restream worker on the API host.
      </p>
    </div>
  );
}

function NewDestinationForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    slug: "",
    label: "",
    platform: "youtube" as Destination["platform"],
    rtmpUrl: "",
    streamKey: "",
    discordGuildId: "",
    discordChannelId: "",
    discordBotToken: "",
    videoMode: "static" as Destination["videoMode"],
    backgroundUrl: "",
    videoBitrateKbps: "2500",
    audioBitrateKbps: "128",
    sourceUrl: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient("/restream", {
        method: "POST",
        body: JSON.stringify({
          slug: form.slug,
          label: form.label,
          platform: form.platform,
          rtmpUrl: form.rtmpUrl || undefined,
          streamKey: form.streamKey || undefined,
          discordGuildId: form.discordGuildId || undefined,
          discordChannelId: form.discordChannelId || undefined,
          discordBotToken: form.discordBotToken || undefined,
          videoMode: form.videoMode,
          backgroundUrl: form.backgroundUrl || undefined,
          videoBitrateKbps: form.videoBitrateKbps ? Number(form.videoBitrateKbps) : undefined,
          audioBitrateKbps: form.audioBitrateKbps ? Number(form.audioBitrateKbps) : undefined,
          sourceUrl: form.sourceUrl || undefined,
        }),
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const isDiscord = form.platform === "discord";

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h3 className="font-bold">New destination</h3>
      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Slug (URL-safe)" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="youtube-main" required />
        <Field label="Label" value={form.label} onChange={(v) => setForm({ ...form, label: v })} placeholder="YouTube Live — Main" required />
        <Select
          label="Platform"
          value={form.platform}
          onChange={(v) => setForm({ ...form, platform: v as Destination["platform"] })}
          options={[
            { value: "youtube", label: "YouTube Live" },
            { value: "twitch", label: "Twitch" },
            { value: "facebook", label: "Facebook Live" },
            { value: "rtmp_custom", label: "Custom RTMP" },
            { value: "discord", label: "Discord (v2)" },
          ]}
        />
        {!isDiscord && (
          <>
            <Field label="RTMP URL" value={form.rtmpUrl} onChange={(v) => setForm({ ...form, rtmpUrl: v })} placeholder="leave blank to use platform default" />
            <Field label="Stream key (secret)" value={form.streamKey} onChange={(v) => setForm({ ...form, streamKey: v })} type="password" required />
          </>
        )}
        {isDiscord && (
          <>
            <Field label="Guild ID" value={form.discordGuildId} onChange={(v) => setForm({ ...form, discordGuildId: v })} required />
            <Field label="Channel ID" value={form.discordChannelId} onChange={(v) => setForm({ ...form, discordChannelId: v })} required />
            <Field label="Bot token (secret)" value={form.discordBotToken} onChange={(v) => setForm({ ...form, discordBotToken: v })} type="password" required />
          </>
        )}
        {!isDiscord && (
          <Select
            label="Video mode"
            value={form.videoMode}
            onChange={(v) => setForm({ ...form, videoMode: v as Destination["videoMode"] })}
            options={[
              { value: "static", label: "Static background image" },
              { value: "waveform", label: "Live waveform (v2)" },
              { value: "none", label: "Audio only (RTMP-A)" },
            ]}
          />
        )}
        {!isDiscord && form.videoMode === "static" && (
          <Field label="Background image URL" value={form.backgroundUrl} onChange={(v) => setForm({ ...form, backgroundUrl: v })} placeholder="https://… (defaults to WCCG logo)" />
        )}
        {!isDiscord && form.videoMode !== "none" && (
          <Field label="Video bitrate (kbps)" value={form.videoBitrateKbps} onChange={(v) => setForm({ ...form, videoBitrateKbps: v })} type="number" />
        )}
        <Field label="Audio bitrate (kbps)" value={form.audioBitrateKbps} onChange={(v) => setForm({ ...form, audioBitrateKbps: v })} type="number" />
        <Field label="Source URL" value={form.sourceUrl} onChange={(v) => setForm({ ...form, sourceUrl: v })} placeholder="leave blank for default Icecast mount" />
      </div>
      <div className="flex justify-end gap-2 border-t border-border pt-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
          Add destination
        </Button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {label}{required && <span className="text-red-400"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}
