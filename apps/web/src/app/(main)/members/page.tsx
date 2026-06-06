"use client";

/**
 * People / Members directory at /members.
 *
 * A discoverable, searchable grid of WCCG members so listeners can find one
 * another and start a conversation. Each card shows an avatar (falling back to
 * initials), the member's name + @handle, role badges (WCCG DJ / Creator /
 * Vendor / Listener), a link to their public profile (/u/<username>), and a
 * Message button (which hides itself for the current viewer).
 *
 * Everything is read directly from Supabase via the public anon client and is
 * PII-safe: members come from the `profiles_public` view (never the `profiles`
 * base table, never an email). anon SELECT on the view is granted; RLS is the
 * real backstop.
 *
 * Search is a pure client-side filter over the already-loaded set (name +
 * @handle), so typing never re-hits the network. Per the enforced
 * react-hooks/set-state-in-effect rule, the only effect loads the member list
 * once and applies its result post-await behind an `active` guard — no setState
 * runs synchronously in the effect body. `output: 'export'` safe: this is a
 * pure client component and reads no search params.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Headphones,
  Loader2,
  Mic2,
  Search,
  Store,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MessageButton } from "@/components/messaging/message-button";
import { OnlineDot } from "@/components/social/online-dot";

// ---------------------------------------------------------------------------
// Row shape (strict — no `any`). Columns mirror the `select` below and the
// granted columns of the PII-safe `profiles_public` view.
// ---------------------------------------------------------------------------

/** A row of the PII-safe `profiles_public` view. */
interface PublicMember {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  bio: string | null;
  is_internal: boolean | null;
  has_creator_access: boolean | null;
  has_vendor_access: boolean | null;
  user_type: string | null;
  creator_type: string | null;
}

const MEMBERS_LIMIT = 100;

// ---------------------------------------------------------------------------
// Display helpers (pure).
// ---------------------------------------------------------------------------

/** Up to two uppercase initials from a name, e.g. "DJ Ike" → "DI". */
function initials(name: string): string {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** The best human-facing name for a member, never empty. */
function memberName(m: PublicMember): string {
  return m.display_name?.trim() || m.username || "WCCG member";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MembersPage() {
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  // Load the member list once. All setState happens post-await behind `active`.
  useEffect(() => {
    let active = true;

    async function run() {
      try {
        const supabase = createClient();
        const { data, error: loadError } = await supabase
          .from("profiles_public")
          .select(
            "id, display_name, avatar_url, username, bio, is_internal, has_creator_access, has_vendor_access, user_type, creator_type",
          )
          .order("display_name", { ascending: true })
          .limit(MEMBERS_LIMIT);

        if (!active) return;
        if (loadError) {
          setError(true);
          return;
        }
        setMembers((data ?? []) as PublicMember[]);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, []);

  // Client-side filter over the loaded set: match name or @handle.
  const filtered = useMemo<PublicMember[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = memberName(m).toLowerCase();
      const handle = (m.username ?? "").toLowerCase();
      return name.includes(q) || handle.includes(q);
    });
  }, [members, query]);

  return (
    <div className="space-y-8">
      {/* ── Header (hub-style gradient banner) ───────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#74ddc7] to-[#14b8a6]">
        <div className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
        <div className="absolute -bottom-10 left-10 h-28 w-28 rounded-full bg-black/10 blur-2xl" />
        <div className="relative px-6 py-10 sm:px-10 sm:py-12">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/10 shadow-xl backdrop-blur-sm">
              <Users className="h-7 w-7 text-gray-900" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Members</h1>
              <p className="mt-1 text-gray-900/60">
                Find listeners, DJs, creators, and vendors — and say hello.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or @username…"
          aria-label="Search members"
          className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#74ddc7] focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/30"
        />
      </div>

      {/* ── Body: loading / error / empty / grid ─────────────────────────── */}
      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading members…
        </div>
      ) : error ? (
        <EmptyState
          title="Couldn’t load members"
          body="Something went wrong fetching the directory. Please try again in a moment."
        />
      ) : members.length === 0 ? (
        <EmptyState
          title="No members yet"
          body="Members will show up here as the community grows."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matches"
          body={`No members match “${query.trim()}”. Try a different name or handle.`}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "member" : "members"}
            {query.trim() ? ` matching “${query.trim()}”` : ""}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Member card
// ---------------------------------------------------------------------------

function MemberCard({ member }: { member: PublicMember }) {
  const name = memberName(member);
  const isWccgDj = !!member.is_internal;
  const hasCreator = !!member.has_creator_access;
  const hasVendor = !!member.has_vendor_access;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-[#74ddc7]/40">
      {/* Identity row */}
      <div className="flex items-start gap-3">
        {/* Avatar (fallback to initials) + live presence dot */}
        <div className="relative h-12 w-12 shrink-0">
          <div className="h-12 w-12 overflow-hidden rounded-full border border-border bg-muted">
            {member.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.avatar_url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7401df]/40 to-[#74ddc7]/30 text-sm font-black text-foreground">
                {initials(name)}
              </div>
            )}
          </div>
          <OnlineDot userId={member.id} className="absolute bottom-0 right-0 h-3 w-3" />
        </div>

        {/* Name + handle */}
        <div className="min-w-0 flex-1">
          {member.username ? (
            <Link
              href={`/u/${member.username}`}
              className="block truncate text-base font-bold text-foreground transition-colors hover:text-[#0f9e88] dark:hover:text-[#74ddc7]"
            >
              {name}
            </Link>
          ) : (
            <span className="block truncate text-base font-bold text-foreground">
              {name}
            </span>
          )}
          {member.username && (
            <p className="truncate text-xs text-muted-foreground">
              @{member.username}
            </p>
          )}
        </div>
      </div>

      {/* Role badges */}
      <div className="mt-3">
        <MemberBadges
          isWccgDj={isWccgDj}
          hasCreator={hasCreator}
          hasVendor={hasVendor}
        />
      </div>

      {/* Bio (optional) */}
      {member.bio && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {member.bio}
        </p>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 pt-1">
        {member.username ? (
          <Link
            href={`/u/${member.username}`}
            className="inline-flex items-center rounded-full border border-border bg-transparent px-3 py-1 text-[11px] font-semibold text-foreground transition-colors hover:border-[#74ddc7]/50 hover:text-[#0f9e88] dark:hover:text-[#74ddc7]"
          >
            View profile
          </Link>
        ) : (
          <span className="inline-flex items-center rounded-full border border-dashed border-border px-3 py-1 text-[11px] font-semibold text-muted-foreground">
            No public profile
          </span>
        )}
        <MessageButton
          recipientId={member.id}
          recipientName={name}
          variant="button"
          label="Message"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badges — WCCG DJ (teal), Creator (purple), Vendor (amber), else Listener.
// Mirrors the role styling on the public profile page.
// ---------------------------------------------------------------------------

function MemberBadges({
  isWccgDj,
  hasCreator,
  hasVendor,
}: {
  isWccgDj: boolean;
  hasCreator: boolean;
  hasVendor: boolean;
}) {
  const hasAny = isWccgDj || hasCreator || hasVendor;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isWccgDj && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#74ddc7]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#0f9e88] ring-1 ring-inset ring-[#74ddc7]/40 dark:text-[#74ddc7]">
          <BadgeCheck className="h-3.5 w-3.5" /> WCCG DJ
        </span>
      )}
      {hasCreator && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#7401df]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#7401df] ring-1 ring-inset ring-[#7401df]/40 dark:text-[#b98cff]">
          <Mic2 className="h-3.5 w-3.5" /> Creator
        </span>
      )}
      {hasVendor && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 ring-1 ring-inset ring-amber-500/40 dark:text-amber-300">
          <Store className="h-3.5 w-3.5" /> Vendor
        </span>
      )}
      {!hasAny && (
        <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.06] px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground ring-1 ring-inset ring-border">
          <Headphones className="h-3.5 w-3.5" /> Listener
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared empty / error shell
// ---------------------------------------------------------------------------

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-foreground/[0.05] text-muted-foreground">
        <Users className="h-6 w-6" />
      </div>
      <p className="mt-3 text-sm font-bold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
