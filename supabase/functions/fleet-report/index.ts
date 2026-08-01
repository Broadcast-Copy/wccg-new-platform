// fleet-report: read-only fleet summary for monitoring agents.
//
// WHY THIS EXISTS
// A Buzz agent needs to read the plant. The two ways to reach Supabase directly
// are the anon key (needs a user account, so an email identity per station) and
// the service-role key (bypasses RLS entirely -- never give that to a chat
// agent). This is the third way: the FUNCTION holds the service key, the agent
// holds only a token, and the function can do exactly one thing with it.
//
// verify_jwt is DISABLED on purpose: callers are agents with a shared token, not
// Supabase users. Authentication is implemented below instead.
//
// THE RULE THAT KEEPS THIS SAFE
// This must never become a general query proxy. It accepts a station id and
// returns bc_fleet_report(). It takes no SQL, no table name, no column list, no
// filter. The moment it accepts any of those it stops being a narrow endpoint
// and becomes a service-role key with extra steps.
import { createClient } from "jsr:@supabase/supabase-js@2";

/** Constant-time compare so a wrong token cannot be discovered byte by byte. */
function tokensMatch(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  // TRIMMED on purpose. A secret pasted into a dashboard field routinely picks
  // up a trailing newline or space, and an untrimmed compare then fails as a
  // flat 401 -- indistinguishable from a wrong token, and genuinely hard to
  // diagnose because both sides look identical to the eye.
  const expected = (Deno.env.get("FLEET_AGENT_TOKEN") ?? "").trim();

  // FAIL CLOSED. An unset secret means the endpoint is unconfigured, not that
  // everyone is welcome. The on-prem hub's /report fails OPEN on a missing
  // token and that is a wart, not a pattern to copy.
  if (expected.length < 16) {
    return json(
      { error: "not configured", detail: "FLEET_AGENT_TOKEN is unset or too short" },
      503,
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const supplied = (auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "").trim();

  if (!tokensMatch(supplied, expected)) {
    // Length hints only, never the values. Enough to tell "wrong token" from
    // "token arrived mangled", which is the difference between five minutes and
    // an hour of debugging.
    return json(
      {
        error: "unauthorized",
        supplied_length: supplied.length,
        expected_length: expected.length,
        hint: supplied.length === 0
          ? "no bearer token in the Authorization header"
          : supplied.length !== expected.length
            ? "length mismatch -- the stored secret and the sent token are different strings"
            : "same length, different content",
      },
      401,
    );
  }

  let body: { station_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }

  const station = (body.station_id ?? "").trim();
  // Shape check only -- the real authority is that bc_fleet_report returns rows
  // for this station or nothing. This just rejects obvious junk early.
  if (!station || station.length > 64 || !/^[a-z0-9_-]+$/.test(station)) {
    return json({ error: "station_id required" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await admin.rpc("bc_fleet_report", { p_station: station });
  if (error) return json({ error: "report failed", detail: error.message }, 500);

  // A caller reading this must phrase staleness as "the cloud has not heard from
  // this machine", never "the machine is down". The on-prem hub is
  // authoritative and a studio can lose its WAN link and be perfectly healthy.
  return json({
    ok: true,
    read_only: true,
    staleness_note:
      "last_seen is when the CLOUD last heard from the machine. It is not machine health. The on-prem hub is authoritative.",
    report: data,
  });
});
