"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ScrollText, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Channels mirror the bc_changelog_channel_valid CHECK (migration 096).
const CHANNELS = ["alpha", "beta", "stable"] as const;
type Channel = (typeof CHANNELS)[number];

// Icon names the marketing site (apps/marketing ICON_MAP) can resolve.
const ICONS = [
  "Radio",
  "CalendarClock",
  "Disc3",
  "Trophy",
  "AlertTriangle",
  "ShieldCheck",
  "LineChart",
  "Users",
  "Sparkles",
  "PlayCircle",
] as const;

const FIELD =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-[#74ddc7]/60 focus:ring-2 focus:ring-[#74ddc7]/20";
const LABEL = "block text-xs font-medium tracking-wide text-muted-foreground uppercase";

/** Human-readable reason an insert failed — RLS denial is the common one. */
function writeError(error: { code?: string; message?: string } | null): string {
  if (error?.code === "42501") {
    return "Permission denied — publishing requires a platform-admin (super_admin) account.";
  }
  return error?.message ?? "Something went wrong.";
}

export default function BroadcastCopyPublishPage() {
  const { supabase } = useSupabase();

  // Next sort_order per table, so new rows land on top without manual entry.
  const [nextClOrder, setNextClOrder] = useState(1000);
  const [nextFtOrder, setNextFtOrder] = useState(1000);
  const [busy, setBusy] = useState<"changelog" | "feature" | null>(null);

  // Changelog form
  const [version, setVersion] = useState("");
  const [releasedOn, setReleasedOn] = useState("");
  const [channel, setChannel] = useState<Channel>("beta");
  const [clTitle, setClTitle] = useState("");
  const [changesText, setChangesText] = useState("");

  // Feature form
  const [ftName, setFtName] = useState("");
  const [ftBlurb, setFtBlurb] = useState("");
  const [ftIcon, setFtIcon] = useState<string>("Sparkles");

  useEffect(() => {
    let cancelled = false;
    const nextOrder = async (table: "bc_changelog" | "bc_features") => {
      const { data } = await supabase
        .from(table)
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1);
      const top = data?.[0]?.sort_order;
      return typeof top === "number" ? top + 10 : 10;
    };
    void (async () => {
      const [cl, ft] = await Promise.all([
        nextOrder("bc_changelog"),
        nextOrder("bc_features"),
      ]);
      if (cancelled) return;
      setNextClOrder(cl);
      setNextFtOrder(ft);
      // Default the date to today, client-side (avoids a static-export
      // hydration mismatch from computing the date during prerender).
      setReleasedOn(new Date().toISOString().slice(0, 10));
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const publishRelease = async (event: React.FormEvent) => {
    event.preventDefault();
    const changes = changesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!version.trim() || !releasedOn || changes.length === 0) {
      toast.error("Version, date and at least one change are required.");
      return;
    }
    setBusy("changelog");
    const { error } = await supabase.from("bc_changelog").insert({
      version: version.trim(),
      released_on: releasedOn,
      channel,
      title: clTitle.trim() || null,
      changes,
      sort_order: nextClOrder,
    });
    setBusy(null);
    if (error) {
      toast.error(writeError(error));
      return;
    }
    toast.success(`Published v${version.trim()} — live on both sites now.`);
    setVersion("");
    setClTitle("");
    setChangesText("");
    setNextClOrder((n) => n + 10);
  };

  const addFeature = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ftName.trim() || !ftBlurb.trim()) {
      toast.error("Name and blurb are required.");
      return;
    }
    setBusy("feature");
    const { error } = await supabase.from("bc_features").insert({
      name: ftName.trim(),
      blurb: ftBlurb.trim(),
      icon: ftIcon,
      sort_order: nextFtOrder,
    });
    setBusy(null);
    if (error) {
      toast.error(writeError(error));
      return;
    }
    toast.success(`Added feature “${ftName.trim()}”.`);
    setFtName("");
    setFtBlurb("");
    setNextFtOrder((n) => n + 10);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <Link
        href="/my/admin/broadcast-copy"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Broadcast Copy
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Publish — Broadcast Copy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Write to the shared changelog + feature list. Published rows appear on
          broadcastcopy.ai and wccg1045fm.com/changelog in real time — no deploy.
        </p>
      </div>

      {/* Changelog release */}
      <form onSubmit={publishRelease} className="rounded-2xl border bg-card p-6">
        <div className="mb-5 flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-[#74ddc7]" />
          <h2 className="font-semibold">New changelog release</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="version">Version</label>
            <input id="version" className={FIELD} placeholder="0.12.0-beta" value={version} onChange={(e) => setVersion(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="released_on">Released</label>
            <input id="released_on" type="date" className={FIELD} value={releasedOn} onChange={(e) => setReleasedOn(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="channel">Channel</label>
            <select id="channel" className={FIELD} value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <label className={LABEL} htmlFor="cl_title">Title (optional)</label>
          <input id="cl_title" className={FIELD} placeholder="Self-serve billing" value={clTitle} onChange={(e) => setClTitle(e.target.value)} />
        </div>
        <div className="mt-4 space-y-1.5">
          <label className={LABEL} htmlFor="changes">Changes — one per line</label>
          <textarea id="changes" rows={5} className={FIELD} placeholder={"Stripe checkout for the Broadcast tier\nPer-station usage metering\nInvoice history in the GM cockpit"} value={changesText} onChange={(e) => setChangesText(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy !== null} className="mt-5">
          {busy === "changelog" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Publish release
        </Button>
      </form>

      {/* Feature */}
      <form onSubmit={addFeature} className="rounded-2xl border bg-card p-6">
        <div className="mb-5 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#7401df]" />
          <h2 className="font-semibold">New feature card</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
            <label className={LABEL} htmlFor="ft_name">Name</label>
            <input id="ft_name" className={FIELD} placeholder="Automated logging" value={ftName} onChange={(e) => setFtName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="ft_icon">Icon</label>
            <select id="ft_icon" className={FIELD} value={ftIcon} onChange={(e) => setFtIcon(e.target.value)}>
              {ICONS.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <label className={LABEL} htmlFor="ft_blurb">Blurb</label>
          <textarea id="ft_blurb" rows={3} className={FIELD} placeholder="What this capability does, in one or two sentences." value={ftBlurb} onChange={(e) => setFtBlurb(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy !== null} variant="outline" className="mt-5">
          {busy === "feature" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add feature
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">
        Writes are gated by <code className="rounded bg-muted px-1 py-0.5">is_platform_admin()</code> in
        the database (super_admin), so a non-platform-admin will see a permission
        error even though this console is reachable.
      </p>
    </div>
  );
}
