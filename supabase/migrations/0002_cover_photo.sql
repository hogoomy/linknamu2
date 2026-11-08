-- 커플 커버 사진 (작게 줄인 JPEG data URL) + 두 사람 모두 수정 가능
alter table public.couples add column if not exists cover_photo text;

drop policy if exists "couple update" on public.couples;
create policy "couple update" on public.couples
  for update using (id = public.my_couple_id()) with check (id = public.my_couple_id());

-- 초대 코드는 바꾸지 못하게 cover_photo 컬럼만 수정 허용
revoke update on public.couples from authenticated;
grant update (cover_photo) on public.couples to authenticated;

alter publication supabase_realtime add table public.couples;
