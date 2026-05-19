-- Pages reference table (604 rows, seeded separately)
create table if not exists pages (
  page_number integer primary key,
  juz integer not null,
  hizb integer not null,
  surah_name text not null,
  first_ayah text not null,
  last_ayah text not null
);

-- Ayah text cache
create table if not exists ayah_cache (
  page_number integer not null references pages(page_number),
  ayah_key text not null,
  text_uthmani text not null,
  primary key (page_number, ayah_key)
);

-- User progress per page
create table if not exists user_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page_number integer not null references pages(page_number),
  status text not null check (status in ('learning', 'recent', 'memorised')),
  strength float not null default 2.5,
  interval_days integer not null default 1,
  repetitions integer not null default 0,
  next_review_date date not null default current_date,
  last_reviewed_at timestamptz,
  unique (user_id, page_number)
);

-- Sessions
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('memorisation', 'revision')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_pages integer not null default 0
);

-- Per-page ratings within a session
create table if not exists session_ratings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  page_number integer not null references pages(page_number),
  rating text check (rating in ('strong', 'okay', 'weak')),
  reps_with_mushaf integer not null default 0,
  reps_from_memory integer not null default 0,
  reps_revision integer not null default 0
);

-- User settings
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_target text not null default 'half'
    check (daily_target in ('quarter', 'half', 'one', 'two')),
  memorisation_reps_mushaf integer not null default 12,
  memorisation_reps_memory integer not null default 8,
  recent_cycle_days integer not null default 3,
  notifications_enabled boolean not null default true,
  daily_reminder_time time not null default '08:00'
);

-- Row Level Security
alter table user_pages enable row level security;
alter table sessions enable row level security;
alter table session_ratings enable row level security;
alter table user_settings enable row level security;
alter table pages enable row level security;
alter table ayah_cache enable row level security;

create policy "Users manage own pages" on user_pages
  for all using (auth.uid() = user_id);

create policy "Users manage own sessions" on sessions
  for all using (auth.uid() = user_id);

create policy "Users manage own ratings" on session_ratings
  for all using (
    session_id in (select id from sessions where user_id = auth.uid())
  );

create policy "Users manage own settings" on user_settings
  for all using (auth.uid() = user_id);

create policy "Public read pages" on pages for select using (true);
create policy "Public read ayah_cache" on ayah_cache for select using (true);
