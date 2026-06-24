import { describe, expect, it } from "vitest";
import {
  createEmptyPracticeResume,
  updatePracticePosition,
} from "../domain/practiceResume";
import { syncPracticeResume } from "../sync/practiceResumeSync";

describe("practice resume sync", () => {
  it("merges per-mode positions and saves the result locally and remotely", async () => {
    const local = updatePracticePosition(
      createEmptyPracticeResume("user-1"),
      "sequential",
      { questionId: 20, index: 19 },
      new Date("2026-06-24T03:00:00.000Z"),
    );
    const remote = updatePracticePosition(
      createEmptyPracticeResume("user-1"),
      "incorrect",
      { questionId: 40, index: 2 },
      new Date("2026-06-24T04:00:00.000Z"),
    );
    let savedLocal = createEmptyPracticeResume("user-1");
    let savedRemote = createEmptyPracticeResume("user-1");

    const merged = await syncPracticeResume({
      localResume: local,
      remoteResume: remote,
      saveLocalResume: async (resume) => {
        savedLocal = resume;
      },
      saveRemoteResume: async (resume) => {
        savedRemote = resume;
      },
    });

    expect(merged.positions.sequential.questionId).toBe(20);
    expect(merged.positions.incorrect.questionId).toBe(40);
    expect(savedLocal).toEqual(merged);
    expect(savedRemote).toEqual(merged);
  });
});
