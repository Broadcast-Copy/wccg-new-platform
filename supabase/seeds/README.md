# seeds/ — content that must NOT live in this repository

This repository is **public on GitHub**. The members-only Broadcast Copy guides
(`bc_docs`, migration `114_bc_docs.sql`) are readable only by signed-in accounts,
so their text is kept out of git entirely. `.gitignore` here refuses any `.sql` or
`.md` except this file, so a seed copied in by mistake stays untracked.

## Where the content lives

On the Production PC, outside every repository, in the `bc-member-docs` folder
that sits beside this repository's main checkout (the same `dev` folder):

```
dev\bc-member-docs\
  docs.json            slug, section, title, summary - the order is the sort order
  guides\<slug>.md     one guide body each (markdown the dashboard renders)
  build-seed.mjs       node build-seed.mjs -> bc_docs.seed.sql + proof-phrases.json
  bc_docs.seed.sql     the seed: an idempotent upsert on slug
```

`build-seed.mjs` refuses a guide that names a station, a machine, an IP, a path,
an e-mail address, a cart number or a price, or that links anywhere but
`/docs?d=<existing slug>` or https.

## Apply (integrator)

1. Migration first: `114_bc_docs.sql` via MCP `apply_migration`, name `114_bc_docs`.
2. Then the seed, as data: run the contents of `bc_docs.seed.sql` (MCP `execute_sql`,
   or the SQL editor). It ends with a check that raises unless all guides are
   published. Re-running it changes nothing unless a guide changed, and it never
   clears a `video` set in the database.

After that the database is the live copy: a platform admin can edit rows directly
(the `bc_docs_admin_write` policy). Re-running the seed overwrites those edits
with the files, so edit the files and re-seed, or edit the rows and stop seeding.

## Review note for 114_bc_docs.sql (no local Postgres on this PC)

It was not executed anywhere. Checked by hand and by a lexer (statements, quoting,
parentheses: 18 statements, no problems; the seed: 4 statements, 61 dollar-quoted
bodies, no problems):

- Only objects that already exist are referenced: `public.update_updated_at_column()`
  (used by 096/097/103-105) and `public.is_platform_admin()` (085, granted to
  `authenticated`), plus `auth.role()` and `gen_random_uuid()`.
- Idempotent like 096/097: `create table if not exists`, `drop ... if exists` before
  every trigger and policy, one transaction.
- Anonymous: no policy, and `revoke all ... from anon`, so PostgREST answers
  `permission denied` before RLS is consulted. Authenticated: `select` where
  `is_published`; writes only through `bc_docs_admin_write` (platform admins).
  TRUNCATE / REFERENCES / TRIGGER are not granted to `authenticated` (Supabase's
  default grant is ALL; this narrows it).
- The admin policy is `for all`, so admins can also read unpublished drafts; the
  dashboard asks for `is_published = true` anyway, so admins see what members see.
- The `on conflict (slug) do update ... where (...) is distinct from (...)` in the
  seed uses the unique constraint on `slug`; the BEFORE UPDATE trigger stamps
  `updated_at` only for rows that really change.
- Checks to run after applying: as anon,
  `GET /rest/v1/bc_docs?select=slug` must fail (401/permission denied); as any
  signed-in user it returns the published slugs; `select count(*) from bc_docs`
  as the service role equals the seed's count.
