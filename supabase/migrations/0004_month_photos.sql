-- 달마다 바뀌는 달력 사진 { "01": "data:image/jpeg;base64,...", ... }
alter table public.couples add column if not exists month_photos jsonb not null default '{}'::jsonb;

-- 한 달 사진만 바꾸는 함수 (두 사람이 동시에 바꿔도 서로 덮어쓰지 않게)
create or replace function public.set_month_photo(p_month text, p_photo text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid := public.my_couple_id();
begin
  if v_id is null then raise exception '커플 공간이 없어요'; end if;
  if p_month !~ '^(0[1-9]|1[0-2])$' then raise exception '잘못된 달이에요'; end if;
  if p_photo is null then
    update public.couples set month_photos = month_photos - p_month where id = v_id;
  else
    update public.couples set month_photos = jsonb_set(month_photos, array[p_month], to_jsonb(p_photo)) where id = v_id;
  end if;
end $$;
