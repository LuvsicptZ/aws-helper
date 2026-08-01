import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/localDb";
import {
  getAllProgress,
  saveProgress,
} from "../db/progressRepository";
import { applyLocalPracticeReset } from "../db/practiceProgressStateRepository";
import { createEmptyProgress } from "../domain/progress";
import { syncProgress } from "../sync/progressSync";

beforeEach(async () => {
  await db.ownerProgress.clear();
  await db.practiceResume.clear();
  await db.practiceProgressState.clear();
});

describe("cross-tab practice reset", () => {
  it("rejects an old sync that resumes after another tab applies reset", async () => {
    await saveProgress(createEmptyProgress(1, 0), "user-1", 0);
    const oldSnapshot = await getAllProgress("user-1", 0);
    let releaseOldSync!: () => void;
    let markOldSyncPaused!: () => void;
    const oldSyncPaused = new Promise<void>((resolve) => {
      markOldSyncPaused = resolve;
    });
    const oldSyncGate = new Promise<void>((resolve) => {
      releaseOldSync = resolve;
    });

    const oldSync = syncProgress({
      localProgress: oldSnapshot,
      remoteProgress: [],
      saveLocalProgress: async (records) => {
        markOldSyncPaused();
        await oldSyncGate;
        for (const record of records) {
          await saveProgress(record, "user-1", 0);
        }
      },
      saveRemoteProgress: async () => undefined,
    });
    await oldSyncPaused;

    await applyLocalPracticeReset("user-1", 1);
    releaseOldSync();

    await expect(oldSync).rejects.toThrow("Stale practice generation");
    await expect(getAllProgress("user-1", 1)).resolves.toEqual([]);
  });
});
