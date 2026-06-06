"use client";

/**
 * Group detail + chat at /groups/[groupId].
 *
 * The hub-rail Groups card links each group row here. This client component
 * reads the id from useParams() (static-export safe — the route ships a
 * `_placeholder` shim and resolves real ids at runtime), then loads the group,
 * its member count, and the caller's membership from Supabase-direct (RLS
 * enforced). It renders:
 *   • a header (name / description / privacy + member count),
 *   • a Join / Leave control (insert/delete the caller's hub_group_members row),
 *   • the live <GroupChat> panel.
 *
 * Visibility:
 *   • Public group  → chat is shown to everyone (read-only for non-members;
 *     the composer is gated inside GroupChat). Members can post.
 *   • Private group → non-members see a join prompt instead of the messages;
 *     RLS would block the read anyway, so we never leak content.
 *
 * All effects keep setState off the synchronous path (pure async fetch + an
 * `active` guard), per react-hooks/set-state-in-effect.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Globe,
  Loader2,
  Lock,
  LogIn,
  UsersRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GroupChat } from "@/components/social/group-chat";

// Hub accent colors, keyed by hub_type (mirrors the hub rail palette).
const HUB_ACCENTS: Record<string, string> = {
  listener: "#74ddc7",
  creator: "#a78bfa",
  vendor: "#fbbf24",
};
const DEFAULT_ACCENT = "#74ddc7";

interface HubGroupRow {
  id: string;
  hub_type: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_by: string | null;
}

export default function GroupDetailClient() {
  const params = useParams<{ groupId: string }>();
  const groupId = typeof params.groupId === "string" ? params.groupId : "";

  // One stable browser client for this component's lifetime.
  const [supabase] = useState(() => createClient());

  // Auth: undefined = resolving, null = signed out, string = my id.
  const [meId, setMeId] = useState<string | null | undefined>(undefined);

  // Group: undefined = loading, null = not found / not visible, row = loaded.
  const [group, setGroup] = useState<HubGroupRow | null | undefined>(undefined);
  const [memberCount, setMemberCount] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [busyJoin, setBusyJoin] = useState(false);

  // ---- Resolve the signed-in user once. ----
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setMeId(data.user?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  // ---- Load the group + member count + my membership. ----
  // Pure async fetch returns everything; an `active` guard drops stale results.
  // Re-runs when auth resolves so membership reflects the signed-in user.
  useEffect(() => {
    if (!groupId || groupId === "_placeholder" || meId === undefined) return;
    let active = true;

    async function loadGroup(): Promise<{
      row: HubGroupRow | null;
      count: number;
      mine: boolean;
    }> {
      const { data: gd } = await supabase
        .from("hub_groups")
        .select("id, hub_type, name, description, is_public, created_by")
        .eq("id", groupId)
        .maybeSingle();
      const row = (gd as HubGroupRow | null) ?? null;
      if (!row) return { row: null, count: 0, mine: false };

      // Member count (head + exact count — no rows transferred).
      const { count } = await supabase
        .from("hub_group_members")
        .select("user_id", { count: "exact", head: true })
        .eq("group_id", groupId);

      // My membership (only meaningful when signed in).
      let mine = false;
      if (meId) {
        const { data: md } = await supabase
          .from("hub_group_members")
          .select("user_id")
          .eq("group_id", groupId)
          .eq("user_id", meId)
          .maybeSingle();
        mine = !!md;
      }

      return { row, count: count ?? 0, mine };
    }

    loadGroup().then(({ row, count, mine }) => {
      if (!active) return;
      setGroup(row);
      setMemberCount(count);
      setIsMember(mine);
    });

    return () => {
      active = false;
    };
  }, [supabase, groupId, meId]);

  // ---- Join / leave (insert/delete my own membership row). ----
  async function toggleJoin() {
    if (!meId || !group || busyJoin) return;
    setBusyJoin(true);
    const wasMember = isMember;

    // Optimistic update.
    setIsMember(!wasMember);
    setMemberCount((c) => Math.max(0, c + (wasMember ? -1 : 1)));

    if (wasMember) {
      const { error } = await supabase
        .from("hub_group_members")
        .delete()
        .eq("group_id", group.id)
        .eq("user_id", meId);
      if (error) {
        // Roll back on failure.
        setIsMember(true);
        setMemberCount((c) => c + 1);
      }
    } else {
      const { error } = await supabase
        .from("hub_group_members")
        .insert({ group_id: group.id, user_id: meId, role: "member" });
      if (error) {
        setIsMember(false);
        setMemberCount((c) => Math.max(0, c - 1));
      }
    }
    setBusyJoin(false);
  }

  const accent =
    group && HUB_ACCENTS[group.hub_type] ? HUB_ACCENTS[group.hub_type] : DEFAULT_ACCENT;

  // Where "back" goes — the hub feed for this group's hub_type.
  const hubHref =
    group?.hub_type === "creator"
      ? "/creators"
      : group?.hub_type === "vendor"
        ? "/vendors/hub"
        : "/listeners";

  // -------------------------------------------------------------------------
  // Loading / not-found states
  // -------------------------------------------------------------------------
  if (group === undefined || meId === undefined) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" style={{ color: DEFAULT_ACCENT }} />
        Loading group…
      </div>
    );
  }

  if (group === null) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <UsersRound className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">Group not found</h1>
        <p className="text-sm text-muted-foreground">
          This group doesn&apos;t exist, or it&apos;s private and you&apos;re not a member.
        </p>
        <Link
          href="/listeners"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: DEFAULT_ACCENT }}
        >
          <ArrowLeft className="h-4 w-4" /> Back to the hub
        </Link>
      </div>
    );
  }

  // Private group the caller isn't in → join prompt, never the messages.
  const lockedOut = !group.is_public && !isMember;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] min-h-[32rem] max-w-3xl flex-col gap-4">
      {/* Header */}
      <div className="shrink-0">
        <Link
          href={hubHref}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to hub
        </Link>
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight">{group.name}</h1>
              {group.is_public ? (
                <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Public group" />
              ) : (
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Private group" />
              )}
            </div>
            {group.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
            ) : (
              <p className="mt-1 text-sm italic text-muted-foreground/70">No description yet.</p>
            )}
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <UsersRound className="h-3.5 w-3.5" style={{ color: accent }} />
              {memberCount.toLocaleString()} {memberCount === 1 ? "member" : "members"}
            </p>
          </div>

          {/* Join / Leave (signed-in only) */}
          {meId ? (
            <button
              type="button"
              onClick={toggleJoin}
              disabled={busyJoin}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
              style={
                isMember
                  ? { backgroundColor: `${accent}1a`, color: accent }
                  : { backgroundColor: accent, color: "#fff" }
              }
            >
              {busyJoin ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isMember ? (
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Joined
                </span>
              ) : (
                "Join"
              )}
            </button>
          ) : (
            <Link
              href="/login"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              <LogIn className="h-4 w-4" /> Sign in
            </Link>
          )}
        </div>
      </div>

      {/* Chat panel — or a join prompt for private groups you're not in. */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card">
        {lockedOut ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: `${accent}1a` }}
            >
              <Lock className="h-6 w-6" style={{ color: accent }} />
            </div>
            <h2 className="text-base font-bold">This group is private</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Join the group to see the conversation and chat with members.
            </p>
            {meId ? (
              <button
                type="button"
                onClick={toggleJoin}
                disabled={busyJoin}
                className="rounded-full px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: accent }}
              >
                {busyJoin ? "Joining…" : "Join group"}
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-full px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: accent }}
              >
                Sign in to join
              </Link>
            )}
          </div>
        ) : (
          <GroupChat
            supabase={supabase}
            groupId={group.id}
            meId={meId}
            isMember={isMember}
            accentColor={accent}
          />
        )}
      </div>
    </div>
  );
}
