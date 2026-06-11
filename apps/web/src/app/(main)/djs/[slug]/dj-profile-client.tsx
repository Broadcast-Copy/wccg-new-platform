"use client";

/**
 * Public DJ profile at /djs/[slug].
 *
 * Two tabs under the DJ header (header + on-air slots stay above the tabs):
 *   • "Mixshows"    — the original PUBLISHED `dj_drops` archive player (unchanged).
 *   • "Collections" — the `dj_collections` / `dj_mixes` content model: podcasts,
 *                     series, mixtapes, albums and collections, rendered as a
 *                     hierarchy (top collection → season/volume → mix items) with
 *                     a cover-art player.
 *
 * Everything is read directly from Supabase (no API server). Published drops and
 * mixes are public-readable and the `dj-drops` / `dj-mixes` buckets are public.
 *
 * Staff/admins and the owning DJ also get front-end controls to create
 * collections, upload a single mix (audio + cover, duration read from the file),
 * bulk-upload many mixes at once, and edit/delete content. RLS is the real
 * backstop — these controls are UI gating only.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Disc3,
  FolderPlus,
  Headphones,
  ImagePlus,
  Layers,
  Loader2,
  Music,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUserRoles } from "@/hooks/use-user-roles";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Dj {
  id: string;
  slug: string;
  display_name: string;
  notes: string | null;
  user_id: string | null;
  host_id: string | null;
}
interface Slot { day_of_week: number; start_time: string; status: string }

/** A `dj_drops` archive item (the original "Mixshows" tab). */
interface Drop {
  id: string;
  fileCode: string;
  weekOf: string;
  format: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
  url: string;
}

type CollectionKind =
  | "podcast"
  | "series"
  | "mixtape"
  | "album"
  | "collection"
  | "season"
  | "volume";

interface Collection {
  id: string;
  dj_id: string | null;
  kind: CollectionKind;
  parent_id: string | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  position: number;
  is_public: boolean;
}

interface MixItem {
  id: string;
  collection_id: string | null;
  title: string;
  description: string | null;
  audio_url: string;
  cover_image_url: string | null;
  duration: number | null;
  genre: string | null;
  item_type: string | null;
  item_number: number | null;
  position: number;
}

/** A child collection (season/volume) under a top-level collection. */
type ChildKind = Extract<CollectionKind, "season" | "volume">;
/** A user-creatable top-level collection. */
type TopKind = Extract<CollectionKind, "podcast" | "series" | "mixtape" | "album" | "collection">;

const TOP_KINDS: { value: TopKind; label: string; childLabel: string; childKind: ChildKind }[] = [
  { value: "podcast", label: "Podcast", childLabel: "Season", childKind: "season" },
  { value: "series", label: "Series", childLabel: "Season", childKind: "season" },
  { value: "mixtape", label: "Mixtape", childLabel: "Volume", childKind: "volume" },
  { value: "album", label: "Album", childLabel: "Volume", childKind: "volume" },
  { value: "collection", label: "Collection", childLabel: "Volume", childKind: "volume" },
];

const ITEM_TYPES = ["episode", "mixtape", "track", "mix"] as const;
type ItemType = (typeof ITEM_TYPES)[number];

/** Default child label/kind for a given top-level collection kind. */
function childMetaFor(kind: CollectionKind): { label: string; kind: ChildKind } {
  const meta = TOP_KINDS.find((k) => k.value === kind);
  if (meta) return { label: meta.childLabel, kind: meta.childKind };
  // podcast/series default to seasons; everything else to volumes
  return kind === "podcast" || kind === "series"
    ? { label: "Season", kind: "season" }
    : { label: "Volume", kind: "volume" };
}

const KIND_LABEL: Record<CollectionKind, string> = {
  podcast: "Podcast",
  series: "Series",
  mixtape: "Mixtape",
  album: "Album",
  collection: "Collection",
  season: "Season",
  volume: "Volume",
};

// ---------------------------------------------------------------------------
// Pure data builders (kept out of effects so we can apply results behind a guard)
// ---------------------------------------------------------------------------

interface ProfileData {
  dj: Dj;
  slots: Slot[];
  drops: Drop[];
}

type Supabase = ReturnType<typeof createClient>;

function publicUrl(supabase: Supabase, bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function loadProfile(supabase: Supabase, slug: string): Promise<ProfileData | null> {
  const { data: d } = await supabase
    .from("djs")
    .select("id, slug, display_name, notes, user_id, host_id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!d) return null;
  const dj = d as Dj;

  const [{ data: s }, { data: drops }] = await Promise.all([
    supabase
      .from("dj_slots")
      .select("day_of_week, start_time, status")
      .eq("dj_id", dj.id)
      .eq("status", "active")
      .order("day_of_week"),
    supabase
      .from("dj_drops")
      .select("id, file_code, week_of, format, size_bytes, uploaded_at, storage_path")
      .eq("dj_id", dj.id)
      .eq("status", "published")
      .order("uploaded_at", { ascending: false })
      .limit(60),
  ]);

  const built: Drop[] = ((drops ?? []) as Array<{
    id: string; file_code: string; week_of: string; format: string | null;
    size_bytes: number | null; uploaded_at: string | null; storage_path: string | null;
  }>)
    .filter((dr) => !!dr.storage_path)
    .map((dr) => ({
      id: dr.id,
      fileCode: dr.file_code,
      weekOf: dr.week_of,
      format: dr.format,
      sizeBytes: dr.size_bytes,
      uploadedAt: dr.uploaded_at,
      url: publicUrl(supabase, "dj-drops", dr.storage_path as string),
    }));

  return { dj, slots: (s ?? []) as Slot[], drops: built };
}

interface CollectionsData {
  collections: Collection[];
  mixes: MixItem[];
}

async function loadCollections(
  supabase: Supabase,
  djId: string,
  canManage: boolean,
): Promise<CollectionsData> {
  // Public users only ever see published/public rows (RLS enforces it too); for
  // managers we drop the published filter so they can see their drafts.
  let colQuery = supabase
    .from("dj_collections")
    .select("id, dj_id, kind, parent_id, title, description, cover_image_url, position, is_public")
    .eq("dj_id", djId);
  if (!canManage) colQuery = colQuery.eq("is_public", true);

  let mixQuery = supabase
    .from("dj_mixes")
    .select("id, collection_id, title, description, audio_url, cover_image_url, duration, genre, item_type, item_number, position")
    .eq("dj_id", djId);
  if (!canManage) mixQuery = mixQuery.eq("is_published", true);

  const [{ data: cols }, { data: mixes }] = await Promise.all([
    colQuery.order("position", { ascending: true }),
    mixQuery.order("item_number", { ascending: true, nullsFirst: false }).order("position", { ascending: true }),
  ]);

  return {
    collections: (cols ?? []) as Collection[],
    mixes: (mixes ?? []) as MixItem[],
  };
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export default function DjProfileClient() {
  // Resolve the slug from the REAL URL. Under `output: export`, /djs/<slug>
  // can be served by the _placeholder shim (e.g. a DJ activated after the
  // last build), so useParams() returns "_placeholder" — but usePathname()
  // reflects the actual browser path, so derive the slug from it (and it
  // updates on client-side DJ→DJ navigation).
  const pathname = usePathname();
  const slug = useMemo(() => {
    const segs = (pathname ?? "").split("/").filter(Boolean);
    const i = segs.indexOf("djs");
    const seg = i >= 0 ? segs[i + 1] : undefined;
    if (!seg || seg === "_placeholder") return "";
    try {
      return decodeURIComponent(seg);
    } catch {
      return seg;
    }
  }, [pathname]);

  const { hasRealRole, isLoading: rolesLoading } = useUserRoles();

  const [dj, setDj] = useState<Dj | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [mixes, setMixes] = useState<MixItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<"mixshows" | "collections">("mixshows");

  // One shared <audio> element drives playback for BOTH tabs. Playing a new
  // track replaces the source so only one thing ever plays at a time.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);

  const isStaff = hasRealRole("admin", "super_admin", "management", "production");
  const isOwner = !!dj && !!currentUserId && dj.user_id === currentUserId;
  const canManage = isStaff || isOwner;

  // ── Load DJ + slots + drops (+ current user id) ───────────────────────────
  // setState is kept out of the synchronous effect body (react-hooks/
  // set-state-in-effect): an async worker applies everything behind the guard.
  useEffect(() => {
    if (!slug || slug === "_placeholder") return;
    let active = true;
    const supabase = createClient();

    async function run() {
      setLoading(true);
      try {
        const [profile, userRes] = await Promise.all([loadProfile(supabase, slug), supabase.auth.getUser()]);
        if (!active) return;
        setCurrentUserId(userRes.data.user?.id ?? null);
        if (!profile) {
          setError("DJ not found.");
          return;
        }
        setDj(profile.dj);
        setSlots(profile.slots);
        setDrops(profile.drops);
        setError(null);
        // Default to Mixshows when there are drops, else Collections.
        setTab(profile.drops.length > 0 ? "mixshows" : "collections");
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    }
    run();

    return () => { active = false; };
  }, [slug]);

  // ── Load collections + mixes (re-runs once we know whether the user can
  //    manage, so managers also see unpublished/private rows). ───────────────
  const djId = dj?.id ?? null;
  const refreshKey = useRef(0);
  const [collLoading, setCollLoading] = useState(false);

  function reloadCollections() {
    refreshKey.current += 1;
    setReloadTick(refreshKey.current);
  }
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!djId || rolesLoading) return;
    let active = true;
    const supabase = createClient();

    async function run(id: string) {
      setCollLoading(true);
      try {
        const data = await loadCollections(supabase, id, canManage);
        if (!active) return;
        setCollections(data.collections);
        setMixes(data.mixes);
      } catch {
        if (active) {
          setCollections([]);
          setMixes([]);
        }
      } finally {
        if (active) setCollLoading(false);
      }
    }
    run(djId);

    return () => { active = false; };
  }, [djId, canManage, rolesLoading, reloadTick]);

  const sortedSlots = useMemo(
    () => [...slots].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)),
    [slots],
  );

  // ── Shared playback ───────────────────────────────────────────────────────
  function playTrack(id: string, url: string) {
    const el = audioRef.current;
    if (!el) return;
    if (nowPlaying === id && !el.paused) {
      el.pause();
      return;
    }
    if (el.src !== url) el.src = url;
    void el.play().then(() => setNowPlaying(id)).catch(() => setNowPlaying(null));
  }

  if (!slug || slug === "_placeholder") return <div className="py-12 text-sm text-muted-foreground">No DJ.</div>;
  if (loading) {
    return <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }
  if (error || !dj) {
    return (
      <div className="space-y-3 py-12">
        <p className="text-sm text-red-300">{error ?? "Not found"}</p>
        <Link href="/djs" className="text-sm text-[#74ddc7] hover:underline">← All DJs</Link>
      </div>
    );
  }

  const hasDrops = drops.length > 0;

  return (
    <div className="space-y-8 py-8">
      {/* Shared audio element for both tabs */}
      <audio
        ref={audioRef}
        preload="none"
        onEnded={() => setNowPlaying(null)}
        onPause={() => setNowPlaying(null)}
        className="hidden"
      />

      <Link href="/djs" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> All DJs
      </Link>

      <header>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#74ddc7]">WCCG DJ</p>
        <h1 className="text-4xl font-black tracking-tight text-foreground md:text-5xl">{dj.display_name}</h1>
        {dj.notes && <p className="mt-1 text-base text-muted-foreground">{dj.notes}</p>}
      </header>

      {sortedSlots.length > 0 && (
        <section>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">On air</h2>
          <div className="flex flex-wrap gap-2">
            {sortedSlots.map((s, i) => (
              <span key={`${s.day_of_week}-${s.start_time}-${i}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
                <Calendar className="h-3 w-3 text-[#74ddc7]" />
                <span className="font-bold">{DAYS[s.day_of_week]}</span>
                <span className="text-muted-foreground">{fmt12h(s.start_time)}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex w-fit items-center gap-1 rounded-full border border-border bg-card p-1">
        <TabButton active={tab === "mixshows"} onClick={() => setTab("mixshows")} icon={<Headphones className="h-3.5 w-3.5" />}>
          Mixshows{hasDrops ? ` · ${drops.length}` : ""}
        </TabButton>
        <TabButton active={tab === "collections"} onClick={() => setTab("collections")} icon={<Layers className="h-3.5 w-3.5" />}>
          Collections{collections.length > 0 ? ` · ${collections.length}` : ""}
        </TabButton>
      </div>

      {tab === "mixshows" ? (
        <MixshowsTab
          drops={drops}
          airDay={(slots.find((s) => s.status === "active") ?? slots[0])?.day_of_week ?? null}
          nowPlaying={nowPlaying}
          onToggle={playTrack}
        />
      ) : (
        <CollectionsTab
          dj={dj}
          collections={collections}
          mixes={mixes}
          loading={collLoading}
          canManage={canManage}
          currentUserId={currentUserId}
          nowPlaying={nowPlaying}
          onToggle={playTrack}
          onChanged={reloadCollections}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
        active ? "bg-[#74ddc7] text-[#0a0a0f]" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Mixshows tab — original dj_drops archive (cover-less, uses shared audio)
// ---------------------------------------------------------------------------

function MixshowsTab({
  drops,
  airDay,
  nowPlaying,
  onToggle,
}: {
  drops: Drop[];
  /** The DJ's broadcast day (dj_slots.day_of_week) — labels each mix with the
   * EXACT date it aired, never the week's Monday. Null = no slot known. */
  airDay: number | null;
  nowPlaying: string | null;
  onToggle: (id: string, url: string) => void;
}) {
  const airedLabel = (weekOf: string): string => {
    const d = new Date(weekOf + "T00:00:00");
    if (Number.isNaN(d.getTime())) return weekOf;
    if (airDay !== null) d.setDate(d.getDate() + (airDay === 0 ? 6 : airDay - 1));
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };
  return (
    <section>
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Mixshow archive</h2>
        <p className="text-xs text-muted-foreground">{drops.length} {drops.length === 1 ? "mix" : "mixes"}</p>
      </header>

      {drops.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
          <Headphones className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No published mixshows yet. Check back soon.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {drops.map((mix) => {
            const playing = nowPlaying === mix.id;
            return (
              <article key={mix.id} className={`rounded-2xl border bg-card p-4 transition-colors ${playing ? "border-[#74ddc7]/60 bg-[#74ddc7]/5" : "border-border"}`}>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onToggle(mix.id, mix.url)}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${playing ? "bg-[#74ddc7] text-[#0a0a0f]" : "bg-foreground/10 text-foreground hover:bg-[#74ddc7]/20"}`}
                    aria-label={playing ? "Pause" : "Play"}
                  >
                    {playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-bold text-foreground">{mix.fileCode}</p>
                    <p className="text-xs text-muted-foreground">
                      Aired {airedLabel(mix.weekOf)}
                      {mix.format && <> · {mix.format.toUpperCase()}</>}
                      {mix.sizeBytes && <> · {fmtBytes(mix.sizeBytes)}</>}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Collections tab — dj_collections / dj_mixes taxonomy + cover-art player
// ---------------------------------------------------------------------------

type DialogState =
  | { type: "new-collection"; parent: Collection | null }
  | { type: "upload"; collectionId: string | null }
  | { type: "bulk"; collectionId: string | null }
  | { type: "edit-collection"; collection: Collection }
  | { type: "edit-mix"; mix: MixItem }
  | null;

function CollectionsTab({
  dj,
  collections,
  mixes,
  loading,
  canManage,
  currentUserId,
  nowPlaying,
  onToggle,
  onChanged,
}: {
  dj: Dj;
  collections: Collection[];
  mixes: MixItem[];
  loading: boolean;
  canManage: boolean;
  currentUserId: string | null;
  nowPlaying: string | null;
  onToggle: (id: string, url: string) => void;
  onChanged: () => void;
}) {
  const [dialog, setDialog] = useState<DialogState>(null);

  // Index the hierarchy.
  const topCollections = useMemo(
    () => collections.filter((c) => !c.parent_id).sort((a, b) => a.position - b.position),
    [collections],
  );
  const childrenByParent = useMemo(() => {
    const map = new Map<string, Collection[]>();
    for (const c of collections) {
      if (!c.parent_id) continue;
      const arr = map.get(c.parent_id) ?? [];
      arr.push(c);
      map.set(c.parent_id, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.position - b.position);
    return map;
  }, [collections]);
  const mixesByCollection = useMemo(() => {
    const map = new Map<string, MixItem[]>();
    for (const m of mixes) {
      const key = m.collection_id ?? "__none__";
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return map;
  }, [mixes]);
  const looseMixes = mixesByCollection.get("__none__") ?? [];

  const isEmpty = topCollections.length === 0 && looseMixes.length === 0;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Collections</h2>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => setDialog({ type: "new-collection", parent: null })} icon={<FolderPlus className="h-3.5 w-3.5" />}>
              New collection
            </ActionButton>
            <ActionButton onClick={() => setDialog({ type: "upload", collectionId: null })} icon={<Upload className="h-3.5 w-3.5" />}>
              Upload mix
            </ActionButton>
            <ActionButton onClick={() => setDialog({ type: "bulk", collectionId: null })} icon={<Layers className="h-3.5 w-3.5" />}>
              Bulk add
            </ActionButton>
          </div>
        )}
      </header>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading collections…
        </div>
      ) : isEmpty ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
          <Disc3 className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {canManage ? "No collections yet. Create one or upload a mix to get started." : "No collections yet. Check back soon."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {topCollections.map((col) => (
            <CollectionCard
              key={col.id}
              collection={col}
              childCollections={childrenByParent.get(col.id) ?? []}
              mixesByCollection={mixesByCollection}
              canManage={canManage}
              nowPlaying={nowPlaying}
              onToggle={onToggle}
              onAddChild={() => setDialog({ type: "new-collection", parent: col })}
              onUploadHere={(cid) => setDialog({ type: "upload", collectionId: cid })}
              onBulkHere={(cid) => setDialog({ type: "bulk", collectionId: cid })}
              onEditCollection={(c) => setDialog({ type: "edit-collection", collection: c })}
              onEditMix={(m) => setDialog({ type: "edit-mix", mix: m })}
              onChanged={onChanged}
            />
          ))}

          {/* Mixes not attached to any collection */}
          {looseMixes.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <Music className="h-4 w-4 text-[#74ddc7]" /> Singles
              </h3>
              <div className="space-y-2">
                {looseMixes.map((m) => (
                  <MixRow
                    key={m.id}
                    mix={m}
                    canManage={canManage}
                    playing={nowPlaying === m.id}
                    onToggle={onToggle}
                    onEdit={() => setDialog({ type: "edit-mix", mix: m })}
                    onChanged={onChanged}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {dialog?.type === "new-collection" && (
        <CollectionDialog
          dj={dj}
          parent={dialog.parent}
          currentUserId={currentUserId}
          existingCount={dialog.parent ? (childrenByParent.get(dialog.parent.id)?.length ?? 0) : topCollections.length}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); onChanged(); }}
        />
      )}
      {dialog?.type === "edit-collection" && (
        <CollectionDialog
          dj={dj}
          parent={null}
          editing={dialog.collection}
          currentUserId={currentUserId}
          existingCount={0}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); onChanged(); }}
        />
      )}
      {dialog?.type === "upload" && (
        <UploadDialog
          dj={dj}
          collections={collections}
          defaultCollectionId={dialog.collectionId}
          currentUserId={currentUserId}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); onChanged(); }}
        />
      )}
      {dialog?.type === "bulk" && (
        <BulkUploadDialog
          dj={dj}
          collections={collections}
          defaultCollectionId={dialog.collectionId}
          currentUserId={currentUserId}
          existingInCollection={(cid) => (mixesByCollection.get(cid ?? "__none__")?.length ?? 0)}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); onChanged(); }}
        />
      )}
      {dialog?.type === "edit-mix" && (
        <EditMixDialog
          mix={dialog.mix}
          currentUserId={currentUserId}
          ownerProfileId={dj.user_id}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); onChanged(); }}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Collection card (top-level) → seasons/volumes → mix items
// ---------------------------------------------------------------------------

function CollectionCard({
  collection,
  childCollections,
  mixesByCollection,
  canManage,
  nowPlaying,
  onToggle,
  onAddChild,
  onUploadHere,
  onBulkHere,
  onEditCollection,
  onEditMix,
  onChanged,
}: {
  collection: Collection;
  childCollections: Collection[];
  mixesByCollection: Map<string, MixItem[]>;
  canManage: boolean;
  nowPlaying: string | null;
  onToggle: (id: string, url: string) => void;
  onAddChild: () => void;
  onUploadHere: (collectionId: string) => void;
  onBulkHere: (collectionId: string) => void;
  onEditCollection: (c: Collection) => void;
  onEditMix: (m: MixItem) => void;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(true);
  const directMixes = mixesByCollection.get(collection.id) ?? [];
  const childMeta = childMetaFor(collection.kind);
  const totalItems =
    directMixes.length + childCollections.reduce((n, c) => n + (mixesByCollection.get(c.id)?.length ?? 0), 0);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-start gap-4 p-4">
        <button onClick={() => setOpen((v) => !v)} className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground" aria-label={open ? "Collapse" : "Expand"}>
          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>

        <CoverArt url={collection.cover_image_url} size="lg" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#7401df]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#b98cff]">
              {KIND_LABEL[collection.kind]}
            </span>
            {!collection.is_public && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">Draft</span>
            )}
          </div>
          <h3 className="mt-1 truncate text-lg font-black tracking-tight text-foreground">{collection.title}</h3>
          {collection.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{collection.description}</p>}
          <p className="mt-1 text-xs text-muted-foreground/70">
            {childCollections.length > 0 && <>{childCollections.length} {childCollections.length === 1 ? childMeta.label.toLowerCase() : `${childMeta.label.toLowerCase()}s`} · </>}
            {totalItems} {totalItems === 1 ? "item" : "items"}
          </p>
        </div>

        {canManage && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            <IconButton title={`Add ${childMeta.label.toLowerCase()}`} onClick={onAddChild}><Plus className="h-4 w-4" /></IconButton>
            <IconButton title="Upload mix here" onClick={() => onUploadHere(collection.id)}><Upload className="h-4 w-4" /></IconButton>
            <IconButton title="Bulk add here" onClick={() => onBulkHere(collection.id)}><Layers className="h-4 w-4" /></IconButton>
            <IconButton title="Edit" onClick={() => onEditCollection(collection)}><Pencil className="h-4 w-4" /></IconButton>
            <DeleteCollectionButton collection={collection} childCount={childCollections.length} mixCount={directMixes.length} onDeleted={onChanged} />
          </div>
        )}
      </div>

      {open && (
        <div className="space-y-4 border-t border-border bg-background/30 p-4">
          {/* direct items */}
          {directMixes.length > 0 && (
            <div className="space-y-2">
              {directMixes.map((m) => (
                <MixRow
                  key={m.id}
                  mix={m}
                  canManage={canManage}
                  playing={nowPlaying === m.id}
                  onToggle={onToggle}
                  onEdit={() => onEditMix(m)}
                  onChanged={onChanged}
                />
              ))}
            </div>
          )}

          {/* child collections (seasons / volumes) */}
          {childCollections.map((child) => {
            const childMixes = mixesByCollection.get(child.id) ?? [];
            return (
              <ChildCollection
                key={child.id}
                collection={child}
                mixes={childMixes}
                canManage={canManage}
                nowPlaying={nowPlaying}
                onToggle={onToggle}
                onUploadHere={() => onUploadHere(child.id)}
                onBulkHere={() => onBulkHere(child.id)}
                onEditCollection={() => onEditCollection(child)}
                onEditMix={onEditMix}
                onChanged={onChanged}
              />
            );
          })}

          {directMixes.length === 0 && childCollections.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {canManage ? `Empty. Add a ${childMeta.label.toLowerCase()} or upload a mix.` : "Nothing here yet."}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function ChildCollection({
  collection,
  mixes,
  canManage,
  nowPlaying,
  onToggle,
  onUploadHere,
  onBulkHere,
  onEditCollection,
  onEditMix,
  onChanged,
}: {
  collection: Collection;
  mixes: MixItem[];
  canManage: boolean;
  nowPlaying: string | null;
  onToggle: (id: string, url: string) => void;
  onUploadHere: () => void;
  onBulkHere: () => void;
  onEditCollection: () => void;
  onEditMix: (m: MixItem) => void;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-border bg-card/60">
      <div className="flex items-center gap-3 p-3">
        <button onClick={() => setOpen((v) => !v)} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label={open ? "Collapse" : "Expand"}>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <CoverArt url={collection.cover_image_url} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            <span className="truncate">{collection.title}</span>
            <span className="rounded-full bg-[#74ddc7]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#74ddc7]">{KIND_LABEL[collection.kind]}</span>
          </p>
          <p className="text-[11px] text-muted-foreground/70">{mixes.length} {mixes.length === 1 ? "item" : "items"}</p>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-1">
            <IconButton title="Upload mix here" onClick={onUploadHere}><Upload className="h-4 w-4" /></IconButton>
            <IconButton title="Bulk add here" onClick={onBulkHere}><Layers className="h-4 w-4" /></IconButton>
            <IconButton title="Edit" onClick={onEditCollection}><Pencil className="h-4 w-4" /></IconButton>
            <DeleteCollectionButton collection={collection} childCount={0} mixCount={mixes.length} onDeleted={onChanged} />
          </div>
        )}
      </div>
      {open && mixes.length > 0 && (
        <div className="space-y-2 border-t border-border p-3">
          {mixes.map((m) => (
            <MixRow
              key={m.id}
              mix={m}
              canManage={canManage}
              playing={nowPlaying === m.id}
              onToggle={onToggle}
              onEdit={() => onEditMix(m)}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mix row — cover-art player line
// ---------------------------------------------------------------------------

function MixRow({
  mix,
  canManage,
  playing,
  onToggle,
  onEdit,
  onChanged,
}: {
  mix: MixItem;
  canManage: boolean;
  playing: boolean;
  onToggle: (id: string, url: string) => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const label = [mix.item_type ? cap(mix.item_type) : null, mix.item_number != null ? `#${mix.item_number}` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${playing ? "border-[#74ddc7]/60 bg-[#74ddc7]/5" : "border-border bg-card"}`}>
      {/* cover with play overlay */}
      <button
        onClick={() => onToggle(mix.id, mix.audio_url)}
        className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-lg"
        aria-label={playing ? "Pause" : "Play"}
      >
        <CoverArt url={mix.cover_image_url} size="row" />
        <span className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${playing ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          {playing ? <Pause className="h-5 w-5 text-white" fill="currentColor" /> : <Play className="h-5 w-5 text-white" fill="currentColor" />}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-bold ${playing ? "text-[#74ddc7]" : "text-foreground"}`}>{mix.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {label}
          {label && (mix.genre || mix.duration) && " · "}
          {mix.genre && <>{mix.genre}</>}
          {mix.genre && mix.duration ? " · " : ""}
          {mix.duration ? fmtDuration(mix.duration) : ""}
        </p>
      </div>

      {canManage && (
        <div className="flex shrink-0 items-center gap-1">
          <IconButton title="Edit" onClick={onEdit}><Pencil className="h-4 w-4" /></IconButton>
          <DeleteMixButton mix={mix} onDeleted={onChanged} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cover art (plain <img>, music-note fallback)
// ---------------------------------------------------------------------------

function CoverArt({ url, size }: { url: string | null; size: "lg" | "sm" | "row" }) {
  const dims =
    size === "lg" ? "h-20 w-20 rounded-xl" : size === "sm" ? "h-12 w-12 rounded-lg" : "h-12 w-12 rounded-lg";
  const icon = size === "lg" ? "h-8 w-8" : "h-5 w-5";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`${dims} shrink-0 object-cover`} />;
  }
  return (
    <div className={`${dims} flex shrink-0 items-center justify-center bg-gradient-to-br from-[#7401df]/30 to-[#74ddc7]/15`}>
      <Music className={`${icon} text-[#74ddc7]`} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small buttons
// ---------------------------------------------------------------------------

function ActionButton({ onClick, icon, children }: { onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:border-[#74ddc7]/50 hover:text-[#74ddc7]"
    >
      {icon}
      {children}
    </button>
  );
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
    >
      {children}
    </button>
  );
}

function DeleteCollectionButton({ collection, childCount, mixCount, onDeleted }: { collection: Collection; childCount: number; mixCount: number; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  async function handle() {
    const extra = childCount + mixCount > 0 ? ` Its ${childCount} sub-collection(s) and ${mixCount} direct item(s) will be detached.` : "";
    if (!window.confirm(`Delete "${collection.title}"?${extra}`)) return;
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.from("dj_collections").delete().eq("id", collection.id);
      onDeleted();
    } finally {
      setBusy(false);
    }
  }
  return (
    <button onClick={handle} disabled={busy} title="Delete" aria-label="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}

function DeleteMixButton({ mix, onDeleted }: { mix: MixItem; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  async function handle() {
    if (!window.confirm(`Delete "${mix.title}"?`)) return;
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.from("dj_mixes").delete().eq("id", mix.id);
      onDeleted();
    } finally {
      setBusy(false);
    }
  }
  return (
    <button onClick={handle} disabled={busy} title="Delete" aria-label="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Modal shell
// ---------------------------------------------------------------------------

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06]">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const FIELD = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50";
const FIELD_LABEL = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground";
const PRIMARY_BTN = "inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7401df] to-[#74ddc7] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50";

// ---------------------------------------------------------------------------
// Create / edit collection dialog
// ---------------------------------------------------------------------------

function CollectionDialog({
  dj,
  parent,
  editing,
  currentUserId,
  existingCount,
  onClose,
  onSaved,
}: {
  dj: Dj;
  parent: Collection | null;
  editing?: Collection;
  currentUserId: string | null;
  existingCount: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const childMeta = parent ? childMetaFor(parent.kind) : null;
  const [kind, setKind] = useState<CollectionKind>(editing?.kind ?? (childMeta ? childMeta.kind : "podcast"));
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isChild = !!parent;
  const heading = editing
    ? "Edit collection"
    : isChild
      ? `Add ${childMeta?.label.toLowerCase() ?? "item"} to "${parent.title}"`
      : "New collection";

  async function save() {
    if (!title.trim()) { setErr("Title is required."); return; }
    setBusy(true);
    setErr(null);
    try {
      const supabase = createClient();
      let coverUrl = editing?.cover_image_url ?? null;
      if (coverFile && currentUserId) {
        coverUrl = await uploadToBucket(supabase, currentUserId, coverFile);
      }

      if (editing) {
        const { error } = await supabase
          .from("dj_collections")
          .update({ title: title.trim(), description: description.trim() || null, kind, cover_image_url: coverUrl, updated_at: new Date().toISOString() })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dj_collections").insert({
          dj_id: dj.id,
          host_id: dj.host_id,
          owner_profile_id: currentUserId,
          kind,
          parent_id: parent?.id ?? null,
          title: title.trim(),
          description: description.trim() || null,
          cover_image_url: coverUrl,
          position: existingCount,
          is_public: true,
        });
        if (error) throw error;
      }
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={heading} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={FIELD_LABEL}>{isChild ? "Type" : "Kind"}</label>
          {isChild ? (
            <select className={FIELD} value={kind} onChange={(e) => setKind(e.target.value as CollectionKind)}>
              <option value="season">Season</option>
              <option value="volume">Volume</option>
            </select>
          ) : (
            <select className={FIELD} value={kind} onChange={(e) => setKind(e.target.value as CollectionKind)}>
              {TOP_KINDS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className={FIELD_LABEL}>Title</label>
          <input className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Late Night Sessions" autoFocus />
        </div>
        <div>
          <label className={FIELD_LABEL}>Description</label>
          <textarea className={`${FIELD} min-h-[72px] resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
        </div>
        <CoverPicker file={coverFile} existingUrl={editing?.cover_image_url ?? null} onPick={setCoverFile} />
        {err && <p className="text-xs text-red-400">{err}</p>}
        <button className={PRIMARY_BTN} onClick={save} disabled={busy}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : editing ? <><Pencil className="h-4 w-4" /> Save changes</> : <><FolderPlus className="h-4 w-4" /> Create</>}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Upload single mix dialog
// ---------------------------------------------------------------------------

function UploadDialog({
  dj,
  collections,
  defaultCollectionId,
  currentUserId,
  onClose,
  onSaved,
}: {
  dj: Dj;
  collections: Collection[];
  defaultCollectionId: string | null;
  currentUserId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [itemType, setItemType] = useState<ItemType>("mix");
  const [itemNumber, setItemNumber] = useState("");
  const [genre, setGenre] = useState("");
  const [collectionId, setCollectionId] = useState<string>(defaultCollectionId ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!audioFile) { setErr("Pick an audio file."); return; }
    if (!title.trim()) { setErr("Title is required."); return; }
    if (!currentUserId) { setErr("You must be signed in."); return; }
    setBusy(true);
    setErr(null);
    try {
      const supabase = createClient();
      const hostId = await resolveHostId(supabase, dj.host_id, currentUserId);
      if (!hostId) throw new Error("No host record is configured, so the mix can't be saved.");
      const duration = await readAudioDuration(audioFile);
      const audioUrl = await uploadToBucket(supabase, currentUserId, audioFile);
      const coverUrl = coverFile ? await uploadToBucket(supabase, currentUserId, coverFile) : null;

      const { error } = await supabase.from("dj_mixes").insert({
        id: `mix_${randomId()}`,
        dj_id: dj.id,
        host_id: hostId,
        uploader_id: currentUserId,
        collection_id: collectionId || null,
        title: title.trim(),
        audio_url: audioUrl,
        cover_image_url: coverUrl,
        duration,
        genre: genre.trim() || null,
        item_type: itemType,
        item_number: itemNumber ? Number(itemNumber) : null,
        position: 0,
        is_published: true,
      });
      if (error) throw error;
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Upload mix" onClose={onClose}>
      <div className="space-y-4">
        <AudioPicker file={audioFile} onPick={(f) => { setAudioFile(f); if (f && !title) setTitle(stripExt(f.name)); }} />
        <div>
          <label className={FIELD_LABEL}>Title</label>
          <input className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mix title" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={FIELD_LABEL}>Item type</label>
            <select className={FIELD} value={itemType} onChange={(e) => setItemType(e.target.value as ItemType)}>
              {ITEM_TYPES.map((t) => <option key={t} value={t}>{cap(t)}</option>)}
            </select>
          </div>
          <div>
            <label className={FIELD_LABEL}>Item # (optional)</label>
            <input className={FIELD} type="number" min={0} value={itemNumber} onChange={(e) => setItemNumber(e.target.value)} placeholder="e.g. 1" />
          </div>
        </div>
        <div>
          <label className={FIELD_LABEL}>Genre (optional)</label>
          <input className={FIELD} value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. Hip-Hop" />
        </div>
        <div>
          <label className={FIELD_LABEL}>Collection</label>
          <CollectionSelect collections={collections} value={collectionId} onChange={setCollectionId} />
        </div>
        <CoverPicker file={coverFile} existingUrl={null} onPick={setCoverFile} />
        {err && <p className="text-xs text-red-400">{err}</p>}
        <button className={PRIMARY_BTN} onClick={save} disabled={busy}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4" /> Upload mix</>}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Bulk upload dialog
// ---------------------------------------------------------------------------

interface BulkRow { file: File; status: "pending" | "uploading" | "done" | "error"; message?: string }

function BulkUploadDialog({
  dj,
  collections,
  defaultCollectionId,
  currentUserId,
  existingInCollection,
  onClose,
  onSaved,
}: {
  dj: Dj;
  collections: Collection[];
  defaultCollectionId: string | null;
  currentUserId: string | null;
  existingInCollection: (cid: string | null) => number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [collectionId, setCollectionId] = useState<string>(defaultCollectionId ?? "");
  const [itemType, setItemType] = useState<ItemType>("mix");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function addFiles(files: File[]) {
    const audio = files.filter((f) => f.type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|webm|flac|aac)$/i.test(f.name));
    setRows((prev) => [...prev, ...audio.map((file) => ({ file, status: "pending" as const }))]);
  }

  async function run() {
    if (rows.length === 0) { setErr("Add some audio files first."); return; }
    if (!currentUserId) { setErr("You must be signed in."); return; }
    setRunning(true);
    setErr(null);
    const supabase = createClient();
    const hostId = await resolveHostId(supabase, dj.host_id, currentUserId);
    if (!hostId) {
      setErr("No host record is configured, so mixes can't be saved.");
      setRunning(false);
      return;
    }
    const targetCollection = collectionId || null;
    const baseNumber = existingInCollection(targetCollection);

    for (let i = 0; i < rows.length; i++) {
      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "uploading" } : r)));
      const file = rows[i].file;
      try {
        const duration = await readAudioDuration(file);
        const audioUrl = await uploadToBucket(supabase, currentUserId, file);
        const { error } = await supabase.from("dj_mixes").insert({
          id: `mix_${randomId()}`,
          dj_id: dj.id,
          host_id: hostId,
          uploader_id: currentUserId,
          collection_id: targetCollection,
          title: stripExt(file.name),
          audio_url: audioUrl,
          cover_image_url: null,
          duration,
          item_type: itemType,
          item_number: baseNumber + i + 1,
          position: baseNumber + i,
          is_published: true,
        });
        if (error) throw error;
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "done" } : r)));
      } catch (e) {
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "error", message: (e as Error).message } : r)));
      }
    }
    setRunning(false);
    setDone(true);
  }

  const allDone = done && rows.every((r) => r.status === "done" || r.status === "error");

  return (
    <Modal title="Bulk add mixes" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={FIELD_LABEL}>Collection</label>
            <CollectionSelect collections={collections} value={collectionId} onChange={setCollectionId} disabled={running} />
          </div>
          <div>
            <label className={FIELD_LABEL}>Item type</label>
            <select className={FIELD} value={itemType} onChange={(e) => setItemType(e.target.value as ItemType)} disabled={running}>
              {ITEM_TYPES.map((t) => <option key={t} value={t}>{cap(t)}</option>)}
            </select>
          </div>
        </div>

        <button
          type="button"
          disabled={running}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "audio/*,.mp3,.wav,.m4a,.ogg,.webm,.flac,.aac";
            input.multiple = true;
            input.onchange = (e) => addFiles(Array.from((e.target as HTMLInputElement).files ?? []));
            input.click();
          }}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/40 px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-[#74ddc7]/50 hover:text-foreground disabled:opacity-50"
        >
          <Upload className="h-6 w-6" />
          Click to pick multiple audio files
          <span className="text-[11px] text-muted-foreground/60">Each becomes a mix; item # auto-assigned by order</span>
        </button>

        {rows.length > 0 && (
          <div className="max-h-52 space-y-1.5 overflow-y-auto">
            {rows.map((r, i) => (
              <div key={`${r.file.name}-${i}`} className="flex items-center gap-2 rounded-lg bg-foreground/[0.04] px-3 py-2 text-xs">
                <Music className="h-3.5 w-3.5 shrink-0 text-[#74ddc7]" />
                <span className="min-w-0 flex-1 truncate text-foreground">{r.file.name}</span>
                {r.status === "pending" && <span className="text-muted-foreground/60">#{existingInCollection(collectionId || null) + i + 1}</span>}
                {r.status === "uploading" && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#74ddc7]" />}
                {r.status === "done" && <span className="font-bold text-[#74ddc7]">Done</span>}
                {r.status === "error" && <span className="font-bold text-red-400" title={r.message}>Failed</span>}
                {!running && !done && (
                  <button onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground/60 hover:text-red-400" aria-label="Remove">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {err && <p className="text-xs text-red-400">{err}</p>}

        {allDone ? (
          <button className={PRIMARY_BTN} onClick={onSaved}>Done — close</button>
        ) : (
          <button className={PRIMARY_BTN} onClick={run} disabled={running || rows.length === 0}>
            {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading {rows.length} file(s)…</> : <><Layers className="h-4 w-4" /> Upload {rows.length || ""} file(s)</>}
          </button>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Edit mix dialog (title + cover)
// ---------------------------------------------------------------------------

function EditMixDialog({
  mix,
  currentUserId,
  ownerProfileId,
  onClose,
  onSaved,
}: {
  mix: MixItem;
  currentUserId: string | null;
  ownerProfileId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(mix.title);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Cover uploads land under the signed-in user's folder; fall back to the DJ
  // owner's id only if we somehow lack a user id (RLS still governs the write).
  const uploaderFolder = currentUserId ?? ownerProfileId;

  async function save() {
    if (!title.trim()) { setErr("Title is required."); return; }
    setBusy(true);
    setErr(null);
    try {
      const supabase = createClient();
      let coverUrl = mix.cover_image_url;
      if (coverFile && uploaderFolder) {
        coverUrl = await uploadToBucket(supabase, uploaderFolder, coverFile);
      }
      const { error } = await supabase
        .from("dj_mixes")
        .update({ title: title.trim(), cover_image_url: coverUrl, updated_at: new Date().toISOString() })
        .eq("id", mix.id);
      if (error) throw error;
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Edit mix" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={FIELD_LABEL}>Title</label>
          <input className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <CoverPicker file={coverFile} existingUrl={mix.cover_image_url} onPick={setCoverFile} />
        {err && <p className="text-xs text-red-400">{err}</p>}
        <button className={PRIMARY_BTN} onClick={save} disabled={busy}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Pencil className="h-4 w-4" /> Save changes</>}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Shared dialog widgets
// ---------------------------------------------------------------------------

function CollectionSelect({ collections, value, onChange, disabled }: { collections: Collection[]; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  // Render top-level collections, then their children indented underneath.
  const tops = collections.filter((c) => !c.parent_id).sort((a, b) => a.position - b.position);
  const childrenByParent = new Map<string, Collection[]>();
  for (const c of collections) {
    if (!c.parent_id) continue;
    const arr = childrenByParent.get(c.parent_id) ?? [];
    arr.push(c);
    childrenByParent.set(c.parent_id, arr);
  }
  return (
    <select className={FIELD} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">No collection (single)</option>
      {tops.map((top) => (
        <optgroup key={top.id} label={`${KIND_LABEL[top.kind]} — ${top.title}`}>
          <option value={top.id}>{top.title}</option>
          {(childrenByParent.get(top.id) ?? []).sort((a, b) => a.position - b.position).map((child) => (
            <option key={child.id} value={child.id}>{"   "}↳ {child.title}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function AudioPicker({ file, onPick }: { file: File | null; onPick: (f: File | null) => void }) {
  return (
    <div>
      <label className={FIELD_LABEL}>Audio file</label>
      <button
        type="button"
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "audio/*,.mp3,.wav,.m4a,.ogg,.webm,.flac,.aac";
          input.onchange = (e) => onPick((e.target as HTMLInputElement).files?.[0] ?? null);
          input.click();
        }}
        className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border bg-background/40 px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-[#74ddc7]/50 hover:text-foreground"
      >
        <Music className="h-5 w-5 shrink-0 text-[#74ddc7]" />
        <span className="min-w-0 flex-1 truncate text-left">{file ? file.name : "Click to pick an audio file"}</span>
        {file && <span className="shrink-0 text-[11px] text-muted-foreground/60">{fmtBytes(file.size)}</span>}
      </button>
    </div>
  );
}

function CoverPicker({ file, existingUrl, onPick }: { file: File | null; existingUrl: string | null; onPick: (f: File | null) => void }) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const shown = previewUrl ?? existingUrl;
  return (
    <div>
      <label className={FIELD_LABEL}>Cover image (optional)</label>
      <div className="flex items-center gap-3">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7401df]/30 to-[#74ddc7]/15">
            <Music className="h-6 w-6 text-[#74ddc7]" />
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = (e) => onPick((e.target as HTMLInputElement).files?.[0] ?? null);
            input.click();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-foreground transition-colors hover:border-[#74ddc7]/50 hover:text-[#74ddc7]"
        >
          <ImagePlus className="h-4 w-4" /> {shown ? "Change" : "Add cover"}
        </button>
        {file && (
          <button type="button" onClick={() => onPick(null)} className="text-muted-foreground/60 hover:text-red-400" aria-label="Remove cover">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Storage + media helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a non-null `host_id` for a `dj_mixes` insert.
 *
 * `dj_mixes.host_id` is NOT NULL with a FK to `hosts.id`, but DJs currently
 * carry no `host_id` of their own, so we resolve one at write time:
 *   1. the DJ's own host_id, if it ever gets populated;
 *   2. a host linked to the uploader's profile (host posting their own content);
 *   3. any active host (placeholder that satisfies the NOT-NULL FK).
 * Returns null only if the `hosts` table is empty, in which case the caller
 * surfaces a clear error instead of a raw FK violation.
 */
async function resolveHostId(supabase: Supabase, djHostId: string | null, uploaderId: string | null): Promise<string | null> {
  if (djHostId) return djHostId;
  if (uploaderId) {
    const { data: own } = await supabase.from("hosts").select("id").eq("profile_id", uploaderId).limit(1).maybeSingle();
    if (own?.id) return own.id as string;
  }
  // host_id is optional (nullable) — don't borrow an arbitrary host. Mixes are
  // attributed by dj_id, which is what the profile queries on.
  return null;
}

/** Upload a file to the public `dj-mixes` bucket under `${userId}/<uuid>.<ext>` and return its public URL. */
async function uploadToBucket(supabase: Supabase, userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${userId}/${randomUuid()}.${ext}`;
  const { error } = await supabase.storage
    .from("dj-mixes")
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return publicUrl(supabase, "dj-mixes", path);
}

/** Read duration (seconds, rounded) from an audio file via a throwaway <audio>. */
function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      const cleanup = () => URL.revokeObjectURL(url);
      audio.onloadedmetadata = () => {
        const d = Number.isFinite(audio.duration) ? Math.round(audio.duration) : null;
        cleanup();
        resolve(d);
      };
      audio.onerror = () => { cleanup(); resolve(null); };
      audio.src = url;
    } catch {
      resolve(null);
    }
  });
}

function randomUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function randomId(): string {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmt12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "p" : "a";
  const display = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${display}${ampm}` : `${display}:${String(m).padStart(2, "0")}${ampm}`;
}
function fmtBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}
