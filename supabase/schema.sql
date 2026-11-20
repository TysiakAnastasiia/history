-- Виконати в Supabase: SQL Editor -> New query -> Run
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  xp int not null default 0,
  blitz_record int not null default 0,
  settings jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
create table if not exists attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  item_id text not null,
  game text not null,
  correct boolean not null,
  created_at timestamptz not null default now()
);
create table if not exists lesson_progress (
  user_id uuid references auth.users on delete cascade,
  section_id text,
  read_at timestamptz not null default now(),
  primary key (user_id, section_id)
);
create table if not exists favorites (
  user_id uuid references auth.users on delete cascade,
  fact_id text,
  created_at timestamptz not null default now(),
  primary key (user_id, fact_id)
);

alter table profiles enable row level security;
alter table attempts enable row level security;
alter table lesson_progress enable row level security;
alter table favorites enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "own attempts" on attempts;
create policy "own attempts" on attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own lessons" on lesson_progress;
create policy "own lessons" on lesson_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own favorites" on favorites;
create policy "own favorites" on favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Доступ для Data API. У нових проєктах Supabase таблиці не відкриваються автоматично.
-- Залогінений користувач працює зі своїми рядками (решту відсікає RLS вище).
grant select, insert, update, delete on profiles, attempts, lesson_progress, favorites to authenticated;
-- Анонімний доступ лише на читання profiles: для keepalive-запиту. RLS однаково поверне 0 рядків.
grant select on profiles to anon;
