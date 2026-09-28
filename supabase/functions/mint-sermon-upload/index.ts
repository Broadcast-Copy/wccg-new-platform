import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// DISABLED 2026-09-28 (owner + Jev 0.95): this was a TEMPORARY bulk-import helper
// (sermon archive, Tony Neal mixes, DJ bios) whose shared secret sat in the public
// repository, so anyone could mint uploads, insert dj_drops rows or set DJ bios.
// Every call is refused. The weekly DJ-mix pipeline uses the studio-sync function
// and is unaffected. Sermons and mixes reaching each church's / DJ's profile is
// being built as a proper, secured path (PRD-OPEN A21).
Deno.serve(() =>
  new Response(
    JSON.stringify({ error: "gone", message: "mint-sermon-upload was a temporary import helper and is disabled." }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  )
);
