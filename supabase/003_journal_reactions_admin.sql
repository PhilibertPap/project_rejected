-- 003: per-entry visibility, reactions, admin overview

-- Profiles: public by default (= default visibility of journal entries)
alter table public.profiles alter column is_public set default true;
update public.profiles set is_public = true;

-- Any approved user can see other approved usernames (needed for the feed)
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin() or (public.is_approved() and approved));

-- Journal: as many private entries as you want, max one public entry per day
alter table public.recaps drop constraint recaps_user_id_day_key;
alter table public.recaps add column is_public boolean not null default false;
create unique index recaps_one_public_per_day on public.recaps (user_id, day) where is_public;

drop policy recaps_public_read on public.recaps;
create policy recaps_public_read on public.recaps for select to authenticated
using (public.is_approved() and is_public);

-- Attempts of a day are visible if the author published that day
drop policy attempts_public_read on public.attempts;
create policy attempts_public_read on public.attempts for select to authenticated
using (public.is_approved() and exists (
  select 1 from public.recaps r
  where r.user_id = attempts.user_id and r.day = attempts.day and r.is_public));

-- Reactions: thumbs up / strong arm
create table public.reactions (
  recap_id   bigint not null references public.recaps(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('thumbs', 'strong')),
  created_at timestamptz not null default now(),
  primary key (recap_id, user_id, kind)
);

alter table public.reactions enable row level security;
revoke all on public.reactions from anon;
grant select, insert, delete on public.reactions to authenticated;

create policy reactions_read on public.reactions for select to authenticated
using (public.is_approved() and exists (select 1 from public.recaps r where r.id = recap_id));

create policy reactions_insert on public.reactions for insert to authenticated
with check (user_id = auth.uid() and public.is_approved()
            and exists (select 1 from public.recaps r where r.id = recap_id));

create policy reactions_delete_own on public.reactions for delete to authenticated
using (user_id = auth.uid());

-- Admin: read all attempts, list users with last sign-in, refuse (delete) accounts
create policy attempts_admin_read on public.attempts for select to authenticated
using (public.is_admin());

create or replace function public.admin_users()
returns table (id uuid, username text, approved boolean, created_at timestamptz, last_sign_in_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.approved, p.created_at, u.last_sign_in_at
  from public.profiles p join auth.users u on u.id = p.id
  where public.is_admin() and not p.is_admin
  order by p.created_at;
$$;

create or replace function public.reject_user(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if exists (select 1 from public.profiles where id = target and is_admin) then
    raise exception 'cannot remove an admin';
  end if;
  delete from auth.users where id = target;   -- cascades to profile, attempts, entries...
end; $$;

revoke execute on function public.admin_users(), public.reject_user(uuid) from public, anon;
grant execute on function public.admin_users(), public.reject_user(uuid) to authenticated;
