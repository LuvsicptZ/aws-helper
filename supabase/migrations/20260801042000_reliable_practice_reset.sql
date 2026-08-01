create table if not exists public.practice_progress_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  generation integer not null default 0 check (generation >= 0)
);

alter table public.question_progress
  add column if not exists reset_generation integer not null default 0;

alter table public.practice_resume
  add column if not exists reset_generation integer not null default 0;

alter table public.practice_progress_state enable row level security;

revoke all on table public.practice_progress_state from anon, authenticated;
grant select on table public.practice_progress_state to authenticated;

drop policy if exists "Users can read their own practice generation"
  on public.practice_progress_state;
create policy "Users can read their own practice generation"
  on public.practice_progress_state
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own question progress"
  on public.question_progress;
create policy "Users can insert their own question progress"
  on public.question_progress
  for insert
  with check (
    auth.uid() = user_id
    and reset_generation = coalesce(
      (
        select generation
        from public.practice_progress_state
        where user_id = auth.uid()
      ),
      0
    )
  );

drop policy if exists "Users can update their own question progress"
  on public.question_progress;
create policy "Users can update their own question progress"
  on public.question_progress
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and reset_generation = coalesce(
      (
        select generation
        from public.practice_progress_state
        where user_id = auth.uid()
      ),
      0
    )
  );

drop policy if exists "Users can insert their own practice resume"
  on public.practice_resume;
create policy "Users can insert their own practice resume"
  on public.practice_resume
  for insert
  with check (
    auth.uid() = user_id
    and reset_generation = coalesce(
      (
        select generation
        from public.practice_progress_state
        where user_id = auth.uid()
      ),
      0
    )
  );

drop policy if exists "Users can update their own practice resume"
  on public.practice_resume;
create policy "Users can update their own practice resume"
  on public.practice_resume
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and reset_generation = coalesce(
      (
        select generation
        from public.practice_progress_state
        where user_id = auth.uid()
      ),
      0
    )
  );

create or replace function public.guard_practice_reset_generation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_generation integer;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'practice data owner does not match authenticated user'
      using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.user_id::text, 0)
  );

  select generation
  into current_generation
  from public.practice_progress_state
  where user_id = new.user_id;

  if new.reset_generation <> coalesce(current_generation, 0) then
    raise exception 'stale practice generation'
      using errcode = '40001';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_practice_reset_generation()
  from public, anon, authenticated;

drop trigger if exists guard_question_progress_generation
  on public.question_progress;
create trigger guard_question_progress_generation
  before insert or update on public.question_progress
  for each row execute function public.guard_practice_reset_generation();

drop trigger if exists guard_practice_resume_generation
  on public.practice_resume;
create trigger guard_practice_resume_generation
  before insert or update on public.practice_resume
  for each row execute function public.guard_practice_reset_generation();

create or replace function public.reset_practice_progress()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  next_generation integer;
begin
  if caller_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text, 0)
  );

  insert into public.practice_progress_state (user_id, generation)
  values (caller_id, 1)
  on conflict (user_id) do update
    set generation = public.practice_progress_state.generation + 1
  returning generation into next_generation;

  delete from public.question_progress where user_id = caller_id;
  delete from public.practice_resume where user_id = caller_id;

  return next_generation;
end;
$$;

revoke execute on function public.reset_practice_progress() from public, anon;
grant execute on function public.reset_practice_progress() to authenticated;
