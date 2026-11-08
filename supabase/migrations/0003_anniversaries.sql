-- 처음 만난 날 / 결혼한 날 (D-day 표시)
alter table public.couples add column if not exists met_on date;
alter table public.couples add column if not exists married_on date;
grant update (met_on, married_on) on public.couples to authenticated;
