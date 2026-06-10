-- 069_toggle_like_rpc_admin_policies
-- Applied live 2026-06-09 via MCP apply_migration (same name).
-- Backend halves of the frontend fixes from the platform audit.

-- 1) Atomic like-toggle. SECURITY DEFINER is required: RLS (correctly) blocks
--    non-authors from updating hub_posts.likes_count, which is why the old
--    client-side read-modify-write silently no-op'd for cross-user likes.
create or replace function public.hub_post_toggle_like(p_post_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_deleted int;
  v_count int;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  delete from hub_post_likes
   where post_id = p_post_id and user_id = v_uid;
  get diagnostics v_deleted = row_count;

  if v_deleted = 0 then
    insert into hub_post_likes (post_id, user_id)
    values (p_post_id, v_uid)
    on conflict (post_id, user_id) do nothing;
  end if;

  update hub_posts
     set likes_count = (select count(*) from hub_post_likes where post_id = p_post_id)
   where id = p_post_id
   returning likes_count into v_count;

  if v_count is null then
    raise exception 'post not found';
  end if;

  return v_count;
end;
$$;

revoke execute on function public.hub_post_toggle_like(uuid) from public, anon;
grant execute on function public.hub_post_toggle_like(uuid) to authenticated;

-- 2) gift_cards: admins manage the program, so they must see all cards
--    (codes are bearer secrets — admin-only, NOT staff-wide).
CREATE POLICY "Admins can view all gift cards" ON public.gift_cards
  FOR SELECT TO authenticated USING (is_admin());

-- 3) productions: the moderation queue needs admins to list + review everyone's
--    submissions (additive permissive policies; owner-scoped paths unchanged).
CREATE POLICY "Admins can view all productions" ON public.productions
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can update all productions" ON public.productions
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
