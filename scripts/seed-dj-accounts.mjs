#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/seed-dj-accounts.mjs
 *
 * Creates a Supabase auth user for each DJ in the WCCG roster with a
 * temporary password of `hotter1045!`, then links the auth user back to the
 * matching public.djs row via djs.user_id.
 *
 * Run AFTER applying migration 015_dj_roster_v2.sql (so the djs rows exist).
 *
 * Required env vars:
 *   SUPABASE_URL                  — your project URL
 *   SUPABASE_SERVICE_ROLE_KEY     — service-role key. NEVER commit. NEVER ship to web/.
 *
 * Optional:
 *   TEMP_PASSWORD                 — override the default `hotter1045!`
 *   DRY_RUN=1                     — print what would happen but don't create users
 *
 * Usage:
 *   SUPABASE_URL=https://lmoqvvkhibfiwudgdopb.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/seed-dj-accounts.mjs
 *
 * The script is idempotent:
 *   - DJs whose email already has an auth account are NOT recreated.
 *   - djs.user_id is set only when currently NULL (won't overwrite linkage).
 */

import { createClient } from '@supabase/supabase-js';

// Roster source-of-truth. Keep in sync with migration 015_dj_roster_v2.sql.
// `slug` must match djs.slug. `email` is the login. `real_name` and `phone`
// are stored in user_metadata for convenience (not required for auth).
const DJS = [
  { slug: 'dj-spin-wiz',     email: 'fleetdjspinwiz@gmail.com',      real_name: 'Nakia McLauglin',       phone: '910-302-0692' },
  { slug: 'dj-dane-dinero',  email: 'danedinero@icloud.com',         real_name: 'Dana Daniels',          phone: '919-721-4910' },
  { slug: 'dj-weezy',        email: 'weezy.fleetdjs@gmail.com',      real_name: 'Dwayne Smith',          phone: '910-574-0790' },
  { slug: 'dj-jay-b',        email: 'jermainebright08@yahoo.com',    real_name: 'Jermaine Bright',       phone: '910-986-3999' },
  { slug: 'dj-rayn',         email: 'deejrayn@gmail.com',            real_name: 'Clarence Morrow',       phone: '910-988-2271' },
  { slug: 'dj-daddy-black',  email: 'djdaddyblack005@gmail.com',     real_name: 'Keith Black',           phone: '919-799-1262' },
  { slug: 'dj-crisco',       email: 'Cirsco1@gmail.com',             real_name: 'Chris Kennard',         phone: '910-813-6513' },
  { slug: 'dj-tommy-gee',    email: 'tommygeemixx@gmail.com',        real_name: 'George Wall',           phone: '996-517-9382' },
  { slug: 'dj-yodo',         email: 'Theyodoshow@gmail.com',         real_name: 'Antoine Hill',          phone: '910-920-7124' },
  { slug: 'dj-whosane',      email: 'kotcokeboydjwhosane@gmail.com', real_name: 'Julio Rodriguez',       phone: '910-705-6062' },
  { slug: 'dj-ricoveli',     email: 'djricoveli@gmail.com',          real_name: 'DreShawn Spearman',     phone: '910-676-4646' },
  { slug: 'dj-daffie',       email: 'djdaffiebookings@gmail.com',    real_name: 'Iton Anderson',         phone: '516-667-9701' },
  { slug: 'dj-yafeelme',     email: 'Reggielee3rd@gmail.com',        real_name: 'Reggie Lee',            phone: '984-233-3427' },
  { slug: 'dj-ike-gda',      email: 'djikegdamusic@gmail.com',       real_name: 'Isaiah Griffin',        phone: '910-527-0783' },
  { slug: 'dj-chuck',        email: 'c_murphy00@yahoo.com',          real_name: 'Charles Murphy',        phone: '910-578-8432' },
  { slug: 'dj-official',     email: 'danielwilliams05@gmail.com',    real_name: 'Daniel Williams',       phone: '910-489-9097' },
  { slug: 'dj-tone-lo',      email: 'booktonelo@gmail.com',          real_name: 'Tony Albrooks',         phone: '910-725-9941' },
  { slug: 'dj-itanist',      email: 'itanmeade@gmail.com',           real_name: 'Itan Meade',            phone: '754-610-5479' },
  { slug: 'dj-izzy-nice',    email: 'unitsinthecity@gmail.com',      real_name: 'Michael Miller',        phone: '980-457-4517' },
  { slug: 'dj-killako',      email: 'Djkillako2017@gmail.com',       real_name: 'James Buie',            phone: '910-549-9868' },
  { slug: 'dj-kingviv',      email: 'Kingviv93@gmail.com',           real_name: 'Vivian Smith',          phone: '910-703-0631' },
  { slug: 'dj-t-money',      email: 'Djtmoney910@gmail.com',         real_name: 'Anthony Dudley',        phone: '910-728-2597' },
  { slug: 'dj-swayzee',      email: 'Ewynn22@gmail.com',             real_name: 'Erik Wynn',             phone: '843-475-5122' },
  { slug: 'dj-lou-diamonds', email: 'ruggedlocks@gmail.com',         real_name: 'Luis Maymi',            phone: '910-978-8713' },
  { slug: 'dj-ljay',         email: 'Djlj242@gmail.com',              real_name: 'Lawrence Hepburn',      phone: '786-545-6697' },
  { slug: 'dj-wolf',         email: 'Djwolfcp4life@gmail.com',       real_name: 'Nathaniel B. Mention',  phone: '914-413-4486' },
  { slug: 'dj-juice',        email: 'Im_juice@icloud.com',           real_name: 'Dominique Hosley',      phone: '910-988-2896' },
  { slug: 'dj-tony-neal',    email: 'tnealmusic@gmail.com',          real_name: 'Tony Neal',             phone: '305-780-3113' },
  { slug: 'dj-kvng',         email: 'youngkvngonthebeat@gmail.com',  real_name: 'Terry Hollingshed',     phone: '478-464-4014' },
  { slug: 'dj-drop',         email: 'djdropnc@gmail.com',            real_name: 'Justin Lesesne',        phone: '919-980-2134' },
  { slug: 'dj-chuck-t',      email: 'djchuckt@gmail.com',            real_name: 'David Thrower',         phone: '843-568-0036' },
  { slug: 'dj-vi',           email: 'Djvi914@gmail.com',             real_name: null,                    phone: '845-518-3600' },
  { slug: 'dj-corleone',     email: 'cjgarris3@hotmail.com',         real_name: 'Charles Garris',        phone: '202-705-5180' },
];

const TEMP_PASSWORD = process.env.TEMP_PASSWORD || 'hotter1045!';
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

function lc(s) { return (s || '').toLowerCase(); }

async function fetchAllAuthUsers(sb) {
  // The admin API paginates; for ~33 DJs and a small-medium project, pulling
  // everyone in batches of 1000 is fine and lets us match by email cheaply.
  const byEmail = new Map();
  let page = 1;
  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers page=${page}: ${error.message}`);
    const users = data?.users || [];
    for (const u of users) {
      if (u.email) byEmail.set(lc(u.email), u);
    }
    if (users.length < 1000) break;
    page++;
    if (page > 50) break; // safety
  }
  return byEmail;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  console.log(`Seeding ${DJS.length} DJ accounts (DRY_RUN=${DRY_RUN ? 'yes' : 'no'})…\n`);

  // Verify the djs table is reachable and contains the expected slugs.
  const slugs = DJS.map(d => d.slug);
  const { data: djRows, error: djErr } = await sb.from('djs').select('slug, user_id').in('slug', slugs);
  if (djErr) {
    console.error(`FATAL: couldn't read public.djs — ${djErr.message}`);
    console.error('Did you apply migration 015_dj_roster_v2.sql yet?');
    process.exit(1);
  }
  const djMap = new Map((djRows || []).map(r => [r.slug, r]));
  const missingSlugs = slugs.filter(s => !djMap.has(s));
  if (missingSlugs.length) {
    console.error(`FATAL: ${missingSlugs.length} slug(s) missing from public.djs:\n  ${missingSlugs.join('\n  ')}`);
    console.error('Apply migration 015_dj_roster_v2.sql first.');
    process.exit(1);
  }

  const authByEmail = await fetchAllAuthUsers(sb);

  let created = 0, linked = 0, skipped = 0, alreadyLinked = 0, errors = 0;

  for (const dj of DJS) {
    const dbRow = djMap.get(dj.slug);
    const existing = authByEmail.get(lc(dj.email));
    let authId = existing?.id;

    if (existing) {
      console.log(`= ${dj.slug.padEnd(18)} auth exists (${authId.slice(0, 8)}…) — skipping create`);
      skipped++;
    } else if (DRY_RUN) {
      console.log(`+ ${dj.slug.padEnd(18)} WOULD create ${dj.email}`);
      continue;
    } else {
      const { data, error } = await sb.auth.admin.createUser({
        email: dj.email,
        password: TEMP_PASSWORD,
        email_confirm: true,
        user_metadata: {
          dj_slug: dj.slug,
          real_name: dj.real_name,
          phone: dj.phone,
          must_change_password: true,
        },
      });
      if (error) {
        console.warn(`! ${dj.slug.padEnd(18)} createUser failed — ${error.message}`);
        errors++;
        continue;
      }
      authId = data.user.id;
      created++;
      console.log(`+ ${dj.slug.padEnd(18)} created ${authId.slice(0, 8)}…`);
    }

    // Link djs.user_id when currently NULL.
    if (dbRow.user_id) {
      if (dbRow.user_id === authId) {
        alreadyLinked++;
      } else {
        console.warn(`! ${dj.slug.padEnd(18)} djs.user_id=${dbRow.user_id.slice(0,8)}… ≠ auth id ${authId?.slice(0,8)}…; leaving as-is`);
      }
      continue;
    }

    if (DRY_RUN) {
      console.log(`  ${dj.slug.padEnd(18)} WOULD link djs.user_id → ${authId.slice(0, 8)}…`);
      continue;
    }

    const { error: linkErr } = await sb
      .from('djs')
      .update({ user_id: authId, updated_at: new Date().toISOString() })
      .eq('slug', dj.slug)
      .is('user_id', null);
    if (linkErr) {
      console.warn(`! ${dj.slug.padEnd(18)} link failed — ${linkErr.message}`);
      errors++;
    } else {
      linked++;
    }
  }

  console.log('\n──────────────────────────────────────');
  console.log(`created       ${created}`);
  console.log(`skipped       ${skipped}  (auth account already existed)`);
  console.log(`linked        ${linked}   (djs.user_id set)`);
  console.log(`alreadyLinked ${alreadyLinked}`);
  console.log(`errors        ${errors}`);
  console.log('──────────────────────────────────────');
  if (errors) process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
