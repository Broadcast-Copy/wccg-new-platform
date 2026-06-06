-- =====================================================================
-- 058_backfill_profile_names
-- Profiles were created with display_name defaulted to the email prefix
-- ("djchuckt", "danedinero"…), so the members directory, chat, and DMs showed
-- cryptic handles instead of real names. Every current profile is linked to a
-- DJ whose display_name is the real stage name ("DJ Chuck T"). Backfill the
-- profile display_name from the linked DJ — but ONLY where the profile name is
-- still a default (single token / blank), so any already-customized multi-word
-- name (e.g. "WCCG 104.5 FM") is preserved. Idempotent: once a name contains a
-- space it won't be touched again. djs.notes is the DJ's LEGAL name, not a bio,
-- so it is deliberately NOT exposed.
-- =====================================================================

update public.profiles p
set display_name = d.display_name,
    updated_at = now()
from public.djs d
where d.user_id = p.id
  and d.display_name is not null
  and btrim(d.display_name) <> ''
  and (
    p.display_name is null
    or btrim(p.display_name) = ''
    or position(' ' in btrim(p.display_name)) = 0
  );
