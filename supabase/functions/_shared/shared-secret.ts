// Shared-secret gate for the secret-gated edge functions (studio-sync,
// dj-setup-link, wiki-generate, notify-sync). The value lives ONLY in the
// function environment, never in code (PRD-OPEN U3(d)/(h), 2026-09-28):
//
//   <PREFIX>_SECRET          the current secret (at least 32 characters)
//   <PREFIX>_LEGACY_SECRET   the previous secret, accepted ONLY while
//   <PREFIX>_ACCEPT_LEGACY   is exactly "1" -- the cutover switch.
//
// scripts/rotate-shared-secrets.ps1 sets a new <PREFIX>_SECRET with the old one
// as <PREFIX>_LEGACY_SECRET and the switch on, verifies every caller on the new
// one, then turns the switch off; `-Rollback` turns it back on. Secrets set with
// `supabase secrets set` apply to the next invocation, no redeploy needed.

export type SecretMatch = "current" | "legacy";

export interface SecretGate {
  /** false when neither a usable current secret nor an enabled legacy one is set */
  configured: boolean;
  /** which configured secret the caller presented, or null */
  match: SecretMatch | null;
}

const MIN_LEN = 32;

/** Constant-time string compare (no early exit on the first differing byte). */
export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  const n = Math.max(ea.length, eb.length);
  for (let i = 0; i < n; i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

function envValue(name: string): string {
  return (Deno.env.get(name) ?? "").trim();
}

export function checkSecret(prefix: string, given: unknown): SecretGate {
  const current = envValue(`${prefix}_SECRET`);
  const legacy = envValue(`${prefix}_LEGACY_SECRET`);
  const legacyOn = envValue(`${prefix}_ACCEPT_LEGACY`) === "1";
  const currentOk = current.length >= MIN_LEN;
  const legacyOk = legacyOn && legacy.length >= MIN_LEN && legacy !== current;
  const presented = typeof given === "string" ? given : "";
  let match: SecretMatch | null = null;
  if (presented) {
    if (currentOk && safeEqual(presented, current)) match = "current";
    else if (legacyOk && safeEqual(presented, legacy)) match = "legacy";
  }
  return { configured: currentOk || legacyOk, match };
}
