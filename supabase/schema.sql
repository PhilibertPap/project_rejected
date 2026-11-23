-- project_rejected : schéma de base
-- À coller dans Supabase > SQL Editor > New query > Run

-- ========== PROFILS ==========
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  approved   boolean not null default false,  -- validé par l'admin
  is_admin   boolean not null default false,
  is_public  boolean not null default false,  -- récaps visibles par les autres
  created_at timestamptz not null default now()
);

-- Crée le profil automatiquement à l'inscription
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (new.id, lower(new.raw_user_meta_data ->> 'username'));
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Fonctions utilitaires
create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select approved from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Validation d'un compte (admin uniquement)
create or replace function public.approve_user(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'réservé à l''admin';
  end if;
  update public.profiles set approved = true where id = target;
end; $$;

revoke execute on function public.approve_user(uuid) from public, anon;
grant execute on function public.approve_user(uuid) to authenticated;

-- Règles d'accès
alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()                                   -- son propre profil
  or public.is_admin()                              -- l'admin voit tout
  or (public.is_approved() and approved and is_public)  -- profils publics
);

create policy profiles_update_own on public.profiles
for update to authenticated
using (id = auth.uid() and public.is_approved())
with check (id = auth.uid());

-- Un utilisateur ne peut modifier que is_public (pas approved / is_admin)
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (is_public) on public.profiles to authenticated;

-- ========== DÉFIS TENTÉS ==========
create table public.attempts (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  day          date not null,
  challenge_id text,                -- id dans challenges.json, null = défi perso
  title        text not null,
  difficulty   smallint not null check (difficulty between 1 and 5),
  result       text check (result in ('success', 'rejected', 'skipped')),  -- null = carte tirée, pas encore jouée
  created_at   timestamptz not null default now()
);

-- ========== RÉCAPS DU SOIR ==========
create table public.recaps (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  day        date not null,
  body       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

alter table public.attempts enable row level security;
alter table public.recaps   enable row level security;

revoke all on public.attempts, public.recaps from anon;
grant select, insert, update, delete on public.attempts, public.recaps to authenticated;

-- Ses propres données : lecture / écriture si compte validé
create policy attempts_own on public.attempts for all to authenticated
using (user_id = auth.uid() and public.is_approved())
with check (user_id = auth.uid() and public.is_approved());

create policy recaps_own on public.recaps for all to authenticated
using (user_id = auth.uid() and public.is_approved())
with check (user_id = auth.uid() and public.is_approved());

-- Données des profils publics : lecture seule
create policy attempts_public_read on public.attempts for select to authenticated
using (public.is_approved() and exists (
  select 1 from public.profiles p where p.id = user_id and p.approved and p.is_public));

create policy recaps_public_read on public.recaps for select to authenticated
using (public.is_approved() and exists (
  select 1 from public.profiles p where p.id = user_id and p.approved and p.is_public));
