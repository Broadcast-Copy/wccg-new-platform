import { supabase } from "@/lib/supabase";

/**
 * Member documentation (bc_docs, migration 114). The guides are in NO static
 * bundle: they are read here, at runtime, with the signed-in user's session,
 * and row-level security only returns published rows to an authenticated
 * account. An anonymous request gets nothing (no policy, no privilege).
 */

export type DocListItem = {
  slug: string;
  section: string;
  title: string;
  summary: string;
  sort_order: number;
  updated_at: string;
};

export type Doc = DocListItem & {
  body_md: string;
  video: string | null;
};

/** The only slugs /docs?d= will ask the database about (same rule as the table's check). */
export function isDocSlug(value: string): boolean {
  return value.length <= 100 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export async function listDocs(): Promise<Result<DocListItem[]>> {
  const { data, error } = await supabase
    .from("bc_docs")
    .select("slug, section, title, summary, sort_order, updated_at")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error) return { ok: false, message: error.message };
  return { ok: true, value: (data ?? []) as DocListItem[] };
}

/** `null` = no published guide with that slug (or not one this account may read). */
export async function getDoc(slug: string): Promise<Result<Doc | null>> {
  const { data, error } = await supabase
    .from("bc_docs")
    .select("slug, section, title, summary, sort_order, updated_at, body_md, video")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  return { ok: true, value: (data as Doc | null) ?? null };
}

/** Guides grouped by section, sections in the order their first guide sorts. */
export function groupBySection(docs: readonly DocListItem[]): { section: string; docs: DocListItem[] }[] {
  const groups = new Map<string, DocListItem[]>();
  for (const doc of docs) {
    const list = groups.get(doc.section);
    if (list) list.push(doc);
    else groups.set(doc.section, [doc]);
  }
  return [...groups].map(([section, list]) => ({ section, docs: list }));
}

/**
 * Where a guide's optional clip lives. `video` is a bare file name (the table
 * refuses anything else); it is resolved against this public media base, so a
 * row can never point the reader at an arbitrary URL.
 */
const DOCS_MEDIA_BASE = (
  process.env.NEXT_PUBLIC_DOCS_MEDIA_BASE ||
  "https://irjiqbmoohklagdegezz.supabase.co/storage/v1/object/public/marketing/clips/docs/"
).replace(/\/*$/, "/");

export function docVideoUrl(video: string | null): string | null {
  if (video === null || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}\.(mp4|webm)$/.test(video)) return null;
  return DOCS_MEDIA_BASE + encodeURIComponent(video);
}

export function fmtUpdated(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
