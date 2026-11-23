-- 006: admin can delete posts (public journal entries) and replies
create policy recaps_admin_delete on public.recaps for delete to authenticated using (public.is_admin());
create policy replies_admin_delete on public.replies for delete to authenticated using (public.is_admin());
