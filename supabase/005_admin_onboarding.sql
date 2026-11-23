-- 005: last seen, onboarding flag, richer admin data

alter table public.profiles add column last_seen_at timestamptz;
alter table public.profiles add column onboarded boolean not null default false;
grant update (onboarded) on public.profiles to authenticated;

-- Called by the app on load: marks the user as seen now
create or replace function public.touch() returns void
language sql security definer set search_path = '' as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;
revoke execute on function public.touch() from public, anon;
grant execute on function public.touch() to authenticated;

-- Admin user list (return type changes, so drop first)
drop function public.admin_users();
create function public.admin_users()
returns table (id uuid, username text, approved boolean, is_public boolean, onboarded boolean,
               created_at timestamptz, last_sign_in_at timestamptz, last_seen_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.approved, p.is_public, p.onboarded, p.created_at, u.last_sign_in_at, p.last_seen_at
  from public.profiles p join auth.users u on u.id = p.id
  where public.is_admin() and not p.is_admin
  order by p.created_at;
$$;

-- Admin: per-user counts (no private content, just numbers)
create or replace function public.admin_user_stats()
returns table (user_id uuid, entries_public int, entries_private int, custom_cards int,
               reactions_given int, reactions_received int, replies_given int, replies_received int,
               last_entry_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id,
    (select count(*) from public.recaps r where r.user_id = p.id and r.is_public)::int,
    (select count(*) from public.recaps r where r.user_id = p.id and not r.is_public)::int,
    (select count(*) from public.custom_cards c where c.user_id = p.id)::int,
    (select count(*) from public.reactions x where x.user_id = p.id)::int,
    (select count(*) from public.reactions x join public.recaps r on r.id = x.recap_id where r.user_id = p.id)::int,
    (select count(*) from public.replies y where y.user_id = p.id)::int,
    (select count(*) from public.replies y join public.recaps r on r.id = y.recap_id where r.user_id = p.id)::int,
    (select max(r.created_at) from public.recaps r where r.user_id = p.id)
  from public.profiles p
  where public.is_admin() and not p.is_admin;
$$;

revoke execute on function public.admin_users(), public.admin_user_stats() from public, anon;
grant execute on function public.admin_users(), public.admin_user_stats() to authenticated;

-- Admin can read custom card titles (not journal entries)
create policy custom_cards_admin_read on public.custom_cards for select to authenticated
using (public.is_admin());
