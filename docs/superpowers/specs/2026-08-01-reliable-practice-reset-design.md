# Reliable Practice Reset Design

## Goal

Make “Reset All Progress” permanently clear practice-related state without allowing old local or cloud records to reappear. Exam history remains intact. Also correct the discovered exam-score display mismatch and upload completed exams promptly.

## Scope

Reset deletes only:

- question progress, including attempts, incorrect status, bookmarks, and notes;
- saved positions for sequential, incorrect, and bookmarked practice modes.

Reset does not delete exam sessions. No visual redesign is included.

## Chosen Approach

Use a server-authored reset generation represented by a timestamp. A new `practice_progress_state` row stores the latest `reset_at` for each user. An authenticated PostgreSQL function performs the reset atomically: it advances `reset_at`, deletes `question_progress`, and deletes `practice_resume` in one transaction.

Each browser stores the newest reset marker it has applied. Before authenticated practice synchronization, it compares the cloud marker with its local marker. A newer cloud marker causes that browser to clear all local practice progress and replace its practice resume with an empty resume before normal merge synchronization runs. Clearing all local practice state, rather than comparing client timestamps, avoids clock-skew errors and guarantees that an old offline browser cannot resurrect pre-reset data.

## Database Design

Add `public.practice_progress_state`:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `reset_at timestamptz not null`

Enable RLS. Authenticated users may select, insert, and update only their own row. Direct deletion is unnecessary.

Add `public.reset_practice_progress()`:

1. Reject unauthenticated callers.
2. Generate the reset timestamp on the database server.
3. Upsert the caller’s `practice_progress_state` row.
4. Delete the caller’s `question_progress` rows.
5. Delete the caller’s `practice_resume` row.
6. Return the reset timestamp.

The function uses invoker rights, an explicit empty search path, and is executable only by the `authenticated` role. The existing question-progress and practice-resume DELETE policies remain in place so the invoker-rights function can delete those rows.

Both the canonical schema and an incremental migration will contain the new database objects.

## Local Persistence

Upgrade the Dexie database with an owner-keyed `practiceProgressState` table containing `ownerId` and `resetAt`.

Repository operations will:

- read the locally applied reset marker;
- save a newer marker;
- atomically clear owner-scoped question progress, replace the owner’s practice resume, and record the applied marker.

Exam-session tables are not touched.

## Synchronization and Concurrency

Introduce one owner-scoped practice-operation queue shared by initial synchronization, practice-page background synchronization, and reset. This serializes sync and reset within a browser tab, preventing an in-flight sync from upserting stale records after reset.

Before a queued authenticated practice sync:

1. Fetch the remote reset marker.
2. Compare it with the locally applied marker.
3. If it is newer, atomically clear local practice progress, install an empty resume, and record the marker.
4. Continue with the existing resume and question-progress merge.

Reset runs through the same queue:

1. Call the atomic Supabase RPC and check its returned error.
2. Only after RPC success, clear local practice data and record the returned marker atomically.
3. Update React state and refresh the dashboard.

If the RPC fails, local state remains unchanged and the user receives an error message. This prevents a local-only reset from being undone by the next cloud sync.

Anonymous reset remains local-only because no cloud identity exists.

## Exam Corrections

`ExamSession.score` remains a percentage from 0 to 100. The dashboard will display it directly as a percentage instead of dividing it by the number of questions a second time.

After saving a completed authenticated exam locally, the exam page will trigger Supabase exam synchronization. A sync failure does not discard the local exam and is logged for a later retry. Exam synchronization is independent of the practice reset queue because reset intentionally preserves exams.

## Error Handling

- Every Supabase query or RPC used by reset must inspect the returned `error` value.
- Failed remote reset leaves both local practice data and the local reset marker unchanged.
- Background progress and exam sync failures preserve local data and remain retryable.
- Invalid or missing reset RPC data is treated as reset failure.

## Tests

Add tests that prove:

- the schema and migration define the reset-state table, RLS, restricted RPC, and existing DELETE policies;
- applying a newer remote marker clears only local question progress and practice resume, preserving exam sessions;
- an equal or older marker does not clear current local practice data;
- owner-scoped queued operations execute sequentially;
- reset failure does not clear local data;
- successful reset records the server marker and leaves an empty practice resume;
- dashboard exam scores use percentage semantics;
- completed authenticated exams request background synchronization.

Run the full unit suite, lint, and production build after the focused red-green cycles.

## Deployment

The migration must be applied to the live Supabase project before deploying the frontend that calls the RPC. If the frontend ships first, reset will fail safely and retain existing local data rather than pretending to succeed.
