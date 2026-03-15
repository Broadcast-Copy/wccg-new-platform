import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Stream Transcription Edge Function (Groq Whisper — FREE)
 *
 * Connects to the WCCG Icecast audio stream server-side, buffers ~15s
 * chunks of MP3 audio, sends each chunk to Groq's free Whisper API for
 * transcription, and broadcasts results via Supabase Realtime.
 *
 * Groq free tier: 28,800 audio-seconds/day (8 hours) — more than enough
 * for a 1-hour post-game show. No credit card required.
 *
 * POST /stream-transcription — Start transcription session
 *   Body: { streamUrl?: string, durationMs?: number }
 *
 * The function uses a streaming HTTP response to stay alive for the
 * full duration instead of timing out.
 */

const DEFAULT_STREAM_URL = "https://stream.securenetsystems.net/CIR/WCCG";
const DEFAULT_DURATION_MS = 60 * 60 * 1000; // 1 hour
const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const CHUNK_DURATION_SECS = 15; // Buffer 15 seconds of audio per chunk
// MP3 at 128kbps ≈ 16,000 bytes/sec
const BYTES_PER_SECOND = 16_000;
const CHUNK_SIZE = CHUNK_DURATION_SECS * BYTES_PER_SECOND;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, apikey, x-client-info",
};

/**
 * Send an audio chunk to Groq Whisper for transcription.
 * Returns the transcribed text, or null on failure.
 */
async function transcribeChunk(
  audioData: Uint8Array,
  groqKey: string,
  signal: AbortSignal
): Promise<{ text: string } | null> {
  try {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([audioData], { type: "audio/mpeg" }),
      "chunk.mp3"
    );
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("language", "en");
    formData.append("response_format", "json");

    const resp = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
      },
      body: formData,
      signal,
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.error(`Groq API error ${resp.status}: ${errText}`);
      return null;
    }

    const result = await resp.json();
    const text = (result.text || "").trim();
    return text ? { text } : null;
  } catch (err) {
    if (signal.aborted) return null;
    console.error("Transcribe chunk error:", err);
    return null;
  }
}

// ── Main handler ──
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // ── Validate secrets ──
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (!groqKey) {
    return new Response(
      JSON.stringify({ error: "GROQ_API_KEY not configured. Get a free key at console.groq.com" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ── Parse request body ──
  let streamUrl = DEFAULT_STREAM_URL;
  let durationMs = DEFAULT_DURATION_MS;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.streamUrl) streamUrl = body.streamUrl;
    if (body.durationMs)
      durationMs = Math.min(body.durationMs, 4 * 60 * 60 * 1000);
  } catch {
    // Use defaults
  }

  // ── Set up Supabase client for broadcasting ──
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const channel = supabase.channel("transcription:wccg");
  await channel.subscribe();

  // ── Abort controller for cleanup ──
  const abort = new AbortController();
  const startTime = Date.now();

  // Auto-stop after duration
  const durationTimer = setTimeout(() => abort.abort(), durationMs);

  // ── Use a streaming response to keep the function alive ──
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Keepalive ping every 20 seconds
  const keepalive = setInterval(async () => {
    try {
      await writer.write(encoder.encode(`data: {"keepalive":true}\n\n`));
    } catch {
      // Writer closed
    }
  }, 20_000);

  // ── Main transcription pipeline (runs in background) ──
  (async () => {
    try {
      // 1. Connect to audio stream
      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({ status: "connecting", streamUrl })}\n\n`
        )
      );

      const audioResp = await fetch(streamUrl, {
        signal: abort.signal,
        headers: {
          "User-Agent": "WCCG-Transcription/1.0",
          "Icy-MetaData": "0",
        },
      });

      if (!audioResp.ok || !audioResp.body) {
        throw new Error(`Stream returned ${audioResp.status}`);
      }

      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({ status: "transcribing" })}\n\n`
        )
      );

      // 2. Read audio stream and buffer into chunks
      const reader = audioResp.body.getReader();
      let audioBuffer = new Uint8Array(0);
      let chunkCount = 0;

      while (!abort.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value && value.length > 0) {
          // Append to buffer
          const newBuffer = new Uint8Array(audioBuffer.length + value.length);
          newBuffer.set(audioBuffer);
          newBuffer.set(value, audioBuffer.length);
          audioBuffer = newBuffer;
        }

        // When we have enough audio, send to Groq for transcription
        if (audioBuffer.length >= CHUNK_SIZE) {
          chunkCount++;
          const chunk = audioBuffer.slice(0, CHUNK_SIZE);
          audioBuffer = audioBuffer.slice(CHUNK_SIZE);

          // Transcribe via Groq Whisper (free)
          const result = await transcribeChunk(chunk, groqKey, abort.signal);

          if (result && result.text) {
            const payload = {
              text: result.text,
              isFinal: true,
              timestamp: Date.now(),
              confidence: 1,
              channel: "wccg",
            };

            // Broadcast to all connected clients via Supabase Realtime
            await channel.send({
              type: "broadcast",
              event: "transcript",
              payload,
            });

            // Also send via SSE to the HTTP caller
            await writer.write(
              encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
            );
          }

          // Log progress
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(
            `Chunk #${chunkCount} transcribed (${elapsed}s elapsed): ${result?.text?.slice(0, 60) || "(empty)"}`
          );
        }
      }

      // Transcribe any remaining audio in buffer
      if (audioBuffer.length > BYTES_PER_SECOND * 2 && !abort.signal.aborted) {
        const result = await transcribeChunk(audioBuffer, groqKey, abort.signal);
        if (result && result.text) {
          const payload = {
            text: result.text,
            isFinal: true,
            timestamp: Date.now(),
            confidence: 1,
            channel: "wccg",
          };
          await channel.send({
            type: "broadcast",
            event: "transcript",
            payload,
          });
          await writer.write(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        }
      }

      reader.releaseLock();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (!abort.signal.aborted) {
        console.error("Transcription error:", message);
        try {
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({ status: "error", error: message })}\n\n`
            )
          );
        } catch {
          // Writer already closed
        }
      }
    } finally {
      // Cleanup
      clearTimeout(durationTimer);
      clearInterval(keepalive);
      await channel.unsubscribe();

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      try {
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ status: "stopped", elapsedSeconds: elapsed })}\n\n`
          )
        );
        await writer.close();
      } catch {
        // Writer already closed
      }
    }
  })();

  // Return the streaming response immediately — keeps the function alive
  return new Response(readable, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
