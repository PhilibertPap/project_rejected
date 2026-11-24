-- 008: teams (replace the global feed). Max 7 members, one team per player.
-- Public team = listed, players send a join request (any member accepts).
-- Private team = invite link only. The invite link joins directly.
-- Shared journal entries (is_public) and attempts are visible to teammates only.

create table public.teams (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(name) between 2 and 30),
  is_public   boolean not null default true,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  invite_code text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 10),
  created_at  timestamptz not null default now()
);

create table public.team_members (
  user_id   uuid primary key references public.profiles(id) on delete cascade,  -- one team per player
  team_id   bigint not null references public.teams(id) on delete cascade,
  joined_at timestamptz not null default now()
);
create index team_members_team on public.team_members (team_id);

create table public.team_requests (
  team_id    bigint not null references public.teams(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- Helpers
create or replace function public.my_team() returns bigint
language sql stable security definer set search_path = '' as $$
  select team_id from public.team_members where user_id = auth.uid();
$$;

create or replace function public.same_team(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members a join public.team_members b on a.team_id = b.team_id
                 where a.user_id = auth.uid() and b.user_id = u);
$$;

create or replace function public.team_size(t bigint) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.team_members where team_id = t;
$$;

-- Read access (writes only through the functions below). invite_code is not readable directly.
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_requests enable row level security;
revoke all on public.teams, public.team_members, public.team_requests from anon, authenticated;
grant select (id, name, is_public, owner_id, created_at) on public.teams to authenticated;
grant select on public.team_members, public.team_requests to authenticated;

create policy teams_read on public.teams for select to authenticated
using (public.is_admin() or (public.is_approved() and (is_public or id = public.my_team())));
create policy team_members_read on public.team_members for select to authenticated
using (public.is_admin() or (public.is_approved() and team_id = public.my_team()));
create policy team_requests_read on public.team_requests for select to authenticated
using (public.is_admin() or user_id = auth.uid() or (public.is_approved() and team_id = public.my_team()));

-- Teammates see each other's attempts and shared entries (replaces "everyone sees public entries")
drop policy if exists attempts_public_read on public.attempts;
create policy attempts_team_read on public.attempts for select to authenticated
using (public.is_approved() and public.same_team(user_id));

drop policy if exists recaps_public_read on public.recaps;
create policy recaps_team_read on public.recaps for select to authenticated
using (public.is_approved() and is_public and public.same_team(user_id));
create policy recaps_admin_read on public.recaps for select to authenticated
using (public.is_admin() and is_public);

-- Actions
create or replace function public.create_team(team_name text, public_team boolean) returns bigint
language plpgsql security definer set search_path = '' as $$
declare t bigint;
begin
  if not public.is_approved() then raise exception 'Account not approved'; end if;
  if public.my_team() is not null then raise exception 'You are already in a team. Leave it first.'; end if;
  insert into public.teams (name, is_public, owner_id) values (trim(team_name), public_team, auth.uid()) returning id into t;
  insert into public.team_members (user_id, team_id) values (auth.uid(), t);
  delete from public.team_requests where user_id = auth.uid();
  return t;
end; $$;

create or replace function public.join_team(code text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare t bigint;
begin
  if not public.is_approved() then raise exception 'Account not approved'; end if;
  select id into t from public.teams where invite_code = code;
  if t is null then raise exception 'This invite link is not valid anymore.'; end if;
  if public.my_team() = t then return t; end if;
  if public.my_team() is not null then raise exception 'You are already in a team. Leave it first.'; end if;
  if public.team_size(t) >= 7 then raise exception 'This team is full (7 players).'; end if;
  insert into public.team_members (user_id, team_id) values (auth.uid(), t);
  delete from public.team_requests where user_id = auth.uid();
  return t;
end; $$;

create or replace function public.request_team(t bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_approved() then raise exception 'Account not approved'; end if;
  if public.my_team() is not null then raise exception 'You are already in a team. Leave it first.'; end if;
  if not exists (select 1 from public.teams where id = t and is_public) then raise exception 'Team not found'; end if;
  if public.team_size(t) >= 7 then raise exception 'This team is full (7 players).'; end if;
  insert into public.team_requests (team_id, user_id) values (t, auth.uid()) on conflict do nothing;
end; $$;

create or replace function public.cancel_request(t bigint) returns void
language sql security definer set search_path = '' as $$
  delete from public.team_requests where team_id = t and user_id = auth.uid();
$$;

-- Any member can accept or decline
create or replace function public.answer_request(target uuid, accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare t bigint := public.my_team();
begin
  if t is null or not exists (select 1 from public.team_requests where team_id = t and user_id = target) then
    raise exception 'Request not found'; end if;
  delete from public.team_requests where team_id = t and user_id = target;
  if accept then
    if public.team_size(t) >= 7 then raise exception 'The team is full (7 players).'; end if;
    if exists (select 1 from public.team_members where user_id = target) then raise exception 'Already in a team'; end if;
    insert into public.team_members (user_id, team_id) values (target, t);
    delete from public.team_requests where user_id = target;
  end if;
end; $$;

-- Leaving: the oldest member becomes owner; the last one out deletes the team
create or replace function public.leave_team() returns void
language plpgsql security definer set search_path = '' as $$
declare t bigint := public.my_team(); nxt uuid;
begin
  if t is null then return; end if;
  delete from public.team_members where user_id = auth.uid();
  select user_id into nxt from public.team_members where team_id = t order by joined_at limit 1;
  if nxt is null then delete from public.teams where id = t;
  else update public.teams set owner_id = nxt where id = t and owner_id = auth.uid(); end if;
end; $$;

-- Owner only: rename, public/private, remove a member, new invite link
create or replace function public.update_team(team_name text, public_team boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.teams set name = trim(team_name), is_public = public_team where id = public.my_team() and owner_id = auth.uid();
  if not found then raise exception 'Only the team owner can do that.'; end if;
end; $$;

create or replace function public.remove_member(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.teams where id = public.my_team() and owner_id = auth.uid()) or target = auth.uid() then
    raise exception 'Only the team owner can do that.'; end if;
  delete from public.team_members where user_id = target and team_id = public.my_team();
end; $$;

create or replace function public.new_invite_code() returns text
language plpgsql security definer set search_path = '' as $$
declare c text := substr(md5(random()::text || clock_timestamp()::text), 1, 10);
begin
  update public.teams set invite_code = c where id = public.my_team() and owner_id = auth.uid();
  if not found then raise exception 'Only the team owner can do that.'; end if;
  return c;
end; $$;

create or replace function public.my_invite_code() returns text
language sql stable security definer set search_path = '' as $$
  select invite_code from public.teams where id = public.my_team();
$$;

-- Public teams with room, for "Find a team"
create or replace function public.list_teams()
returns table (id bigint, name text, members int, requested boolean)
language sql stable security definer set search_path = '' as $$
  select t.id, t.name, public.team_size(t.id),
         exists (select 1 from public.team_requests r where r.team_id = t.id and r.user_id = auth.uid())
  from public.teams t
  where public.is_approved() and t.is_public and public.team_size(t.id) < 7
  order by t.created_at desc limit 50;
$$;

-- Invite landing page, also before sign-up
create or replace function public.team_by_code(code text)
returns table (name text, members int)
language sql stable security definer set search_path = '' as $$
  select t.name, public.team_size(t.id) from public.teams t where t.invite_code = code;
$$;

revoke execute on function public.my_team(), public.same_team(uuid), public.team_size(bigint),
  public.create_team(text, boolean), public.join_team(text), public.request_team(bigint), public.cancel_request(bigint),
  public.answer_request(uuid, boolean), public.leave_team(), public.update_team(text, boolean), public.remove_member(uuid),
  public.new_invite_code(), public.my_invite_code(), public.list_teams(), public.team_by_code(text) from public;
grant execute on function public.my_team(), public.same_team(uuid), public.team_size(bigint),
  public.create_team(text, boolean), public.join_team(text), public.request_team(bigint), public.cancel_request(bigint),
  public.answer_request(uuid, boolean), public.leave_team(), public.update_team(text, boolean), public.remove_member(uuid),
  public.new_invite_code(), public.my_invite_code(), public.list_teams(), public.team_by_code(text) to authenticated;
grant execute on function public.team_by_code(text) to anon;
