import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// wiki-generate (verify_jwt=false, shared-secret gated).
// Batch content generator for wiki_entities — the SAME OpenAI research the staff
// "Generate with AI" button runs (wiki-research), but secret-gated so it can fill
// many empty entries in one pass instead of one click at a time.
//
// Writes summary/content/sources and sets status='pending_review' — NOT published.
// The public /wiki page only shows status='published', so generated entries stay
// private until a human reviews and publishes them. Never invents facts (same
// system prompt as wiki-research); a failed entry is left at status='requested'.
//
// POST {secret, slug}          -> generate one entity by slug
// POST {secret, batch:true, limit?} -> generate up to `limit` (default 6, max 12)
//                                      still-empty (status='requested') entries

const SECRET = "wgen_a3f8c1729e5b46d0b8f2c94e7a1d5063";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(o: unknown, s = 200): Response {
  return new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
}

const SYS =
  "You are an encyclopedia editor for WCCG 104.5 FM (a Fayetteville, NC hip-hop & community radio station). Write concise, factual, neutral entries. Never invent facts; if you are unsure, keep it general. Output strict JSON only.";
function userPrompt(name: string, type: string): string {
  return `Write an encyclopedia entry for the ${type} "${name}". Return a JSON object with keys: "summary" (1-2 sentence overview), "content" (3-5 short markdown paragraphs covering background, notable work, and why they matter), "sources" (array of {"title":string,"url":string} reputable references, or [] if none are known).`;
}

interface Entity { id: string; slug: string; name: string; entity_type: string }

// deno-lint-ignore no-explicit-any
async function generateOne(admin: any, key: string, e: Entity) {
  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: SYS }, { role: "user", content: userPrompt(e.name, e.entity_type) }],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return { slug: e.slug, ok: false, error: `OpenAI ${aiRes.status}: ${t.slice(0, 120)}` };
    }
    const aiJson = await aiRes.json();
    let parsed: { summary?: string; content?: string; sources?: unknown } = {};
    try { parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }
    if (!parsed.content || typeof parsed.content !== "string") {
      return { slug: e.slug, ok: false, error: "no content in AI response" };
    }
    const { error } = await admin.from("wiki_entities").update({
      summary: typeof parsed.summary === "string" ? parsed.summary : null,
      content: parsed.content,
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      status: "pending_review",
      updated_at: new Date().toISOString(),
    }).eq("id", e.id);
    if (error) return { slug: e.slug, ok: false, error: error.message };
    return { slug: e.slug, ok: true, chars: parsed.content.length, summary: (parsed.summary ?? "").slice(0, 90) };
  } catch (err) {
    return { slug: e.slug, ok: false, error: String((err as Error)?.message ?? err) };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* */ }
  if (body.secret !== SECRET) return json({ error: "forbidden" }, 403);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY not set" }, 500);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const slug = String(body.slug ?? "").trim();
  const limit = Math.min(Math.max(Number(body.limit ?? 6), 1), 12);

  let entities: Entity[] = [];
  if (slug) {
    const { data } = await admin.from("wiki_entities").select("id,slug,name,entity_type").eq("slug", slug).limit(1);
    entities = (data ?? []) as Entity[];
  } else if (body.batch) {
    const { data } = await admin.from("wiki_entities")
      .select("id,slug,name,entity_type")
      .eq("status", "requested")
      .order("created_at", { ascending: true })
      .limit(limit);
    entities = (data ?? []) as Entity[];
  } else {
    return json({ error: "need slug or batch:true" }, 400);
  }
  if (entities.length === 0) return json({ ok: true, generated: [], remaining_requested: 0, note: "nothing to generate" });

  const generated = [];
  for (const e of entities) generated.push(await generateOne(admin, OPENAI_API_KEY, e));

  const { count } = await admin.from("wiki_entities")
    .select("id", { count: "exact", head: true })
    .eq("status", "requested");
  return json({ ok: true, generated, remaining_requested: count ?? null });
});
