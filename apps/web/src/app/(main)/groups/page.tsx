"use client";

/**
 * Public groups index at /groups.
 *
 * This is the discovery surface for the hub group-chat feature. It lists every
 * PUBLIC group (`hub_groups where is_public = true`) as a card — cover / name /
 * description, a live member tally, and an "Open" link to the group's detail +
 * chat page at /groups/[id] (which already exists). Optional hub_type chips
 * filter the grid. A "Start a group" dialog lets a signed-in user create one
 * (insert into hub_groups as created_by = self, auto-join as the first member),
 * then routes to the new group.
 *
 * Static-export safe: a plain default-exported client component with no route
 * params, so it ships as /groups/index.html (no `_placeholder` shim needed —
 * that pattern is only for dynamic [param] routes).
 *
 * Data is Supabase-direct via @/lib/supabase/client and fully RLS-enforced:
 *   • hub_groups SELECT is gated to (is_public OR created_by = me OR staff),
 *   • hub_groups INSERT requires created_by = auth.uid(),
 *   • hub_group_members INSERT requires user_id = auth.uid().
 *
 * Effects keep setState off the synchronous path (pure async fetch + an
 * `active` guard), per react-hooks/set-state-in-effect; the create mutation
 * lives in an event handler.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Globe,
  Loader2,
  Lock,
  LogIn,
  Plus,
  UsersRound,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Hub types match the hub_groups.hub_type CHECK constraint.
type HubType = "listener" | "creator" | "vendor";
const HUB_TYPES: HubType[] = ["listener", "creator", "vendor"];

// Accent palette mirrors the hub rail / group-detail page, keyed by hub_type.
const HUB_ACCENTS: Record<HubType, string> = {
  listener: "#74ddc7",
  creator: "#a78bfa",
  vendor: "#fbbf24",
};
const DEFAULT_ACCENT = "#74ddc7";

// Friendly labels for the filter chips + create-form select.
const HUB_LABELS: Record<HubType, string> = {
  listener: "Listeners",
  creator: "Creators",
  vendor: "Vendors",
};

function accentFor(hubType: string): string {
  return (HUB_ACCENTS as Record<string, string>)[hubType] ?? DEFAULT_ACCENT;
}

interface HubGroupRow {
  id: string;
  hub_type: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
}

interface GroupCardData extends HubGroupRow {
  memberCount: number;
}

export default function GroupsIndexPage() {
  // One stable browser client for this component's lifetime.
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  // Auth: undefined = resolving, null = signed out, string = my id.
  const [meId, setMeId] = useState<string | null | undefined>(undefined);

  // Groups: undefined = loading, [] = loaded-empty, [...] = loaded, null = error.
  const [groups, setGroups] = useState<GroupCardData[] | null | undefined>(undefined);

  // Active hub_type filter chip (null = all).
  const [filter, setFilter] = useState<HubType | null>(null);

  // Create dialog visibility.
  const [showCreate, setShowCreate] = useState(false);

  // Bump to force a refetch (after creating a group).
  const [reloadKey, setReloadKey] = useState(0);

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

  // ---- Load all public groups + their member counts. ----
  // Pure async fetch returns the cards; an `active` guard drops stale results.
  useEffect(() => {
    let active = true;

    async function loadGroups(): Promise<GroupCardData[] | null> {
      const { data: gd, error: gErr } = await supabase
        .from("hub_groups")
        .select("id, hub_type, name, description, cover_image_url, is_public")
        .eq("is_public", true)
        .order("created_at", { ascending: false });
      if (gErr) return null;

      const list = (gd as HubGroupRow[] | null) ?? [];
      const ids = list.map((g) => g.id);

      // One round-trip for all memberships of these groups; tally client-side.
      const countMap: Record<string, number> = {};
      if (ids.length) {
        const { data: md, error: mErr } = await supabase
          .from("hub_group_members")
          .select("group_id")
          .in("group_id", ids);
        if (mErr) return null;
        for (const row of (md as { group_id: string }[] | null) ?? []) {
          countMap[row.group_id] = (countMap[row.group_id] ?? 0) + 1;
        }
      }

      return list.map((g) => ({ ...g, memberCount: countMap[g.id] ?? 0 }));
    }

    loadGroups().then((result) => {
      if (!active) return;
      setGroups(result);
    });

    return () => {
      active = false;
    };
  }, [supabase, reloadKey]);

  // Group counts per hub_type drive the filter chips (only show chips that have
  // at least one group).
  const countsByHub = useMemo(() => {
    const map: Record<string, number> = {};
    for (const g of groups ?? []) map[g.hub_type] = (map[g.hub_type] ?? 0) + 1;
    return map;
  }, [groups]);

  const visibleGroups = useMemo(() => {
    if (!groups) return [];
    return filter ? groups.filter((g) => g.hub_type === filter) : groups;
  }, [groups, filter]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <UsersRound className="h-7 w-7" style={{ color: DEFAULT_ACCENT }} />
            Groups
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find your people. Join a public group to jump into the conversation.
          </p>
        </div>
        {meId ? (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: DEFAULT_ACCENT }}
          >
            <Plus className="h-4 w-4" /> Start a group
          </button>
        ) : (
          <Link
            href="/login"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: DEFAULT_ACCENT }}
          >
            <LogIn className="h-4 w-4" /> Sign in to start a group
          </Link>
        )}
      </div>

      {/* ── Filter chips (only render once we know which hubs have groups) ── */}
      {groups && groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            label="All"
            count={groups.length}
            active={filter === null}
            accent={DEFAULT_ACCENT}
            onClick={() => setFilter(null)}
          />
          {HUB_TYPES.filter((h) => countsByHub[h]).map((h) => (
            <FilterChip
              key={h}
              label={HUB_LABELS[h]}
              count={countsByHub[h]}
              active={filter === h}
              accent={HUB_ACCENTS[h]}
              onClick={() => setFilter(h)}
            />
          ))}
        </div>
      )}

      {/* ── Body: loading / error / empty / grid ──────────────────────── */}
      {groups === undefined ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" style={{ color: DEFAULT_ACCENT }} />
          Loading groups…
        </div>
      ) : groups === null ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Something went wrong loading groups.
          </p>
          <button
            type="button"
            onClick={() => {
              setGroups(undefined);
              setReloadKey((k) => k + 1);
            }}
            className="mt-4 rounded-full px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: DEFAULT_ACCENT }}
          >
            Try again
          </button>
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          meId={meId}
          onCreate={() => setShowCreate(true)}
          title="No groups yet — start one!"
          body="Be the first to create a group and bring people together."
        />
      ) : visibleGroups.length === 0 ? (
        <EmptyState
          meId={meId}
          onCreate={() => setShowCreate(true)}
          title="No groups in this hub yet"
          body="Try another filter, or start the first group here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleGroups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </div>
      )}

      {/* ── Create dialog ─────────────────────────────────────────────── */}
      {showCreate && meId && (
        <CreateGroupDialog
          supabase={supabase}
          meId={meId}
          onClose={() => setShowCreate(false)}
          onCreated={(newId) => {
            setShowCreate(false);
            router.push(`/groups/${newId}`);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter chip
// ---------------------------------------------------------------------------
function FilterChip({
  label,
  count,
  active,
  accent,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors"
      style={
        active
          ? { backgroundColor: accent, borderColor: accent, color: "#fff" }
          : { borderColor: "var(--border)", color: "var(--muted-foreground)" }
      }
    >
      {label}
      <span
        className="rounded-full px-1.5 text-[10px] font-bold"
        style={
          active
            ? { backgroundColor: "rgba(255,255,255,0.25)" }
            : { backgroundColor: `${accent}1a`, color: accent }
        }
      >
        {count}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Group card
// ---------------------------------------------------------------------------
function GroupCard({ group }: { group: GroupCardData }) {
  const accent = accentFor(group.hub_type);
  const hubLabel = (HUB_LABELS as Record<string, string>)[group.hub_type] ?? "Hub";

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-input">
      {/* Cover (image or accent-tinted fallback) */}
      <div
        className="relative h-28 w-full overflow-hidden"
        style={{ backgroundColor: `${accent}1a` }}
      >
        {group.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={group.cover_image_url}
            alt={group.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UsersRound className="h-10 w-10" style={{ color: accent }} />
          </div>
        )}
        <span
          className="absolute left-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
          style={{ backgroundColor: accent }}
        >
          {hubLabel}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-base font-bold text-foreground">{group.name}</h3>
        {group.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {group.description}
          </p>
        ) : (
          <p className="mt-1 text-sm italic text-muted-foreground/70">
            No description yet.
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <UsersRound className="h-3.5 w-3.5" style={{ color: accent }} />
            {group.memberCount.toLocaleString()}{" "}
            {group.memberCount === 1 ? "member" : "members"}
          </span>
          <Link
            href={`/groups/${group.id}`}
            className="inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            Open <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({
  meId,
  onCreate,
  title,
  body,
}: {
  meId: string | null | undefined;
  onCreate: () => void;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <UsersRound className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {meId ? (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: DEFAULT_ACCENT }}
        >
          <Plus className="h-4 w-4" /> Start a group
        </button>
      ) : (
        <Link
          href="/login"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: DEFAULT_ACCENT }}
        >
          <LogIn className="h-4 w-4" /> Sign in to start one
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create-group dialog — name, description, hub_type, public toggle.
// On submit: insert hub_groups (created_by = me), then insert my own
// membership row (role 'admin' — the role CHECK allows only 'member'|'admin';
// the owner is tracked via hub_groups.created_by), then route to the new group.
// ---------------------------------------------------------------------------
function CreateGroupDialog({
  supabase,
  meId,
  onClose,
  onCreated,
}: {
  supabase: ReturnType<typeof createClient>;
  meId: string;
  onClose: () => void;
  onCreated: (newId: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hubType, setHubType] = useState<HubType>("listener");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accent = HUB_ACCENTS[hubType];

  async function handleCreate() {
    const trimmedName = name.trim();
    if (!trimmedName || saving) return;
    setSaving(true);
    setError(null);

    // 1) Insert the group as created_by = me (RLS with_check enforces this).
    const { data, error: insErr } = await supabase
      .from("hub_groups")
      .insert({
        hub_type: hubType,
        name: trimmedName,
        description: description.trim() || null,
        is_public: isPublic,
        created_by: meId,
      })
      .select("id")
      .single();

    if (insErr || !data) {
      setError(insErr?.message ?? "Could not create the group. Please try again.");
      setSaving(false);
      return;
    }

    const newId = (data as { id: string }).id;

    // 2) Auto-join the creator. role 'admin' is the highest the CHECK allows
    //    ('member' | 'admin'); ownership itself is tracked via created_by.
    //    If this insert fails the group still exists, so we proceed to it
    //    rather than blocking — the detail page's Join control is the fallback.
    const { error: memErr } = await supabase
      .from("hub_group_members")
      .insert({ group_id: newId, user_id: meId, role: "admin" });
    if (memErr) {
      // Non-fatal: surface nothing blocking; the group is created and the user
      // can Join from the detail page. Log for diagnostics only.
      console.error("Auto-join after group create failed:", memErr.message);
    }

    setSaving(false);
    onCreated(newId);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Start a group"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <UsersRound className="h-4 w-4" style={{ color: accent }} /> Start a group
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="e.g. Weekend Warriors"
              className="w-full rounded-lg border border-border bg-foreground/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-1"
              style={{ ["--tw-ring-color" as string]: accent }}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Description <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={400}
              placeholder="What's this group about?"
              className="w-full resize-none rounded-lg border border-border bg-foreground/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none"
            />
          </div>

          {/* Hub type */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Hub
            </label>
            <div className="grid grid-cols-3 gap-2">
              {HUB_TYPES.map((h) => {
                const selected = hubType === h;
                const hAccent = HUB_ACCENTS[h];
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHubType(h)}
                    aria-pressed={selected}
                    className="rounded-lg border px-2 py-2 text-xs font-semibold transition-colors"
                    style={
                      selected
                        ? { backgroundColor: hAccent, borderColor: hAccent, color: "#fff" }
                        : { borderColor: "var(--border)", color: "var(--muted-foreground)" }
                    }
                  >
                    {HUB_LABELS[h]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Public / private toggle */}
          <button
            type="button"
            onClick={() => setIsPublic((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-foreground/[0.03] px-3 py-2 text-left"
          >
            <span className="flex items-center gap-2 text-sm text-foreground">
              {isPublic ? (
                <Globe className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
              {isPublic ? "Public group" : "Private group"}
            </span>
            <span
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              style={{ backgroundColor: isPublic ? accent : "rgba(120,120,120,0.4)" }}
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                style={{ transform: isPublic ? "translateX(18px)" : "translateX(2px)" }}
              />
            </span>
          </button>
          <p className="text-[11px] text-muted-foreground/70">
            {isPublic
              ? "Anyone can find this group on the Groups page and read the chat."
              : "Only members can see this group and its conversation."}
          </p>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                </>
              ) : (
                "Create group"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
