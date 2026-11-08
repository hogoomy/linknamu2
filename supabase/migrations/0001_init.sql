-- 우리집 플래너 초기 스키마
-- Supabase 대시보드 > SQL Editor 에 붙여넣어 실행하거나 `supabase db push` 로 적용하세요.

create extension if not exists pgcrypto;

-- ───────────────────────── 테이블 ─────────────────────────
create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  color text not null default '#f97362',
  couple_id uuid references public.couples (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  title text not null,
  date date not null,
  end_date date,
  start_time time,
  end_time time,
  owner_id uuid references public.profiles (id) on delete set null, -- null = 함께
  memo text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists events_couple_date_idx on public.events (couple_id, date);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  title text not null,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  assignee_id uuid references public.profiles (id) on delete set null, -- null = 함께
  due_date date,
  status text not null default 'requested' check (status in ('requested', 'in_progress', 'done')),
  done_at timestamptz,
  memo text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists tasks_couple_due_idx on public.tasks (couple_id, due_date);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── 헬퍼 ─────────────────────────
create or replace function public.my_couple_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select couple_id from public.profiles where id = auth.uid() $$;

-- 가입 시 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 커플 공간 만들기 → 초대 코드 반환
create or replace function public.create_couple()
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_code text;
  v_id uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요해요'; end if;
  select c.invite_code into v_code
    from public.couples c join public.profiles p on p.couple_id = c.id
   where p.id = auth.uid();
  if v_code is not null then return v_code; end if;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.couples (invite_code) values (v_code) returning id into v_id;
  update public.profiles set couple_id = v_id where id = auth.uid();
  return v_code;
end $$;

-- 초대 코드로 참여 (최대 2명)
create or replace function public.join_couple(p_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
  v_count int;
begin
  if auth.uid() is null then raise exception '로그인이 필요해요'; end if;
  select id into v_id from public.couples where invite_code = upper(trim(p_code));
  if v_id is null then raise exception '초대 코드를 찾을 수 없어요'; end if;
  select count(*) into v_count from public.profiles where couple_id = v_id and id <> auth.uid();
  if v_count >= 2 then raise exception '이미 두 사람이 연결된 공간이에요'; end if;
  update public.profiles set couple_id = v_id where id = auth.uid();
  return v_id;
end $$;

-- ───────────────────────── RLS ─────────────────────────
alter table public.couples enable row level security;
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.tasks enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "couple read" on public.couples;
create policy "couple read" on public.couples
  for select using (id = public.my_couple_id());

drop policy if exists "profile read" on public.profiles;
create policy "profile read" on public.profiles
  for select using (id = auth.uid() or couple_id = public.my_couple_id());
drop policy if exists "profile update self" on public.profiles;
create policy "profile update self" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and couple_id is not distinct from public.my_couple_id());

drop policy if exists "events all" on public.events;
create policy "events all" on public.events
  for all using (couple_id = public.my_couple_id())
  with check (couple_id = public.my_couple_id());

drop policy if exists "tasks all" on public.tasks;
create policy "tasks all" on public.tasks
  for all using (couple_id = public.my_couple_id())
  with check (couple_id = public.my_couple_id());

drop policy if exists "push own" on public.push_subscriptions;
create policy "push own" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────────────────────── 실시간 ─────────────────────────
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.profiles;
