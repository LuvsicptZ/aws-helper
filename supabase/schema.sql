create table if not exists public.question_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id integer not null,
  attempts integer not null default 0,
  correct_attempts integer not null default 0,
  last_selected text[] not null default '{}',
  last_result text check (last_result in ('correct', 'incorrect')),
  marked_guessed boolean not null default false,
  bookmarked boolean not null default false,
  note text not null default '',
  marked_guessed_updated_at timestamptz,
  bookmarked_updated_at timestamptz,
  note_updated_at timestamptz,
  updated_at timestamptz not null,
  synced_at timestamptz,
  primary key (user_id, question_id)
);

alter table public.question_progress
  add column if not exists marked_guessed_updated_at timestamptz,
  add column if not exists bookmarked_updated_at timestamptz,
  add column if not exists note_updated_at timestamptz;

alter table public.question_progress enable row level security;

create policy "Users can read their own question progress"
  on public.question_progress
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own question progress"
  on public.question_progress
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own question progress"
  on public.question_progress
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.exam_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  question_ids integer[] not null,
  started_at timestamptz not null,
  submitted_at timestamptz,
  duration_seconds integer not null,
  answers jsonb not null default '{}'::jsonb,
  score integer,
  primary key (user_id, id)
);

alter table public.exam_sessions enable row level security;

create policy "Users can read their own exam sessions"
  on public.exam_sessions
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own exam sessions"
  on public.exam_sessions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own exam sessions"
  on public.exam_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.practice_resume (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_mode text not null default 'sequential',
  positions jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.practice_resume enable row level security;

create policy "Users can read their own practice resume"
  on public.practice_resume
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own practice resume"
  on public.practice_resume
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own practice resume"
  on public.practice_resume
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
