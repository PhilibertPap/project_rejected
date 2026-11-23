-- 002: new result names, custom cards, journal replies

-- Results: accepted / rejected / choked
alter table public.attempts drop constraint attempts_result_check;
alter table public.attempts add constraint attempts_result_check
  check (result in ('accepted', 'rejected', 'choked'));

-- User-written cards
create table public.custom_cards (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title      text not null,
  body       text not null default '',
  difficulty smallint not null check (difficulty between 1 and 5),
  created_at timestamptz not null default now()
);

alter table public.custom_cards enable row level security;
revoke all on public.custom_cards from anon;
grant select, insert, update, delete on public.custom_cards to authenticated;

create policy custom_cards_own on public.custom_cards for all to authenticated
using (user_id = auth.uid() and public.is_approved())
with check (user_id = auth.uid() and public.is_approved());

-- Replies to journal entries
create table public.replies (
  id         bigint generated always as identity primary key,
  recap_id   bigint not null references public.recaps(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

alter table public.replies enable row level security;
revoke all on public.replies from anon;
grant select, insert, delete on public.replies to authenticated;

-- Visible if you can see the entry (own entry, or public profile)
create policy replies_read on public.replies for select to authenticated
using (public.is_approved() and exists (select 1 from public.recaps r where r.id = recap_id));

create policy replies_insert on public.replies for insert to authenticated
with check (user_id = auth.uid() and public.is_approved()
            and exists (select 1 from public.recaps r where r.id = recap_id));

create policy replies_delete_own on public.replies for delete to authenticated
using (user_id = auth.uid());
