-- 009: share of asks that got a yes, across all players (shown under the card)
create or replace function public.yes_rate() returns table (asks bigint, yes bigint)
language sql stable security definer set search_path = '' as $$
  select count(*) filter (where a.result in ('accepted', 'rejected')),
         count(*) filter (where a.result = 'accepted')
  from public.attempts a join public.profiles p on p.id = a.user_id
  where public.is_approved() and not p.is_admin;
$$;
revoke execute on function public.yes_rate() from public, anon;
grant execute on function public.yes_rate() to authenticated;
