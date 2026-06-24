# Practice Resume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve each practice mode's position across navigation and reloads, expose the latest destination on Dashboard, and synchronize account-scoped resume data safely.

**Architecture:** Add a focused practice-resume domain model with deterministic restore and merge functions. Persist owner-scoped resume records in Dexie, keep the active owner and resume state at the app level, and pass controlled navigation state into PracticePage and DashboardPage. Extend the existing Supabase sync pattern with one resume row per user while keeping the UI local-first.

**Tech Stack:** React 19, TypeScript, Dexie/IndexedDB, Supabase, Vitest, Playwright.

---

### Task 1: Resume domain behavior

**Files:**
- Create: `src/domain/practiceResume.ts`
- Create: `src/tests/practiceResume.test.ts`

- [ ] Write failing unit tests for default records, per-mode updates, question-ID restoration, dynamic-list index fallback, Random order repair, and timestamp-based merge.
- [ ] Run `npm.cmd test -- --run src/tests/practiceResume.test.ts` and confirm failures are caused by missing behavior.
- [ ] Implement the smallest pure functions needed by the tests.
- [ ] Re-run the focused tests and confirm they pass.

### Task 2: Owner-scoped local persistence

**Files:**
- Modify: `src/db/localDb.ts`
- Create: `src/db/practiceResumeRepository.ts`
- Create: `src/tests/practiceResumeRepository.test.ts`

- [ ] Write failing repository tests proving Anonymous and authenticated owners cannot read or overwrite each other's resume records.
- [ ] Add a Dexie schema version with an owner-keyed `practiceResume` table.
- [ ] Implement read, save, and Anonymous-presence operations.
- [ ] Run focused repository tests and existing local database tests.

### Task 3: Preserve position through app navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/PracticePage.tsx`
- Modify: `scripts/e2e.mjs`

- [ ] Add a failing E2E flow: move to Question 4, navigate to Dashboard, return to Question Bank, and expect Question 4.
- [ ] Lift the current owner/resume state into App and load it before opening Practice.
- [ ] Make PracticePage accept a saved position and report position changes.
- [ ] Keep every mode independent and preserve Random order.
- [ ] Run E2E and focused unit tests.

### Task 4: Dashboard Continue Practice destination

**Files:**
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/App.tsx`
- Modify: `scripts/e2e.mjs`

- [ ] Add a failing E2E assertion that Dashboard displays the last mode and question.
- [ ] Pass the latest resume destination into Dashboard.
- [ ] Render destination-aware text and open the saved mode/position when clicked.
- [ ] Verify no-resume users retain the current default Continue Practice behavior.

### Task 5: Authentication lifecycle and automatic sync

**Files:**
- Create: `src/auth/AuthProvider.tsx`
- Modify: `src/components/AuthPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Modify: `src/tests/auth.test.ts`

- [ ] Write failing tests for initial-session resolution and auth-state propagation.
- [ ] Centralize Supabase session ownership so Dashboard-only AuthPanel is not the source of application identity.
- [ ] Trigger background sync after authentication without navigating away from Dashboard.
- [ ] Keep manual Sync and non-blocking failure status.

### Task 6: Remote resume synchronization

**Files:**
- Modify: `supabase/schema.sql`
- Create: `src/sync/practiceResumeSync.ts`
- Create: `src/sync/supabasePracticeResumeSync.ts`
- Create: `src/tests/practiceResumeSync.test.ts`
- Modify: `src/components/AuthPanel.tsx`

- [ ] Write failing merge/sync tests proving newer per-mode records win independently.
- [ ] Add the `practice_resume` Supabase table and user-scoped RLS policies.
- [ ] Implement remote row mapping and synchronization.
- [ ] Include resume synchronization in automatic and manual sync.

### Task 7: Anonymous ownership decision

**Files:**
- Create: `src/components/AnonymousProgressPrompt.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/db/practiceResumeRepository.ts`
- Modify: `scripts/e2e.mjs`

- [ ] Add a failing test/E2E flow proving Anonymous data is not silently merged.
- [ ] Show a non-modal Dashboard prompt when signed-in data and Anonymous data require a decision.
- [ ] Implement Merge into my account and Keep separate actions.
- [ ] Announce status accessibly and retain 44px mobile touch targets.

### Task 8: Full verification

**Files:**
- Review all modified files.

- [ ] Run `npm.cmd test -- --run`.
- [ ] Run `npm.cmd run e2e`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run build`.
- [ ] Run `git diff --check`.
- [ ] Confirm the existing mobile explanation overflow regression still passes at 437px and 320px.
- [ ] Review the final diff for account isolation, no forced navigation after sync, and surgical scope.

## Success Criteria

- Internal navigation restores the exact mode and question.
- Reload restores local resume state.
- Each mode has an independent position and Random preserves order.
- Dashboard names and opens the latest resume destination.
- Authentication is application-wide and triggers non-blocking automatic sync.
- Local data is isolated by owner.
- Anonymous data is never merged without an explicit decision.
- Multi-device conflicts merge per mode by timestamp.
- Existing tests, E2E, lint, and build remain green.
