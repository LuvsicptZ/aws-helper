# Reliable Practice Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make authenticated practice reset permanent across tabs and devices while preserving exam history, correcting exam score display, and syncing completed exams promptly.

**Architecture:** PostgreSQL owns a monotonic practice generation and serializes reset/write races with a per-user transaction advisory lock. Dexie stores the last applied generation and clears practice data atomically when it observes a newer one. A shared client queue serializes practice sync and reset in one tab, while database generation checks reject stale cross-tab or cross-device writes.

**Tech Stack:** React 19, TypeScript, Dexie 4, Supabase/PostgreSQL, Vitest, Testing Library.

---

### Task 1: Add the database generation protocol

**Files:**
- Modify: `supabase/schema.sql`
- Create: `supabase/migrations/20260801042000_reliable_practice_reset.sql`
- Modify: `src/tests/supabaseSchema.test.ts`

- [ ] **Step 1: Extend the schema regression test and verify RED**

Assert that both canonical schema and the new migration contain:

```ts
expect(sql).toContain("create table if not exists public.practice_progress_state");
expect(sql).toMatch(/reset_generation integer not null default 0/i);
expect(sql).toContain("pg_advisory_xact_lock");
expect(sql).toContain("create trigger guard_question_progress_generation");
expect(sql).toContain("create trigger guard_practice_resume_generation");
expect(sql).toContain("create or replace function public.reset_practice_progress()");
expect(sql).toContain("revoke execute on function public.reset_practice_progress() from public, anon");
expect(sql).toContain("grant execute on function public.reset_practice_progress() to authenticated");
expect(sql).toMatch(/practice_progress_state[\s\S]*for select[\s\S]*auth\.uid\(\) = user_id/i);
expect(sql).toMatch(/question_progress[\s\S]*for insert[\s\S]*reset_generation/i);
expect(sql).toMatch(/practice_resume[\s\S]*for update[\s\S]*reset_generation/i);
```

Run `npm.cmd test -- --run src/tests/supabaseSchema.test.ts`. Expected: FAIL because generation objects are absent.

- [ ] **Step 2: Implement the migration and canonical schema**

Add:

```sql
create table if not exists public.practice_progress_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  generation integer not null default 0 check (generation >= 0)
);

alter table public.question_progress
  add column if not exists reset_generation integer not null default 0;
alter table public.practice_resume
  add column if not exists reset_generation integer not null default 0;
```

Enable state-table RLS with an owner-only SELECT policy. Revoke direct state mutations from `anon` and `authenticated`, granting authenticated SELECT only.

Create a trigger function that:

```sql
perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(new.user_id::text, 0)
);
select generation into current_generation
from public.practice_progress_state
where user_id = new.user_id;
if new.reset_generation <> coalesce(current_generation, 0) then
  raise exception 'stale practice generation';
end if;
```

Attach it as `BEFORE INSERT OR UPDATE` to `question_progress` and `practice_resume`. Replace their insert/update policies so `reset_generation` must match the owner’s current generation.

Create a `SECURITY DEFINER SET search_path = ''` RPC that validates `auth.uid()`, takes the identical advisory lock, increments the state row with `INSERT ... ON CONFLICT ... DO UPDATE SET generation = practice_progress_state.generation + 1 RETURNING generation`, deletes only question progress and practice resume, and returns the generation. Revoke public/anon execution and grant authenticated execution.

Do not rewrite `20260801040100_add_progress_delete_policies.sql`; it may already have been applied. Put all new generation objects and policy replacements in the new migration.

- [ ] **Step 3: Verify GREEN**

Run `npm.cmd test -- --run src/tests/supabaseSchema.test.ts`. Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add -- supabase/schema.sql supabase/migrations/20260801042000_reliable_practice_reset.sql src/tests/supabaseSchema.test.ts
git commit -m "fix(db): add generation-safe practice reset"
```

### Task 2: Persist and apply reset generations atomically in Dexie

**Files:**
- Modify: `src/db/localDb.ts`
- Create: `src/db/practiceProgressStateRepository.ts`
- Create: `src/domain/practiceGeneration.ts`
- Modify: `src/tests/localDb.test.ts`
- Create: `src/tests/practiceGeneration.test.ts`

- [ ] **Step 1: Write repository tests and verify RED**

Add tests using separate owners that prove:

```ts
await applyLocalPracticeReset("user-1", 2);
expect(await getAppliedPracticeGeneration("user-1")).toBe(2);
expect(await getAllProgress("user-1")).toEqual([]);
expect(await getPracticeResume("user-1")).toEqual(
  createEmptyPracticeResume("user-1"),
);
expect(await getAllExamSessions("user-1")).toHaveLength(1);
expect(await getAllProgress("user-2")).toHaveLength(1);
```

Also prove generations 1 and 2 both leave data unchanged when generation 2 is already applied. Add parser tests rejecting negative, fractional, unsafe, non-number, and non-finite values. Run both focused tests. Expected: FAIL because the repository/table and parser do not exist.

- [ ] **Step 2: Add Dexie version 5 and repository**

Add:

```ts
export type StoredPracticeProgressState = {
  ownerId: string;
  generation: number;
};
practiceProgressState!: Table<StoredPracticeProgressState, string>;
```

Version 5 preserves all existing stores and adds `practiceProgressState: "ownerId"`.

Implement:

```ts
export async function getAppliedPracticeGeneration(ownerId: string) {
  return (await db.practiceProgressState.get(ownerId))?.generation ?? 0;
}

export async function applyLocalPracticeReset(ownerId: string, generation: number) {
  await db.transaction(
    "rw",
    db.ownerProgress,
    db.practiceResume,
    db.practiceProgressState,
    async () => {
      const current = await getAppliedPracticeGeneration(ownerId);
      if (generation <= current) return;
      await db.ownerProgress.where("ownerId").equals(ownerId).delete();
      await db.practiceResume.put(createEmptyPracticeResume(ownerId));
      await db.practiceProgressState.put({ ownerId, generation });
    },
  );
}
```

Implement one shared `parsePracticeGeneration(value: unknown): number` using `typeof value === "number" && Number.isSafeInteger(value) && value >= 0`. Use it at every local repository and Supabase boundary. Do not include exam tables in the reset transaction.

- [ ] **Step 3: Verify GREEN and commit**

Run `npm.cmd test -- --run src/tests/localDb.test.ts src/tests/practiceGeneration.test.ts`. Expected: PASS.

```powershell
git add -- src/db/localDb.ts src/db/practiceProgressStateRepository.ts src/domain/practiceGeneration.ts src/tests/localDb.test.ts src/tests/practiceGeneration.test.ts
git commit -m "feat(db): track applied practice generations"
```

### Task 3: Serialize owner-scoped practice operations

**Files:**
- Create: `src/sync/practiceOperationQueue.ts`
- Create: `src/tests/practiceOperationQueue.test.ts`

- [ ] **Step 1: Write queue tests and verify RED**

Test that two operations for `user-1` execute in submission order even when the first is unresolved, while an operation for `user-2` can finish independently. Also prove a rejected task does not block the next task.

Run `npm.cmd test -- --run src/tests/practiceOperationQueue.test.ts`. Expected: FAIL because the module does not exist.

- [ ] **Step 2: Implement the smallest keyed promise queue**

```ts
const ownerTails = new Map<string, Promise<void>>();

export async function runPracticeOperation<T>(
  ownerId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = ownerTails.get(ownerId) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(operation);
  const tail = result.then(() => undefined, () => undefined);
  ownerTails.set(ownerId, tail);
  try {
    return await result;
  } finally {
    if (ownerTails.get(ownerId) === tail) ownerTails.delete(ownerId);
  }
}
```

- [ ] **Step 3: Verify GREEN and commit**

Run `npm.cmd test -- --run src/tests/practiceOperationQueue.test.ts`. Expected: PASS.

```powershell
git add -- src/sync/practiceOperationQueue.ts src/tests/practiceOperationQueue.test.ts
git commit -m "feat(sync): serialize practice operations by owner"
```

### Task 4: Make Supabase practice sync generation-aware

**Files:**
- Create: `src/sync/supabasePracticeCoordinator.ts`
- Modify: `src/sync/supabaseProgressSync.ts`
- Modify: `src/sync/supabasePracticeResumeSync.ts`
- Modify: `src/App.tsx`
- Modify: `src/pages/PracticePage.tsx`
- Create: `src/tests/practiceCoordinator.test.ts`
- Modify: `src/tests/progressSync.test.ts`
- Modify: `src/tests/practiceResumeSync.test.ts`

- [ ] **Step 1: Write coordinator tests and verify RED**

With a narrow fake Supabase client, prove:

- remote generation 3 with local generation 2 calls `applyLocalPracticeReset(ownerId, 3)` before merge callbacks;
- equal generation does not clear local data;
- remote generation is decoded through the shared safe-integer parser;
- remote writes include `reset_generation`;
- two sync requests for one owner use `runPracticeOperation` sequentially.

Run the three focused test files. Expected: FAIL because generation coordination is missing.

- [ ] **Step 2: Add generation parameters to raw sync adapters**

Change progress and resume remote row types to include `reset_generation: number`. Require a validated `generation` parameter on cloud-write functions and emit it in every upsert. Ignore rows whose returned generation does not equal the fetched current generation as a defense-in-depth check.

- [ ] **Step 3: Implement coordinated synchronization**

Export:

```ts
export async function syncAllPracticeData(client, ownerId) {
  return runPracticeOperation(ownerId, async () => {
    const generation = await preparePracticeGeneration(client, ownerId);
    const resume = await syncPracticeResumeWithSupabase(client, ownerId, generation);
    const progress = await syncProgressWithSupabase(client, ownerId, generation);
    return { generation, resume, progress };
  });
}

export async function syncQuestionProgress(client, ownerId) {
  return runPracticeOperation(ownerId, async () => {
    const generation = await preparePracticeGeneration(client, ownerId);
    return syncProgressWithSupabase(client, ownerId, generation);
  });
}
```

`preparePracticeGeneration` selects `generation` from `practice_progress_state`, defaults missing rows to 0, validates it with `parsePracticeGeneration`, compares against `getAppliedPracticeGeneration`, and applies a newer generation locally before any repository reads.

- [ ] **Step 4: Route existing practice sync calls through the coordinator**

Replace the App startup/merge/separate practice calls with `syncAllPracticeData`. Replace PracticePage background calls with `syncQuestionProgress`. Preserve existing local-first answer saving and retry behavior. Keep the existing `syncExamSessionsWithSupabase` calls at App startup, keep-progress-separate, and anonymous-merge call sites so exam download/retry behavior does not regress.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```powershell
npm.cmd test -- --run src/tests/practiceCoordinator.test.ts src/tests/progressSync.test.ts src/tests/practiceResumeSync.test.ts
```

Expected: PASS.

```powershell
git add -- src/sync/supabasePracticeCoordinator.ts src/sync/supabaseProgressSync.ts src/sync/supabasePracticeResumeSync.ts src/App.tsx src/pages/PracticePage.tsx src/tests/practiceCoordinator.test.ts src/tests/progressSync.test.ts src/tests/practiceResumeSync.test.ts
git commit -m "fix(sync): enforce practice generations"
```

### Task 5: Make reset fail safely and preserve exams

**Files:**
- Modify: `src/sync/supabasePracticeCoordinator.ts`
- Modify: `src/App.tsx`
- Create: `src/tests/practiceReset.test.ts`

- [ ] **Step 1: Write reset tests and verify RED**

Prove that:

- RPC `{ error }` rejects and never calls `applyLocalPracticeReset`;
- missing, negative, fractional, or unsafe generation data rejects;
- success applies exactly the server-returned generation;
- reset uses the same owner queue as sync;
- exam repository methods are never called.

Run `npm.cmd test -- --run src/tests/practiceReset.test.ts`. Expected: FAIL because the reset coordinator does not exist.

- [ ] **Step 2: Implement reset in the coordinator**

```ts
export async function resetPracticeData(client, ownerId) {
  return runPracticeOperation(ownerId, async () => {
    const { data, error } = await client.rpc("reset_practice_progress");
    if (error) throw error;
    const generation = parsePracticeGeneration(data);
    await applyLocalPracticeReset(ownerId, generation);
    return generation;
  });
}
```

- [ ] **Step 3: Update App reset behavior**

For authenticated users, call the RPC-backed reset and update React state only after success. On failure, keep local data and show `window.alert("Reset failed. Your progress was not changed. Please try again.")`. Retain a local-only path for anonymous data. Do not import or call `clearAllExamSessions`.

- [ ] **Step 4: Verify GREEN and commit**

Run `npm.cmd test -- --run src/tests/practiceReset.test.ts src/tests/localDb.test.ts`. Expected: PASS.

```powershell
git add -- src/sync/supabasePracticeCoordinator.ts src/App.tsx src/tests/practiceReset.test.ts
git commit -m "fix(reset): prevent stale practice restoration"
```

### Task 6: Correct exam score display and sync submitted exams

**Files:**
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/pages/ExamPage.tsx`
- Modify: `src/tests/dashboardPageLayout.test.tsx`
- Create: `src/tests/examPageSync.test.tsx`

- [ ] **Step 1: Add failing score semantics test**

Render an exam session with `score: 80` and 65 question IDs. Assert `80%` is present and `123%` / `80/65` are absent.

Run `npm.cmd test -- --run src/tests/dashboardPageLayout.test.tsx`. Expected: FAIL with the current double conversion.

- [ ] **Step 2: Display stored percentage directly**

Replace the second conversion with:

```ts
const pct = Math.round(sess.score);
scoreText = `${pct}%`;
```

Run the dashboard test. Expected: PASS.

- [ ] **Step 3: Add failing authenticated exam-sync test**

Mock `saveExamSession`, `supabaseClient`, and `syncExamSessionsWithSupabase`; submit an exam for `user-1`; assert local save completes before one background sync request. Add an anonymous case asserting no cloud sync.

Run `npm.cmd test -- --run src/tests/examPageSync.test.tsx`. Expected: FAIL because ExamPage only saves locally.

- [ ] **Step 4: Trigger exam sync after local save**

After `saveExamSession`, call `syncExamSessionsWithSupabase` only when owner is not anonymous and a client exists. Catch and log background sync errors without rolling back the local session.

- [ ] **Step 5: Verify GREEN and commit**

Run both focused test files. Expected: PASS.

```powershell
git add -- src/pages/DashboardPage.tsx src/pages/ExamPage.tsx src/tests/dashboardPageLayout.test.tsx src/tests/examPageSync.test.tsx
git commit -m "fix(exam): align score display and cloud sync"
```

### Task 7: Full verification and deployment handoff

**Files:**
- Create: `scripts/verify-practice-reset-concurrency.mjs`
- Modify other files only if verification reveals an in-scope regression.

- [ ] **Step 1: Run complete verification**

```powershell
npm.cmd test -- --run
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected: all tests pass, lint/build exit 0, and diff check reports no whitespace errors.

- [ ] **Step 2: Review scope and migration ordering**

Confirm the final diff does not clear or mutate `exam_sessions`, does not include unrelated UI changes, and deploys SQL before frontend code.

- [ ] **Step 3: Add an executable post-deployment concurrency verifier**

Create `scripts/verify-practice-reset-concurrency.mjs` using the existing Supabase JS dependency. Require all of:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_RESET_TEST_EMAIL`
- `SUPABASE_RESET_TEST_PASSWORD`
- `ALLOW_DESTRUCTIVE_RESET_TEST=true`

The script must refuse to run without the explicit opt-in and must warn that the dedicated test user’s practice data will be reset. Authenticate two clients as that same dedicated test user, then verify:

1. Two concurrent `reset_practice_progress` RPC calls return distinct generations and the stored generation equals their maximum.
2. Repeated races between a stale-generation progress upsert and reset leave no `question_progress` row whose `reset_generation` is below the final stored generation. Either the stale write is rejected or it commits first and is deleted.
3. A fixed-ID `exam_sessions` verifier row remains present after reset. Repeated runs upsert the same row in the dedicated test account; it is intentionally retained because authenticated users have no exam DELETE permission.

Never run this script against the user’s normal account. Commit it separately:

```powershell
git add -- scripts/verify-practice-reset-concurrency.mjs
git commit -m "test(db): add reset concurrency verifier"
```

- [ ] **Step 4: Run post-deployment verification or report the exact blocker**

After applying the migration to a non-production or dedicated test-user environment, run:

```powershell
$env:ALLOW_DESTRUCTIVE_RESET_TEST='true'
node scripts/verify-practice-reset-concurrency.mjs
```

If no configured migration/admin connection and dedicated test-user credentials are available, do not run the verifier. Report the exact missing prerequisites and do not claim the live migration or PostgreSQL concurrency behavior was verified.
