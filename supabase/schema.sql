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
  updated_at timestamptz not null,
  synced_at timestamptz,
  primary key (user_id, question_id)
);

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
