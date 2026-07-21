
/**
 * produce-voice — free, no-key neural TTS for the Production Studio.
 *
 * Speaks the script with Microsoft Edge's online neural voices (the Azure neural
 * catalog: hundreds of voices across many accents + genders). Free, no API key.
 * SSML prosody controls rate / pitch / volume.
 *
 * The service is a WebSocket. Deno's built-in WebSocket client can't set the
 * Origin/User-Agent headers the endpoint requires, so we do the WS handshake +
 * framing manually over Deno.connectTls. Returns { audio_b64 } (mp3).
 *
 * Requires a logged-in caller (verify_jwt on + getUser check).
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const TRUSTED = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const CHROMIUM_FULL = "143.0.3650.75";
const WIN_EPOCH = 11644473600;
const HOST = "speech.platform.bing.com";

async function secMsGec(): Promise<string> {
  let ticks = Date.now() / 1000 + WIN_EPOCH;
  ticks -= ticks % 300;
  ticks *= 1e7;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ticks.toFixed(0)}${TRUSTED}`));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const jsDate = () => new Date().toUTCString().replace("GMT", "GMT+0000 (Coordinated Universal Time)");

function buildSsml(text: string, voice: string, rate: string, pitch: string, volume: string): string {
  return (
    "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>" +
    `<voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}' volume='${volume}'>` +
    xmlEscape(text) + "</prosody></voice></speak>"
  );
}

// ---- minimal WebSocket client over TLS -------------------------------------

function encodeFrame(opcode: number, payload: Uint8Array): Uint8Array {
  const len = payload.length;
  let header: number[];
  if (len < 126) header = [0x80 | opcode, 0x80 | len];
  else if (len < 65536) header = [0x80 | opcode, 0x80 | 126, (len >> 8) & 0xff, len & 0xff];
  else {
    header = [0x80 | opcode, 0x80 | 127, 0, 0, 0, 0, (len >>> 24) & 0xff, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff];
  }
  const mask = crypto.getRandomValues(new Uint8Array(4));
  const out = new Uint8Array(header.length + 4 + len);
  out.set(header, 0);
  out.set(mask, header.length);
  for (let i = 0; i < len; i++) out[header.length + 4 + i] = payload[i] ^ mask[i & 3];
  return out;
}

async function synth(text: string, voice: string, rate: string, pitch: string, volume: string): Promise<Uint8Array> {
  const gec = await secMsGec();
  const path =
    `/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED}` +
    `&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=1-${CHROMIUM_FULL}`;
  const conn = await Deno.connectTls({ hostname: HOST, port: 443 });
  try {
    const key = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
    const handshake =
      `GET ${path} HTTP/1.1\r\nHost: ${HOST}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
      `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n` +
      `Origin: chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold\r\n` +
      `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0\r\n` +
      `Pragma: no-cache\r\nCache-Control: no-cache\r\n\r\n`;
    await conn.write(new TextEncoder().encode(handshake));

    // buffered reader
    let buf = new Uint8Array(0);
    const rbuf = new Uint8Array(16384);
    const pull = async (): Promise<boolean> => {
      const n = await conn.read(rbuf);
      if (n === null) return false;
      const merged = new Uint8Array(buf.length + n);
      merged.set(buf, 0); merged.set(rbuf.subarray(0, n), buf.length);
      buf = merged;
      return true;
    };

    // read handshake response headers
    while (true) {
      const idx = indexOfCRLFCRLF(buf);
      if (idx >= 0) {
        const head = new TextDecoder().decode(buf.subarray(0, idx));
        if (!/HTTP\/1\.1 101/.test(head)) throw new Error("handshake: " + head.split("\r\n")[0]);
        buf = buf.subarray(idx + 4);
        break;
      }
      if (!(await pull())) throw new Error("handshake: connection closed");
    }

    // send config + ssml as masked text frames
    const cfg =
      `X-Timestamp:${jsDate()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
      '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n';
    const reqId = crypto.randomUUID().replace(/-/g, "");
    const ssml =
      `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${jsDate()}Z\r\nPath:ssml\r\n\r\n` +
      buildSsml(text, voice, rate, pitch, volume);
    await conn.write(encodeFrame(0x1, new TextEncoder().encode(cfg)));
    await conn.write(encodeFrame(0x1, new TextEncoder().encode(ssml)));

    // read frames
    const audio: Uint8Array[] = [];
    while (true) {
      const frame = tryReadFrame(buf);
      if (!frame) { if (!(await pull())) break; continue; }
      buf = frame.rest;
      if (frame.opcode === 0x8) break; // close
      if (frame.opcode === 0x9) { await conn.write(encodeFrame(0xa, frame.payload)); continue; } // ping->pong
      if (frame.opcode === 0x1) { // text
        if (new TextDecoder().decode(frame.payload).includes("Path:turn.end")) break;
      } else if (frame.opcode === 0x2) { // binary audio
        const p = frame.payload;
        if (p.length >= 2) {
          const headerLen = (p[0] << 8) | p[1];
          if (p.length > 2 + headerLen) audio.push(p.subarray(2 + headerLen));
        }
      }
    }
    const total = audio.reduce((n, a) => n + a.length, 0);
    const merged = new Uint8Array(total);
    let o = 0; for (const a of audio) { merged.set(a, o); o += a.length; }
    return merged;
  } finally {
    try { conn.close(); } catch { /* */ }
  }
}

function indexOfCRLFCRLF(b: Uint8Array): number {
  for (let i = 0; i + 3 < b.length; i++)
    if (b[i] === 13 && b[i + 1] === 10 && b[i + 2] === 13 && b[i + 3] === 10) return i;
  return -1;
}

function tryReadFrame(b: Uint8Array): { opcode: number; payload: Uint8Array; rest: Uint8Array } | null {
  if (b.length < 2) return null;
  const opcode = b[0] & 0x0f;
  const masked = (b[1] & 0x80) !== 0;
  let len = b[1] & 0x7f;
  let off = 2;
  if (len === 126) { if (b.length < 4) return null; len = (b[2] << 8) | b[3]; off = 4; }
  else if (len === 127) {
    if (b.length < 10) return null;
    len = 0; for (let i = 2; i < 10; i++) len = len * 256 + b[i];
    off = 10;
  }
  const maskLen = masked ? 4 : 0;
  if (b.length < off + maskLen + len) return null;
  let payload = b.subarray(off + maskLen, off + maskLen + len);
  if (masked) {
    const mask = b.subarray(off, off + 4);
    const copy = new Uint8Array(len);
    for (let i = 0; i < len; i++) copy[i] = payload[i] ^ mask[i & 3];
    payload = copy;
  }
  return { opcode, payload, rest: b.subarray(off + maskLen + len) };
}

function b64(bytes: Uint8Array): string {
  let bin = ""; const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) bin += String.fromCharCode(...bytes.subarray(i, i + step));
  return btoa(bin);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {

    const body = await req.json().catch(() => ({}));
    const text = (body.text ?? "").toString().trim();
    const voice = (body.voice ?? "en-US-GuyNeural").toString();
    const rate = (body.rate ?? "+0%").toString();
    const pitch = (body.pitch ?? "+0Hz").toString();
    const volume = (body.volume ?? "+0%").toString();
    if (!text) return json({ error: "Missing script text" }, 400);
    if (text.length > 2800) return json({ error: "Script too long (max 2800 characters)." }, 400);
    if (!/^[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural$/.test(voice)) return json({ error: "Invalid voice" }, 400);
    if (!/^[+-]\d{1,3}%$/.test(rate) || !/^[+-]\d{1,3}Hz$/.test(pitch) || !/^[+-]\d{1,3}%$/.test(volume))
      return json({ error: "Invalid prosody" }, 400);

    const audio = await synth(text, voice, rate, pitch, volume);
    if (audio.length < 200) return json({ error: "No audio produced" }, 502);
    return json({ audio_b64: b64(audio), mime: "audio/mpeg", bytes: audio.length });
  } catch (e) {
    return json({ error: `Server error: ${(e as Error).message}` }, 500);
  }
});
