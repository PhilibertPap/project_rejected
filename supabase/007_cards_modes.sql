-- 007: cards live in the database (editable from the admin), story / situation modes

create table public.cards (
  id         text primary key,                 -- d1..d30 story, sun1..sun5 sunday, s-<place>-<slug> situation
  mode       text not null check (mode in ('story', 'sunday', 'situation')),
  title      text not null,
  body       text not null default '',
  tip        text,
  difficulty smallint not null check (difficulty between 1 and 5),
  place      text check (place in ('class','library','cafe','street','shop','transport','party','gym','home')),
  duo        boolean not null default false,
  tone       text not null default 'serious' check (tone in ('serious', 'fun')),
  crush      boolean not null default false,
  day        smallint,                          -- story order
  week       smallint,                          -- story week (sunday variants too)
  checkpoint boolean not null default false,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cards enable row level security;
revoke all on public.cards from anon;
grant select, insert, update, delete on public.cards to authenticated;

create policy cards_read on public.cards for select to authenticated using (public.is_approved());
create policy cards_admin_insert on public.cards for insert to authenticated with check (public.is_admin());
create policy cards_admin_update on public.cards for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy cards_admin_delete on public.cards for delete to authenticated using (public.is_admin());

-- Attempts know their mode; old non-story attempts become situation
alter table public.attempts add column mode text not null default 'story' check (mode in ('story', 'situation'));
alter table public.attempts add column duo boolean not null default false;
update public.attempts set mode = 'situation' where challenge_id is null or challenge_id !~ '^(d[0-9]+|sun[0-9]+)$';

-- Admin: set a player's result on a story card (null result = clear it)
create or replace function public.admin_set_story(target uuid, card text, res text, d date)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.cards%rowtype;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select * into c from public.cards where id = card and mode in ('story', 'sunday');
  if not found then raise exception 'unknown story card %', card; end if;
  delete from public.attempts where user_id = target and challenge_id = card;
  if res is not null then
    insert into public.attempts (user_id, day, challenge_id, title, difficulty, result, mode, created_at)
    values (target, d, card, c.title, c.difficulty, res, 'story', (d + time '12:00')::timestamptz);
  end if;
end; $$;
revoke execute on function public.admin_set_story(uuid, text, text, date) from public, anon;
grant execute on function public.admin_set_story(uuid, text, text, date) to authenticated;
