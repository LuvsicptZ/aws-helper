create policy "Users can delete their own question progress"
  on public.question_progress
  for delete
  using (auth.uid() = user_id);

create policy "Users can delete their own practice resume"
  on public.practice_resume
  for delete
  using (auth.uid() = user_id);
