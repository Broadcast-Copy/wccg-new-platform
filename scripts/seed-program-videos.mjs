// Seed the `videos` table with REAL videos from WCCG's programming, pulled from
// each program's YouTube channel RSS feed. Emits idempotent SQL to stdout +
// scripts/seed-program-videos.sql. Run: node scripts/seed-program-videos.mjs
//
// No API key needed — YouTube's channel RSS feed is public and includes the
// latest ~15 uploads with view counts (media:statistics).

const STATION_USER = "f9c9b54a-b4a0-4dad-b2ae-d76f7eaa39ac"; // "WCCG 104.5 FM" account
const PER_CHANNEL = 8;

// program → channel. The wall groups rows by `program`, so several channels can
// share a program label to form one combined row (e.g. all Sports, all Gospel).
// Talk/hip-hop shows are PG-13 (visible but flagged); news PG; gospel/sports G.
const PROGRAMS = [
  // Talk & culture — one row per show
  { program: "Way Up with Angela Yee", category: "Talk & Culture", rating: "PG-13", channelId: "UCJVR_M2dXZT6uXIapYGHtTA" },
  { program: "Posted on The Corner", category: "Talk & Culture", rating: "PG-13", channelId: "UCB4JlD2jIkXanFehab9CbDw" },
  { program: "The Bootleg Kev Show", category: "Talk & Culture", rating: "PG-13", channelId: "UCBgOGeH-NL4o2WGutwverqQ" },
  { program: "Put Me On Game", category: "Talk & Culture", rating: "PG-13", channelId: "UCMZlwNcYLu5eV2Zm2lLmF-Q" },
  // Local Fayetteville culture — explicit language → rated R (parental-gated +
  // explicit-content warning on the watch page).
  { program: "Big Cas", category: "Talk & Culture", rating: "R", channelId: "UCQmsI0AAbXvTevWkqMIBU-Q" },

  // News
  { program: "ABC News", category: "News", rating: "PG", channelId: "UCBi2mrWuNuyYy4gbM6fU18Q" },

  // Sports — Duke + Pick'em Pros combined into one "Sports" row
  { program: "Sports", category: "Sports", rating: "G", channelId: "UC9KCzNMmf0IRcEIsFDgt2bg" }, // Duke Basketball
  { program: "Sports", category: "Sports", rating: "G", channelId: "UC-v9UWlnqtYeCQtPDO1lGVQ" }, // Duke Football
  { program: "Sports", category: "Sports", rating: "PG", channelId: "UC4DI4UXm2vIS5-6fhuCAh6g" }, // Pick'em Pros

  // Local schools — area colleges & universities combined into one row.
  { program: "Local Schools", category: "Education", rating: "G", channelId: "UCVEbUWk96dmaDFwenptsx5Q" }, // Fayetteville State University
  { program: "Local Schools", category: "Education", rating: "G", channelId: "UCrls-lOh_mu0_mBrze6R7dg" }, // Campbell University
  { program: "Local Schools", category: "Education", rating: "G", channelId: "UCncT4o1lMhk9KL17JJLabqQ" }, // Methodist University
  { program: "Local Schools", category: "Education", rating: "G", channelId: "UC6UeI2Av47gbem_mTZEa1Ww" }, // Fayetteville Technical Community College
  { program: "Local Schools", category: "Education", rating: "G", channelId: "UCfo6rz_-iMCzQswPCDbRwBw" }, // Robeson Community College

  // Local government & utilities — city, counties, and PWC in one row.
  { program: "Local Government", category: "Community", rating: "G", channelId: "UCae_2JwaN6G7KvTJDU3TD6g" }, // City of Fayetteville
  { program: "Local Government", category: "Community", rating: "G", channelId: "UCjz2EfG0AqCqa-voV5Xb-VQ" }, // Fayetteville PWC
  { program: "Local Government", category: "Community", rating: "G", channelId: "UCWW_IJSglN-zz1vLQ2AkPiA" }, // Cumberland County
  { program: "Local Government", category: "Community", rating: "G", channelId: "UCU7mTF6HTD65x_98EhAMeMg" }, // Harnett County
  { program: "Local Government", category: "Community", rating: "G", channelId: "UCpZ9fEh38OXp_YrGZYVne3g" }, // Sampson County
  { program: "Local Government", category: "Community", rating: "G", channelId: "UCQ6c7WFfXy_H4zuzd32viJw" }, // Lee County

  // Gospel — every gospel broadcast combined into one "Gospel" row.
  // NOTE: the id UCvxWyn4rfcI2H9APhfUIB1Q that used to be labeled "Dr. Tony Haire"
  // here is actually JOEL OSTEEN's channel — WCCG does NOT broadcast Joel Osteen.
  // The correct "Encouraging Moment" channel is "Tony Haire, PhD" below.
  { program: "Gospel", category: "Gospel", rating: "G", channelId: "UCc6aixt81vdBrFDV772Z1Gw" }, // The Encouraging Moment (Dr. Tony Haire)
  { program: "Gospel", category: "Gospel", rating: "G", channelId: "UCRqRVNSRMdIQqZw60bAgN1w" }, // Grace Plus Nothing Ministries
  { program: "Gospel", category: "Gospel", rating: "G", channelId: "UCxTzK_2da5bZag5WTAbiVzQ" }, // Family Fellowship Worship Center
  { program: "Gospel", category: "Gospel", rating: "G", channelId: "UCavo4QHyzuMM2FED2W6PwEg" }, // Progressive MBC (this id was mislabeled "Mt. Pisgah")
  { program: "Gospel", category: "Gospel", rating: "G", channelId: "UCOe1fQxFPHNf3N7Rb55ySTA" }, // Lewis Chapel Missionary Baptist Church
  // Mt. Pisgah Missionary Baptist Church — confirm the correct channel before
  // seeding. Fayetteville "Mount Pisgah Baptist Church" (UCzIkbXguZbWkAfp88zubLYQ)
  // posts only sporadic, timestamp-titled videos; a Raeford "Mount Pisgah
  // Missionary Baptist Church" also exists. Add the confirmed one here:
  // { program: "Gospel", category: "Gospel", rating: "G", channelId: "<MT_PISGAH_CHANNEL_ID>" }, // Mt. Pisgah Missionary Baptist Church
];

function decode(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}
const sq = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);

function parseEntries(xml, limit) {
  const out = [];
  const blocks = xml.split("<entry>").slice(1);
  for (const b of blocks.slice(0, limit)) {
    const id = b.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];
    const title = b.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const published = b.match(/<published>(.*?)<\/published>/)?.[1];
    const views = b.match(/<media:statistics views="(\d+)"/)?.[1];
    if (!id || !title) continue;
    out.push({ id, title: decode(title).trim(), published: published ?? null, views: views ? Number(views) : 0 });
  }
  return out;
}

async function main() {
  const rows = [];
  for (const p of PROGRAMS) {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${p.channelId}`;
    try {
      const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 wccg-seed" } });
      if (!res.ok) {
        console.error(`SKIP ${p.program}: HTTP ${res.status}`);
        continue;
      }
      const xml = await res.text();
      const entries = parseEntries(xml, PER_CHANNEL);
      console.error(`OK   ${p.program}: ${entries.length} videos`);
      for (const e of entries) {
        rows.push({
          ...e,
          program: p.program,
          category: p.category,
          rating: p.rating,
        });
      }
    } catch (err) {
      console.error(`ERR  ${p.program}: ${err.message}`);
    }
  }

  if (rows.length === 0) {
    console.error("No videos fetched — aborting (no SQL written).");
    process.exit(1);
  }

  // Compact form: the UUID + derivable URLs + constant columns are written ONCE
  // in SQL; each value row carries only (program, title, ytid, category, rating,
  // views, published). This keeps the statement short and transcription-safe.
  const values = rows
    .map((r) => {
      const cols = [
        sq(r.program),
        sq(r.title),
        sq(r.id),
        sq(r.category),
        sq(r.rating),
        String(r.views),
        r.published ? sq(r.published) : "now()",
      ];
      return `(${cols.join(",")})`;
    })
    .join(",\n");

  const sql = `-- Seeded ${rows.length} real program videos from YouTube RSS.
delete from public.videos where user_id = '${STATION_USER}';
insert into public.videos
  (user_id, program, creator_name, title, youtube_id, youtube_url, thumbnail_url, category, rating, status, visibility, views, published_at)
select '${STATION_USER}'::uuid, t.program, t.program, t.title, t.ytid,
       'https://www.youtube.com/watch?v=' || t.ytid,
       'https://i.ytimg.com/vi/' || t.ytid || '/hqdefault.jpg',
       t.category, t.rating, 'published', 'public', t.views, t.published::timestamptz
from (values
${values}
) as t(program, title, ytid, category, rating, views, published);`;

  const fs = await import("node:fs");
  fs.writeFileSync(new URL("./seed-program-videos.sql", import.meta.url), sql);
  console.error(`\nWrote ${rows.length} rows to scripts/seed-program-videos.sql`);
  // also print a compact per-program tally
  const tally = {};
  for (const r of rows) tally[r.program] = (tally[r.program] ?? 0) + 1;
  console.error(JSON.stringify(tally, null, 2));
}

main();
