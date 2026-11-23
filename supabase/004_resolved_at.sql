-- 004: timestamp when a card is resolved (used by the hidden skill: fast = confident)
alter table public.attempts add column resolved_at timestamptz;

create or replace function public.set_resolved_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.result is not null and old.result is null then
    new.resolved_at := now();
  end if;
  return new;
end; $$;

create trigger attempts_resolved_at
before update on public.attempts
for each row execute function public.set_resolved_at();
