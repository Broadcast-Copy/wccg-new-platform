-- 086_curb_public_bucket_listing.sql
-- Stop anonymous clients from ENUMERATING (listing) files in public buckets.
-- All six buckets are public=true, so object access via getPublicUrl (the CDN
-- public path) is unaffected — only the storage list/select API is narrowed
-- from anon→authenticated. The app never lists these buckets as an anon user
-- (all access is getPublicUrl / createSignedUrl / upload).
alter policy "avatars_public_read" on storage.objects to authenticated;
alter policy "Videos public read" on storage.objects to authenticated;
alter policy "dj_mixes_public_read" on storage.objects to authenticated;
alter policy "post-media public read" on storage.objects to authenticated;
alter policy "sermons bucket public read" on storage.objects to authenticated;
alter policy "DJ drops public read" on storage.objects to authenticated;
