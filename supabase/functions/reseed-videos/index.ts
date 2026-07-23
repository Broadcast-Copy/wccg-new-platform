import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// reseed-videos (verify_jwt=false). Epic D3 — keep the Watch page current.
//
// For each configured WCCG program channel, fetch the PUBLIC YouTube RSS feed
// (https://www.youtube.com/feeds/videos.xml?channel_id=...) — NO API KEY needed —
// parse the Atom XML, and UPSERT into public.videos keyed on youtube_id:
//   - INSERT new videos (program/creator/category/rating from the channel config,
//     user_id = the station owner, status='published', visibility='public').
//   - For videos that already exist, UPDATE only title + thumbnail_url. We do NOT
//     overwrite program/creator_name/category/rating because those rows may have
//     been curated by staff after the original seed.
// Never deletes anything. Each channel is wrapped in try/catch so one bad feed
// does not abort the rest. Returns a JSON summary per channel.
//
// Safe to run as a cron with verify_jwt=false: it only ADDS public videos and
// refreshes titles/thumbnails — no destructive action.
//
// Invoke a dry run (parse + count, no DB writes) with ?dryRun=1 or {"dryRun":true}.

const STATION_USER = "f9c9b54a-b4a0-4dad-b2ae-d76f7eaa39ac"; // "WCCG 104.5 FM" account
const PER_CHANNEL = 8; // how many of the latest uploads to consider per channel

// program → channel mapping (mirrors scripts/seed-program-videos.mjs). The Watch
// wall groups rows by `program`, so several channels can share a `program` label
// (all Sports, all Gospel) to form one combined row. `creator` is the per-channel
// display name used for NEW rows (existing rows keep their curated creator_name).
interface ChannelConfig {
  program: string;
  creator: string;
  category: string;
  rating: "G" | "PG" | "PG-13" | "R" | "NR";
  channelId: string;
}

const CHANNELS: ChannelConfig[] = [
  // The station's own channel — interviews, podcasts & events produced by WCCG.
  { program: "WCCG 104.5 FM Original Content", creator: "WCCG 104.5 FM", category: "Originals", rating: "PG", channelId: "UC7fsAn1jAj4lX8sk_bd8H4A" },

  // From The Radio — the syndicated shows heard on 104.5, combined into one
  // row. `creator` keeps each show's name so cards still say which show.
  { program: "From The Radio", creator: "Way Up with Angela Yee", category: "Talk & Culture", rating: "PG-13", channelId: "UCJVR_M2dXZT6uXIapYGHtTA" },
  { program: "From The Radio", creator: "Angela Yee", category: "Talk & Culture", rating: "PG-13", channelId: "UCWS_UtIkoPGKODjeJEHMdEg" }, // her personal channel
  { program: "From The Radio", creator: "The Deja Vu Show", category: "Talk & Culture", rating: "PG", channelId: "UCO_M1X6yEa-T1UH_XhWA8Yw" }, // WCCG Saturday throwbacks
  { program: "From The Radio", creator: "Posted on The Corner", category: "Talk & Culture", rating: "PG-13", channelId: "UCB4JlD2jIkXanFehab9CbDw" },
  { program: "From The Radio", creator: "The Bootleg Kev Show", category: "Talk & Culture", rating: "PG-13", channelId: "UCBgOGeH-NL4o2WGutwverqQ" },
  // ABC News rides in From The Radio (no standalone news row). category stays
  // "News" so the Latest rail keeps excluding headline volume.
  { program: "From The Radio", creator: "ABC News", category: "News", rating: "PG", channelId: "UCBi2mrWuNuyYy4gbM6fU18Q" },
  // Local Content Creators — Fayetteville-area creators in one combined row.
  // Big Cas stays rated R (explicit language): thumbnail shows but playback is
  // parental-gated + explicit-content warning on the watch page.
  { program: "Local Content Creators", creator: "Big Cas", category: "Talk & Culture", rating: "R", channelId: "UCQmsI0AAbXvTevWkqMIBU-Q" },
  { program: "Local Content Creators", creator: "Drect Williams", category: "Talk & Culture", rating: "PG-13", channelId: "UCPwUv_AYzOlK8VZP-dUM6ew" }, // Drect Media
  { program: "Local Content Creators", creator: "Put Me On Game", category: "Talk & Culture", rating: "PG-13", channelId: "UCMZlwNcYLu5eV2Zm2lLmF-Q" },
  // Director Mark Mayr — Fayetteville cyphers/music videos. Explicit language,
  // so rated R (thumbnail shows, playback is parental-gated + warned like Big Cas).
  { program: "Local Content Creators", creator: "Director Mark Mayr", category: "Talk & Culture", rating: "R", channelId: "UCkjKdYGTzx-C9tEfwwXt0pA" },

  // Sports — Duke + Pick'em Pros. Duke rows are curated as "Duke Blue Devils".
  { program: "Sports", creator: "Duke Blue Devils", category: "Sports", rating: "G", channelId: "UC9KCzNMmf0IRcEIsFDgt2bg" }, // Duke Basketball
  { program: "Sports", creator: "Duke Blue Devils", category: "Sports", rating: "G", channelId: "UC-v9UWlnqtYeCQtPDO1lGVQ" }, // Duke Football
  { program: "Sports", creator: "Pick'em Pros", category: "Sports", rating: "PG", channelId: "UC4DI4UXm2vIS5-6fhuCAh6g" }, // Pick'em Pros

  // From Your College — area colleges & universities combined into one row.
  { program: "From Your College", creator: "Fayetteville State University", category: "Education", rating: "G", channelId: "UCVEbUWk96dmaDFwenptsx5Q" },
  { program: "From Your College", creator: "Campbell University", category: "Education", rating: "G", channelId: "UCrls-lOh_mu0_mBrze6R7dg" },
  { program: "From Your College", creator: "Methodist University", category: "Education", rating: "G", channelId: "UCncT4o1lMhk9KL17JJLabqQ" },
  { program: "From Your College", creator: "Fayetteville Technical Community College", category: "Education", rating: "G", channelId: "UC6UeI2Av47gbem_mTZEa1Ww" },
  { program: "From Your College", creator: "Robeson Community College", category: "Education", rating: "G", channelId: "UCfo6rz_-iMCzQswPCDbRwBw" },

  // Local Government — city, counties, and PWC in one row.
  { program: "Local Government", creator: "City of Fayetteville", category: "Community", rating: "G", channelId: "UCae_2JwaN6G7KvTJDU3TD6g" },
  { program: "Local Government", creator: "Fayetteville PWC", category: "Community", rating: "G", channelId: "UCjz2EfG0AqCqa-voV5Xb-VQ" },
  { program: "Local Government", creator: "Cumberland County", category: "Community", rating: "G", channelId: "UCWW_IJSglN-zz1vLQ2AkPiA" },
  { program: "Local Government", creator: "Harnett County", category: "Community", rating: "G", channelId: "UCU7mTF6HTD65x_98EhAMeMg" },
  { program: "Local Government", creator: "Sampson County", category: "Community", rating: "G", channelId: "UCpZ9fEh38OXp_YrGZYVne3g" },
  { program: "Local Government", creator: "Lee County", category: "Community", rating: "G", channelId: "UCQ6c7WFfXy_H4zuzd32viJw" },

  // Gospel — every gospel broadcast combined into one "Gospel" row.
  { program: "Gospel", creator: "The Encouraging Moment", category: "Gospel", rating: "G", channelId: "UCc6aixt81vdBrFDV772Z1Gw" }, // The Encouraging Moment (Dr. Tony Haire)
  { program: "Gospel", creator: "Grace Plus Nothing Ministries", category: "Gospel", rating: "G", channelId: "UCRqRVNSRMdIQqZw60bAgN1w" }, // Grace Plus Nothing Ministries
  { program: "Gospel", creator: "Family Fellowship Worship Center", category: "Gospel", rating: "G", channelId: "UCxTzK_2da5bZag5WTAbiVzQ" }, // Family Fellowship Worship Center
  { program: "Gospel", creator: "Progressive MBC", category: "Gospel", rating: "G", channelId: "UCavo4QHyzuMM2FED2W6PwEg" }, // Progressive MBC
  { program: "Gospel", creator: "Lewis Chapel Missionary Baptist Church", category: "Gospel", rating: "G", channelId: "UCOe1fQxFPHNf3N7Rb55ySTA" }, // Lewis Chapel Missionary Baptist Church

  // Local youth gamer. Source channel is titled "Mel" (@melaniereil5704, the
  // parent's account) but the content is Jaxson's gameplay, so it's displayed
  // as "Jaxson Gaming" with its own program row + /videos?program=Jaxson Gaming.
  { program: "Jaxson Gaming", creator: "Jaxson Gaming", category: "Gaming", rating: "G", channelId: "UCECTY-Q2XzJdqkd40ZKCanA" },
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

interface Entry {
  videoId: string;
  title: string;
  published: string | null;
  thumbnail: string;
  views: number | null;
}

// Probe whether a video is a phone-style portrait Short (no API key).
// youtube.com/shorts/<id> answers 200 for actual Shorts and redirects (3xx)
// to /watch for regular videos — oEmbed is useless here, it reports 200x113
// for everything. Returns true (Short — hidden from the wall), false (wide),
// or null (transient failure — left unknown and retried by a later backfill).
// Unavailable videos (4xx) count as wide: they're dead links either way and
// must not wedge the backfill loop.
async function probePortrait(videoId: string): Promise<boolean | null> {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      redirect: "manual",
      headers: {
        "user-agent": "Mozilla/5.0 wccg-reseed",
        // Pre-acknowledge the consent interstitial so EU-routed requests
        // still get the real 200-vs-redirect answer.
        cookie: "CONSENT=YES+cb.20210328-17-p0.en+FX+419; SOCS=CAI",
      },
    });
    if (res.status === 200) return true;
    if (res.status >= 300 && res.status < 400) {
      // Consent bounces go to consent.youtube.com for Shorts too — treat a
      // redirect WITHIN youtube as "regular video", anything else as unknown.
      const loc = res.headers.get("location") ?? "";
      return loc.includes("/watch") ? false : null;
    }
    return res.status >= 400 && res.status < 500 ? false : null;
  } catch {
    return null;
  }
}

// Parse the YouTube Atom feed without an XML lib (matches the seed script style,
// keeps the function dependency-free). Returns up to `limit` newest entries.
function parseEntries(xml: string, limit: number): Entry[] {
  const out: Entry[] = [];
  const blocks = xml.split("<entry>").slice(1);
  for (const b of blocks.slice(0, limit)) {
    const id = b.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];
    const titleRaw = b.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const published = b.match(/<published>(.*?)<\/published>/)?.[1] ?? null;
    const thumb = b.match(/<media:thumbnail\s+url="(.*?)"/)?.[1];
    // YouTube channel feeds carry the live view count per entry — use it so
    // reseeded/synced videos show real numbers instead of 0.
    const viewsRaw = b.match(/<media:statistics\s+views="(\d+)"/)?.[1];
    if (!id || !titleRaw) continue;
    out.push({
      videoId: id,
      title: decode(titleRaw).trim(),
      published,
      // Prefer the feed's thumbnail; fall back to the deterministic hqdefault URL.
      thumbnail: thumb ? decode(thumb) : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      views: viewsRaw ? Number(viewsRaw) : null,
    });
  }
  return out;
}

const PER_USER = 10; // latest uploads to sync per linked creator channel

// Resolve a channel_id (UC...) from a stored channel URL/handle. Direct UC ids
// and /channel/UC... return immediately; @handles / custom URLs are resolved by
// fetching the channel page and reading its canonical channelId.
async function resolveChannelId(urlOrId: string): Promise<string | null> {
  const direct = urlOrId.match(/(UC[\w-]{20,})/)?.[1];
  if (direct) return direct;
  let pageUrl = urlOrId.trim();
  if (!pageUrl) return null;
  if (!/^https?:\/\//i.test(pageUrl)) {
    pageUrl = `https://www.youtube.com/${pageUrl.startsWith("@") ? "" : "@"}${pageUrl}`;
  }
  try {
    const res = await fetch(pageUrl, {
      headers: { "user-agent": "Mozilla/5.0 wccg-reseed", cookie: "CONSENT=YES+cb; SOCS=CAI" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return (
      html.match(/"channelId":"(UC[\w-]{20,})"/)?.[1] ??
      html.match(/channel\/(UC[\w-]{20,})/)?.[1] ??
      null
    );
  } catch {
    return null;
  }
}

interface SyncProfile {
  id: string;
  display_name: string | null;
  artist_name: string | null;
  youtube_channel_url: string | null;
  youtube_channel_id: string | null;
}

// Pull a linked creator's latest public uploads onto their profile as
// visibility='unlisted', source='youtube_sync' (shown on their profile, kept
// out of the curated main Watch feed). Inserts new youtube_ids only.
async function syncUserChannel(p: SyncProfile, SUPABASE_URL: string, auth: Record<string, string>) {
  const label = p.display_name || p.id;
  let channelId = p.youtube_channel_id;
  if (!channelId) {
    channelId = await resolveChannelId(p.youtube_channel_url || "");
    if (channelId) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${p.id}`, {
        method: "PATCH",
        headers: { ...auth, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ youtube_channel_id: channelId }),
      });
    }
  }
  if (!channelId) return { user: label, inserted: 0, errors: 1, reason: "could not resolve channel id" };

  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
    headers: { "user-agent": "Mozilla/5.0 wccg-reseed" },
  });
  if (!res.ok) return { user: label, inserted: 0, errors: 1, reason: `feed HTTP ${res.status}` };
  const entries = parseEntries(await res.text(), PER_USER);
  if (entries.length === 0) return { user: label, inserted: 0, errors: 0, reason: "no entries" };

  const inList = entries.map((e) => `"${e.videoId}"`).join(",");
  const existRes = await fetch(
    `${SUPABASE_URL}/rest/v1/videos?select=youtube_id&user_id=eq.${p.id}&youtube_id=in.(${inList})`,
    { headers: auth },
  );
  const existing = new Set(
    (((await existRes.json().catch(() => [])) as Array<{ youtube_id: string }>) ?? []).map((r) => r.youtube_id),
  );
  const toInsert = entries.filter((e) => !existing.has(e.videoId));
  if (toInsert.length === 0) return { user: label, inserted: 0, errors: 0 };

  const creator = p.artist_name || p.display_name || "WCCG Creator";
  const payload = [];
  for (const e of toInsert) {
    payload.push({
      user_id: p.id,
      creator_name: creator,
      title: e.title,
      youtube_id: e.videoId,
      youtube_url: `https://www.youtube.com/watch?v=${e.videoId}`,
      thumbnail_url: e.thumbnail,
      category: "Creator",
      rating: "G",
      status: "published",
      visibility: "unlisted",
      source: "youtube_sync",
      views: e.views ?? 0,
      published_at: e.published,
      is_portrait: await probePortrait(e.videoId),
    });
  }
  const insRes = await fetch(`${SUPABASE_URL}/rest/v1/videos`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
  if (!insRes.ok) {
    const t = await insRes.text();
    return { user: label, inserted: 0, errors: 1, reason: `insert HTTP ${insRes.status}: ${t.slice(0, 120)}` };
  }
  return { user: label, inserted: toInsert.length, errors: 0 };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

  // dryRun: parse feeds + compute would-insert/would-update counts, no DB writes.
  const url = new URL(req.url);
  let dryRun = url.searchParams.get("dryRun") != null;
  let backfill = url.searchParams.get("backfill") != null;
  let syncUserId: string | null = url.searchParams.get("syncUserId");
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body === "object") {
      if ((body as Record<string, unknown>).dryRun) dryRun = true;
      if ((body as Record<string, unknown>).backfill) backfill = true;
      const sid = (body as Record<string, unknown>).syncUserId;
      if (typeof sid === "string" && sid) syncUserId = sid;
    }
  }

  // Backfill mode: probe orientation for existing rows where is_portrait is
  // still null, 150 per invocation. Invoke repeatedly until remaining = 0.
  if (backfill) {
    const listRes = await fetch(
      `${SUPABASE_URL}/rest/v1/videos?select=id,youtube_id&user_id=eq.${STATION_USER}&is_portrait=is.null&youtube_id=not.is.null&limit=150`,
      { headers: auth },
    );
    if (!listRes.ok) return json({ ok: false, error: `list failed HTTP ${listRes.status}` }, 500);
    const rows = (await listRes.json()) as Array<{ id: string; youtube_id: string }>;

    const portraitIds: string[] = [];
    const wideIds: string[] = [];
    let unknown = 0;
    for (const r of rows) {
      const p = await probePortrait(r.youtube_id);
      if (p === null) unknown++;
      else if (p) portraitIds.push(r.id);
      else wideIds.push(r.id);
    }
    for (const [ids, val] of [[portraitIds, true], [wideIds, false]] as const) {
      if (ids.length === 0) continue;
      const upRes = await fetch(
        `${SUPABASE_URL}/rest/v1/videos?id=in.(${ids.join(",")})`,
        {
          method: "PATCH",
          headers: { ...auth, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ is_portrait: val }),
        },
      );
      if (!upRes.ok) return json({ ok: false, error: `patch failed HTTP ${upRes.status}` }, 500);
    }

    const countRes = await fetch(
      `${SUPABASE_URL}/rest/v1/videos?select=id&user_id=eq.${STATION_USER}&is_portrait=is.null&youtube_id=not.is.null&limit=1`,
      { method: "HEAD", headers: { ...auth, Prefer: "count=exact" } },
    );
    const remaining = Number(countRes.headers.get("content-range")?.split("/")[1] ?? -1);
    return json({ ok: true, backfill: true, checked: rows.length, portrait: portraitIds.length, wide: wideIds.length, unknown, remaining });
  }

  // On-demand single-user YouTube sync (the "Sync now" button on Settings).
  if (syncUserId) {
    const pRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=id,display_name,artist_name,youtube_channel_url,youtube_channel_id&id=eq.${syncUserId}`,
      { headers: auth },
    );
    const profs = (await pRes.json().catch(() => [])) as SyncProfile[];
    if (!profs || profs.length === 0) return json({ ok: false, error: "profile not found" }, 404);
    const synced = await syncUserChannel(profs[0], SUPABASE_URL, auth);
    return json({ ok: true, synced });
  }

  const results: Array<Record<string, unknown>> = [];
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  for (const ch of CHANNELS) {
    const label = `${ch.program} / ${ch.creator}`;
    try {
      // 1. Fetch the public RSS feed (no API key, server-side so no CORS issues).
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channelId}`;
      const res = await fetch(feedUrl, { headers: { "user-agent": "Mozilla/5.0 wccg-reseed" } });
      if (!res.ok) {
        totalErrors++;
        results.push({ channel: label, channelId: ch.channelId, inserted: 0, updated: 0, errors: 1, reason: `feed HTTP ${res.status}` });
        continue;
      }
      const xml = await res.text();
      const entries = parseEntries(xml, PER_CHANNEL);
      if (entries.length === 0) {
        results.push({ channel: label, channelId: ch.channelId, inserted: 0, updated: 0, errors: 0, reason: "no entries parsed" });
        continue;
      }

      // 2. Which of these youtube_ids already exist (for the station user)?
      const ids = entries.map((e) => e.videoId);
      const inList = ids.map((i) => `"${i}"`).join(",");
      const existRes = await fetch(
        `${SUPABASE_URL}/rest/v1/videos?select=youtube_id&user_id=eq.${STATION_USER}&youtube_id=in.(${inList})`,
        { headers: auth },
      );
      if (!existRes.ok) {
        const t = await existRes.text();
        throw new Error(`lookup failed HTTP ${existRes.status}: ${t.slice(0, 200)}`);
      }
      const existingRows = (await existRes.json()) as Array<{ youtube_id: string }>;
      const existing = new Set(existingRows.map((r) => r.youtube_id));

      const toInsert = entries.filter((e) => !existing.has(e.videoId));
      const toUpdate = entries.filter((e) => existing.has(e.videoId));

      if (dryRun) {
        totalInserted += toInsert.length;
        totalUpdated += toUpdate.length;
        results.push({ channel: label, channelId: ch.channelId, inserted: toInsert.length, updated: toUpdate.length, errors: 0, dryRun: true });
        continue;
      }

      let inserted = 0;
      let updated = 0;

      // 3a. INSERT new videos (bulk). Set the full row from the channel config.
      // Each new video is orientation-probed so portrait/Shorts uploads never
      // surface on the wall (is_portrait=true rows are filtered client-side).
      if (toInsert.length > 0) {
        const payload = [];
        for (const e of toInsert) {
          payload.push({
            user_id: STATION_USER,
            program: ch.program,
            creator_name: ch.creator,
            title: e.title,
            youtube_id: e.videoId,
            youtube_url: `https://www.youtube.com/watch?v=${e.videoId}`,
            thumbnail_url: e.thumbnail,
            category: ch.category,
            rating: ch.rating,
            status: "published",
            visibility: "public",
            source: "reseed",
            views: e.views ?? 0,
            published_at: e.published,
            is_portrait: await probePortrait(e.videoId),
          });
        }
        const insRes = await fetch(`${SUPABASE_URL}/rest/v1/videos`, {
          method: "POST",
          headers: { ...auth, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify(payload),
        });
        if (!insRes.ok) {
          const t = await insRes.text();
          throw new Error(`insert failed HTTP ${insRes.status}: ${t.slice(0, 200)}`);
        }
        inserted = toInsert.length;
      }

      // 3b. UPDATE existing videos — title + thumbnail only (preserve curation).
      for (const e of toUpdate) {
        const upRes = await fetch(
          `${SUPABASE_URL}/rest/v1/videos?user_id=eq.${STATION_USER}&youtube_id=eq.${e.videoId}`,
          {
            method: "PATCH",
            headers: { ...auth, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ title: e.title, thumbnail_url: e.thumbnail, ...(e.views != null ? { views: e.views } : {}) }),
          },
        );
        if (upRes.ok) {
          updated++;
        } else {
          const t = await upRes.text();
          console.error(`update ${e.videoId} failed HTTP ${upRes.status}: ${t.slice(0, 120)}`);
        }
      }

      totalInserted += inserted;
      totalUpdated += updated;
      results.push({ channel: label, channelId: ch.channelId, inserted, updated, errors: 0 });
    } catch (err) {
      totalErrors++;
      console.error(`channel ${label} failed:`, err);
      results.push({ channel: label, channelId: ch.channelId, inserted: 0, updated: 0, errors: 1, reason: String(err) });
    }
  }

  // Linked creator channels — sync each creator's latest public uploads to
  // their own profile (unlisted). Skipped on dryRun.
  const userResults: Array<Record<string, unknown>> = [];
  if (!dryRun) {
    const pRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=id,display_name,artist_name,youtube_channel_url,youtube_channel_id&youtube_channel_url=not.is.null`,
      { headers: auth },
    );
    const profs = (await pRes.json().catch(() => [])) as SyncProfile[];
    for (const p of profs ?? []) {
      try {
        const r = await syncUserChannel(p, SUPABASE_URL, auth);
        userResults.push(r);
        totalInserted += (r.inserted as number) ?? 0;
        if (r.errors) totalErrors += r.errors as number;
      } catch (err) {
        totalErrors++;
        userResults.push({ user: p.display_name || p.id, inserted: 0, errors: 1, reason: String(err) });
      }
    }
  }

  return json({
    ok: true,
    dryRun,
    channels: CHANNELS.length,
    totals: { inserted: totalInserted, updated: totalUpdated, errors: totalErrors },
    results,
    userChannels: userResults,
  });
});
