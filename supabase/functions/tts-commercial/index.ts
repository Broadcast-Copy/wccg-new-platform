import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * tts-commercial — free, no-key text-to-speech for the Commercial Producer.
 *
 * Proxies Google Translate TTS (which is free but has no CORS and a ~200-char
 * limit per request). We chunk the script server-side, fetch each piece, and
 * concatenate the MP3 frames into one clip returned as base64. The browser then
 * mixes this voiceover over a music bed and exports the finished commercial.
 *
 * Requires a logged-in caller (same pattern as generate-image).
 */

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

// Accent/language options Google TTS honors for English reads.
const LANGS: Record<string, string> = {
  us: "en",
  uk: "en-gb",
  au: "en-au",
  in: "en-in",
};

/** Split text into <=180-char chunks on sentence, then word, boundaries. */
function chunk(text: string, max = 180): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return [clean];
  const out: string[] = [];
  // First break on sentence enders, then pack greedily up to max.
  const sentences = clean.match(/[^.!?]+[.!?]*\s*/g) ?? [clean];
  let buf = "";
  const flushWords = (s: string) => {
    for (const w of s.split(" ")) {
      if ((buf + " " + w).trim().length > max) {
        if (buf) out.push(buf.trim());
        buf = w;
      } else {
        buf = (buf + " " + w).trim();
      }
    }
  };
  for (const s of sentences) {
    if ((buf + " " + s).trim().length <= max) {
      buf = (buf + " " + s).trim();
    } else {
      if (buf) { out.push(buf.trim()); buf = ""; }
      if (s.trim().length <= max) buf = s.trim();
      else flushWords(s);
    }
  }
  if (buf) out.push(buf.trim());
  return out.filter(Boolean);
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(bin);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Require a logged-in caller.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const text = (body.text ?? "").toString().trim();
    const lang = LANGS[(body.voice ?? "us").toString()] ?? "en";
    if (!text) return json({ error: "Missing script text" }, 400);
    if (text.length > 3000) {
      return json({ error: "Script too long (max 3000 characters)." }, 400);
    }

    const parts = chunk(text);
    const buffers: Uint8Array[] = [];
    for (let i = 0; i < parts.length; i++) {
      const q = encodeURIComponent(parts[i]);
      const url =
        `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}` +
        `&q=${q}&idx=${i}&total=${parts.length}&textlen=${parts[i].length}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Referer": "https://translate.google.com/",
        },
      });
      if (!res.ok) {
        return json(
          { error: `TTS provider error (${res.status}) on chunk ${i + 1}/${parts.length}` },
          502,
        );
      }
      buffers.push(new Uint8Array(await res.arrayBuffer()));
    }

    const total = buffers.reduce((n, b) => n + b.length, 0);
    if (total < 200) return json({ error: "TTS returned no audio" }, 502);
    const merged = new Uint8Array(total);
    let off = 0;
    for (const b of buffers) { merged.set(b, off); off += b.length; }

    return json({
      audio_b64: bytesToBase64(merged),
      mime: "audio/mpeg",
      chunks: parts.length,
      chars: text.length,
    });
  } catch (e) {
    return json({ error: `Server error: ${(e as Error).message}` }, 500);
  }
});
