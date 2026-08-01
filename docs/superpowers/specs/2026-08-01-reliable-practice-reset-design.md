# Reliable Practice Reset Design

## Goal

Make “Reset All Progress” permanently clear practice-related state without allowing old local or cloud records to reappear. Exam history remains intact. Also correct the discovered exam-score display mismatch and upload completed exams promptly.

## Scope

Reset deletes only:

- question progress, including attempts, incorrect status, bookmarks, and notes;
- saved positions for sequential, incorrect, and bookmarked practice modes.

Reset does not delete exam sessions. No visual redesign is included.

## Chosen Approach

Use a server-authored, monotonically increasing integer generation. A new `practice_progress_state` row stores the current `generation` for each user. Every cloud `question_progress` and `practice_resume` row carries the generation in which it was written. An authenticated PostgreSQL function performs the reset atomically: it increments the generation, deletes `question_progress`, and deletes `practice_resume` in one transaction. Database triggers and the reset function acquire the same owner-scoped transaction advisory lock, so reset and practice writes cannot overlap for one user.

Each browser stores the newest generation it has applied. Before authenticated practice synchronization, it compares the cloud generation with its local generation. A newer cloud generation causes that browser to clear all local practice progress and replace its practice resume with an empty resume before normal merge synchronization runs. Clearing all local practice state avoids clock-skew errors.

Database RLS and a write-guard trigger require every inserted or updated practice row to carry the user’s current generation. Therefore, a stale tab or device that fetched generation 3 before a reset advances it to 4 cannot upsert generation-3 rows after the reset; the database rejects them even if the client-side queues are independent.

## Database Design

Add `public.practice_progress_state`:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `generation integer not null default 0 check (generation >= 0)`

Enable RLS. Authenticated users may select only their own row. Explicitly revoke direct insert, update, and delete privileges from `anon` and `authenticated`; the reset RPC is the sole mutation path.

Add `reset_generation integer not null default 0` to both `question_progress` and `practice_resume`. Their insert and update RLS checks require `reset_generation` to equal the caller’s current generation, treating a missing state row as generation 0. Existing rows migrate safely with generation 0. The frontend decodes generations as numbers and accepts only non-negative safe integers.

Add a `BEFORE INSERT OR UPDATE` write-guard trigger to both practice tables. The trigger:

1. Acquires an exclusive transaction advisory lock derived deterministically from `user_id`.
2. Reads the current generation, defaulting to 0.
3. Rejects the row when `reset_generation` does not match.

The advisory lock is held until transaction completion. The reset function acquires the identical lock before incrementing the generation or deleting rows. If a write wins the lock, it commits before reset and is then deleted; if reset wins, the later stale write observes the new generation and is rejected. Hash collisions may serialize unrelated users but cannot violate correctness.

Add `public.reset_practice_progress()`:

1. Reject unauthenticated callers.
2. Acquire the same owner-scoped transaction advisory lock used by the write-guard triggers.
3. Atomically insert generation 1 or increment the existing generation and return it. The conflict update derives the new value from the current row, so concurrent resets cannot move the generation backwards or reuse a generation.
4. Delete the caller’s `question_progress` rows.
5. Delete the caller’s `practice_resume` row.
6. Return the new generation.

The function uses definer rights with an explicit empty search path, derives the target user only from `auth.uid()`, and is executable only by the `authenticated` role. Execution is revoked from `public` and `anon`. Its owner is the only role allowed to mutate the generation table. Existing client DELETE policies may remain, but the application reset path uses only the RPC.

Both the canonical schema and an incremental migration will contain the new database objects.

## Local Persistence

Upgrade the Dexie database with an owner-keyed `practiceProgressState` table containing `ownerId` and `generation`.

Repository operations will:

- read the locally applied generation, defaulting to 0;
- save a newer generation;
- atomically clear owner-scoped question progress, replace the owner’s practice resume with `createEmptyPracticeResume(ownerId)`, and record the applied generation.

Exam-session tables are not touched.

## Synchronization and Concurrency

Introduce one owner-scoped practice-operation queue shared by initial synchronization, practice-page background synchronization, and reset. This serializes sync and reset within a browser tab, preventing an in-flight sync from upserting stale records after reset.

Before a queued authenticated practice sync:

1. Fetch the remote generation, defaulting to 0 when no state row exists.
2. Compare it numerically with the locally applied generation.
3. If it is newer, atomically clear local practice progress, install an empty resume, and record the generation.
4. Continue with the existing resume and question-progress merge, tagging every remote write with the fetched generation.

If a queued sync write is rejected because its generation became stale, it does not retry the stale payload. A later normal sync fetches the newer generation, clears stale local practice data, and proceeds from the new empty generation.

Reset runs through the same queue:

1. Call the atomic Supabase RPC and check its returned error.
2. Only after RPC success, clear local practice data and record the returned generation atomically.
3. Update React state and refresh the dashboard.

If the RPC fails, local state remains unchanged and the user receives an error message. This prevents a local-only reset from being undone by the next cloud sync.

Anonymous reset remains local-only because no cloud identity exists.

## Exam Corrections

`ExamSession.score` remains a percentage from 0 to 100. The dashboard will display it directly as a percentage instead of dividing it by the number of questions a second time.

After saving a completed authenticated exam locally, the exam page will trigger Supabase exam synchronization. A sync failure does not discard the local exam and is logged for a later retry. Exam synchronization is independent of the practice reset queue because reset intentionally preserves exams.

## Error Handling

- Every Supabase query or RPC used by reset must inspect the returned `error` value.
- Failed remote reset leaves both local practice data and the local generation unchanged.
- Background progress and exam sync failures preserve local data and remain retryable.
- Invalid or missing reset RPC data is treated as reset failure.

## Tests

Add tests that prove:

- the schema and migration define generation columns, reset-state RLS, a restricted RPC, and generation checks on practice writes;
- applying a newer remote generation clears only local question progress and practice resume, preserving exam sessions;
- an equal or older generation does not clear current local practice data;
- a stale-generation cloud write is rejected after reset;
- concurrent reset calls produce strictly increasing generations;
- an overlapping stale write and reset serialize so no stale row survives;
- owner-scoped queued operations execute sequentially;
- reset failure does not clear local data;
- successful reset records the server generation and leaves an empty practice resume;
- dashboard exam scores use percentage semantics;
- completed authenticated exams request background synchronization.

Run the full unit suite, lint, and production build after the focused red-green cycles.

## Deployment

The migration must be applied to the live Supabase project before deploying the frontend that calls the RPC. If the frontend ships first, reset will fail safely and retain existing local data rather than pretending to succeed.
