import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY is not set" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: "Not authenticated" }, 401);
    const { data: staff } = await userClient.rpc("is_staff");
    if (!staff) return json({ error: "Staff only" }, 403);

    const body = await req.json().catch(() => ({}));
    const slug = (body.slug ?? "").toString().trim();
    if (!slug) return json({ error: "Missing slug" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: entity } = await admin.from("wiki_entities").select("id,slug,name,entity_type").eq("slug", slug).maybeSingle();
    if (!entity) return json({ error: "Entity not found" }, 404);

    await admin.from("wiki_entities").update({ status: "researching", updated_at: new Date().toISOString() }).eq("id", entity.id);

    const sys = "You are an encyclopedia editor for WCCG 104.5 FM (a Fayetteville, NC hip-hop & community radio station). Write concise, factual, neutral entries. Never invent facts; if you are unsure, keep it general. Output strict JSON only.";
    const userPrompt = `Write an encyclopedia entry for the ${entity.entity_type} "${entity.name}". Return a JSON object with keys: "summary" (1-2 sentence overview), "content" (3-5 short markdown paragraphs covering background, notable work, and why they matter), "sources" (array of {"title":string,"url":string} reputable references, or [] if none are known).`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: sys }, { role: "user", content: userPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      await admin.from("wiki_entities").update({ status: "requested" }).eq("id", entity.id);
      return json({ error: `OpenAI error (${aiRes.status}): ${t.slice(0, 300)}` }, 502);
    }
    const aiJson = await aiRes.json();
    let parsed: { summary?: string; content?: string; sources?: unknown } = {};
    try { parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }

    const { data: updated, error: updErr } = await admin.from("wiki_entities").update({
      summary: typeof parsed.summary === "string" ? parsed.summary : null,
      content: typeof parsed.content === "string" ? parsed.content : null,
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      status: "pending_review",
      updated_at: new Date().toISOString(),
    }).eq("id", entity.id).select().single();
    if (updErr) return json({ error: updErr.message }, 500);

    return json({ entity: updated });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
