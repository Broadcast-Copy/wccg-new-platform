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
  // Talk & culture — one row per show
  { program: "Way Up with Angela Yee", creator: "Way Up with Angela Yee", category: "Talk & Culture", rating: "PG-13", channelId: "UCJVR_M2dXZT6uXIapYGHtTA" },
  { program: "Posted on The Corner", creator: "Posted on The Corner", category: "Talk & Culture", rating: "PG-13", channelId: "UCB4JlD2jIkXanFehab9CbDw" },
  { program: "The Bootleg Kev Show", creator: "The Bootleg Kev Show", category: "Talk & Culture", rating: "PG-13", channelId: "UCBgOGeH-NL4o2WGutwverqQ" },
  { program: "Put Me On Game", creator: "Put Me On Game", category: "Talk & Culture", rating: "PG-13", channelId: "UCMZlwNcYLu5eV2Zm2lLmF-Q" },
  // Local Fayetteville culture — explicit language, so rated R: hidden while
  // parental controls are locked, and the watch page shows an explicit-content
  // warning before playback when unlocked.
  { program: "Big Cas", creator: "BigCas910 TV", category: "Talk & Culture", rating: "R", channelId: "UCQmsI0AAbXvTevWkqMIBU-Q" },

  // News
  { program: "ABC News", creator: "ABC News", category: "News", rating: "PG", channelId: "UCBi2mrWuNuyYy4gbM6fU18Q" },

  // Sports — Duke + Pick'em Pros. Duke rows are curated as "Duke Blue Devils".
  { program: "Sports", creator: "Duke Blue Devils", category: "Sports", rating: "G", channelId: "UC9KCzNMmf0IRcEIsFDgt2bg" }, // Duke Basketball
  { program: "Sports", creator: "Duke Blue Devils", category: "Sports", rating: "G", channelId: "UC-v9UWlnqtYeCQtPDO1lGVQ" }, // Duke Football
  { program: "Sports", creator: "Pick'em Pros", category: "Sports", rating: "PG", channelId: "UC4DI4UXm2vIS5-6fhuCAh6g" }, // Pick'em Pros

  // Local schools — area colleges & universities combined into one row.
  { program: "Local Schools", creator: "Fayetteville State University", category: "Education", rating: "G", channelId: "UCVEbUWk96dmaDFwenptsx5Q" },
  { program: "Local Schools", creator: "Campbell University", category: "Education", rating: "G", channelId: "UCrls-lOh_mu0_mBrze6R7dg" },
  { program: "Local Schools", creator: "Methodist University", category: "Education", rating: "G", channelId: "UCncT4o1lMhk9KL17JJLabqQ" },
  { program: "Local Schools", creator: "Fayetteville Technical Community College", category: "Education", rating: "G", channelId: "UC6UeI2Av47gbem_mTZEa1Ww" },
  { program: "Local Schools", creator: "Robeson Community College", category: "Education", rating: "G", channelId: "UCfo6rz_-iMCzQswPCDbRwBw" },

  // Local government & utilities — city, counties, and PWC in one row.
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
    if (!id || !titleRaw) continue;
    out.push({
      videoId: id,
      title: decode(titleRaw).trim(),
      published,
      // Prefer the feed's thumbnail; fall back to the deterministic hqdefault URL.
      thumbnail: thumb ? decode(thumb) : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    });
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

  // dryRun: parse feeds + compute would-insert/would-update counts, no DB writes.
  let dryRun = new URL(req.url).searchParams.get("dryRun") != null;
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body === "object" && (body as Record<string, unknown>).dryRun) dryRun = true;
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
      if (toInsert.length > 0) {
        const payload = toInsert.map((e) => ({
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
          published_at: e.published,
        }));
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
            body: JSON.stringify({ title: e.title, thumbnail_url: e.thumbnail }),
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

  return json({
    ok: true,
    dryRun,
    channels: CHANNELS.length,
    totals: { inserted: totalInserted, updated: totalUpdated, errors: totalErrors },
    results,
  });
});
