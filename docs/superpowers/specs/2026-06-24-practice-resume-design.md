# Practice Resume and Account-Synced Position

## Goal

Make practice sessions feel continuous:

- Returning to Question Bank during the same app session restores the user's last mode and question.
- Signing in restores the user's latest practice position across devices.
- Recovery never blocks practice or unexpectedly moves a user who is already reading a question.

## User Experience

### Dashboard

The existing Continue Practice action remains the primary recovery entry point.

When resume data exists, its label identifies the destination, for example:

> Continue Incorrect · Question 24

After sign-in, the user remains on Dashboard. The app synchronizes in the background and updates the Continue Practice destination when synchronization completes.

If synchronization fails, local resume data remains usable. Dashboard shows a lightweight failure message and retains the existing manual Sync action.

### In-app navigation

Leaving Practice for Dashboard, Topics, Notes, or another internal page preserves the current practice context. Returning to the same mode restores the saved question.

Each practice mode maintains an independent resume position:

- Sequential
- Random
- Incorrect
- Guessed
- Bookmarked

The most recently used mode becomes the Dashboard Continue Practice destination.

### Random mode

Random mode stores both:

- The current question ID.
- The complete randomized question-ID order.

This prevents returning to a newly shuffled sequence that no longer matches the previous position.

### Dynamic modes

Incorrect, Guessed, and Bookmarked are dynamic lists. If the saved question no longer belongs to the selected mode, recovery selects the nearest valid position using the saved index as a fallback.

If the mode has no remaining questions, the existing mode-specific empty state is shown.

### Anonymous progress ownership

Local data is isolated by owner:

- Signed-out work belongs to an Anonymous workspace.
- Signed-in work belongs to the authenticated user ID.

When a user signs in and Anonymous data exists, Dashboard shows a one-time ownership prompt:

- **Merge into my account**
- **Keep separate**

The app must not silently attach Anonymous data to an account because the browser may be shared.

## Resume Data

Each owner has a practice resume record containing:

- `lastMode`
- Per-mode position:
  - `questionId`
  - `index`
  - `updatedAt`
  - `randomQuestionIds` for Random mode only

Question ID is the primary identity. Index is only a fallback for dynamic lists whose membership changes.

## State and Data Flow

### Local-first behavior

1. Read the current owner's local resume record.
2. Render Dashboard and Continue Practice immediately.
3. On sign-in, synchronize remote progress and resume data in the background.
4. Update Dashboard when synchronization completes.
5. If the user has already entered Practice, do not automatically change mode or question.

### Saving

Update the active mode's resume position when:

- The user moves to the previous or next question.
- The user changes practice mode.
- The user leaves Practice.

The last-used mode is updated alongside the active position.

### Multi-device merge

Resume positions are merged independently per mode.

For each mode, the record with the newest `updatedAt` wins. The overall `lastMode` is selected from the newest mode record.

This deliberately does not choose the largest question number because users may intentionally move backward.

## Account Isolation

Question progress, practice resume data, and synchronization must use an explicit owner boundary.

Existing browser data requires a migration path:

- Existing unscoped local records are treated as Anonymous data.
- A signed-in user chooses whether to merge that data.
- Keeping data separate leaves Anonymous records untouched.

No signed-in user's local records may be merged into a different account.

## Sync Behavior

Authentication success triggers automatic synchronization.

Synchronization includes:

- Question progress
- Exam sessions
- Practice resume positions

The existing manual Sync action remains available for retry and explicit refresh.

Sync status should communicate:

- Syncing
- Synced
- Failed; local progress remains available

Synchronization must not block Continue Practice.

## Accessibility and Responsive Behavior

- Continue Practice remains a normal keyboard-focusable button.
- Its destination is present in visible text, not color or tooltip alone.
- Sync and Anonymous merge status are announced through an appropriate live status region.
- Anonymous merge actions retain at least 44px touch targets on mobile.
- The ownership prompt fits the existing responsive Dashboard layout and does not require a modal.

## Error and Edge Cases

- Missing saved question: use the nearest valid index.
- Index beyond list length: clamp to the last valid item.
- Empty mode: show the existing empty state.
- Invalid Random order: remove unknown IDs and append missing current question-bank IDs.
- Offline sign-in session: use local account data and retry synchronization later.
- Sync conflict while Practice is open: update stored resume data but do not move the active session.
- Deleted or changed questions: recover by question ID first, then index fallback.

## Verification

Automated coverage must prove:

- Leaving Practice and returning restores the same mode and question.
- Every mode retains an independent position.
- Random restores the same randomized order.
- Dashboard Continue Practice displays and opens the latest mode and question.
- A page reload restores local resume data.
- Sign-in triggers synchronization without navigation.
- Newer per-mode remote records win conflicts.
- Anonymous records are never merged without confirmation.
- Dynamic modes recover to the nearest valid item.
- Sync failure leaves local Continue Practice usable.
- A completed background sync does not move an already-open Practice session.

## What Already Exists

- Dashboard Continue Practice action.
- Five Practice modes and their empty states.
- IndexedDB persistence through Dexie.
- Supabase authentication.
- Question-progress and exam-session synchronization.
- Manual Sync status and retry action.

The implementation should extend these patterns rather than add a second navigation or notification system.

## Not in Scope

- Automatically opening Practice immediately after sign-in.
- Restoring scroll position within a question.
- Restoring partially selected multi-answer choices that have not been submitted.
- Reworking the visual design system.
- Changing exam resume behavior.

## Design Review Summary

| Dimension | Before | After |
|---|---:|---:|
| Information architecture | 5/10 | 9/10 |
| States and edge cases | 3/10 | 10/10 |
| User journey | 4/10 | 10/10 |
| Visual hierarchy | 7/10 | 9/10 |
| Design-system alignment | 7/10 | 9/10 |
| Responsive and accessibility | 5/10 | 9/10 |

Overall: **4/10 → 9/10**.

The remaining design-system gap is the absence of a project-level `DESIGN.md`. This feature can safely reuse existing UI patterns without creating a new visual vocabulary.
