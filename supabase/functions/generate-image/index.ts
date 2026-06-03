import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return json({ error: "OPENAI_API_KEY is not set. Add it in Supabase → Project Settings → Edge Functions → Secrets." }, 500);
    }

    // Resolve the caller from their JWT.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const prompt = (body.prompt ?? "").toString().trim();
    const size = ["1024x1024", "1536x1024", "1024x1536", "auto"].includes(body.size) ? body.size : "1024x1024";
    if (!prompt) return json({ error: "Missing prompt" }, 400);

    // Generate with OpenAI gpt-image-1 (returns base64).
    const aiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-image-1", prompt, size, n: 1 }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return json({ error: `OpenAI error (${aiRes.status}): ${t.slice(0, 300)}` }, 502);
    }
    const aiJson = await aiRes.json();
    const b64 = aiJson?.data?.[0]?.b64_json;
    if (!b64) return json({ error: "No image returned by OpenAI" }, 502);
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    // Persist with the service role (bypasses storage RLS), scoped to the user's folder.
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const id = crypto.randomUUID();
    const path = `${user.id}/${id}.png`;
    const { error: upErr } = await admin.storage
      .from("generated-images")
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (upErr) return json({ error: `Upload failed: ${upErr.message}` }, 500);

    const { error: insErr } = await admin.from("generated_images").insert({
      id, user_id: user.id, prompt, size, provider: "openai", model: "gpt-image-1", storage_path: path,
    });
    if (insErr) return json({ error: `DB insert failed: ${insErr.message}` }, 500);

    const { data: pub } = admin.storage.from("generated-images").getPublicUrl(path);
    return json({ id, path, url: pub.publicUrl, prompt, size });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
