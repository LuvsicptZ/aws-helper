import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createEmptyProgress } from "../domain/progress";
import { db } from "../db/localDb";
import {
  clearAllProgress,
  getAllProgress,
  getProgressByQuestionId,
  saveProgress,
} from "../db/progressRepository";
import {
  clearAllExamSessions,
  getAllExamSessions,
  getExamSessionById,
  saveExamSession,
} from "../db/examRepository";
import type { ExamSession } from "../domain/exam";
import {
  createEmptyPracticeResume,
  updatePracticePosition,
} from "../domain/practiceResume";
import {
  applyLocalPracticeReset,
  getAppliedPracticeGeneration,
  mergeAnonymousPracticeData,
} from "../db/practiceProgressStateRepository";
import {
  getPracticeResume,
  savePracticeResume,
} from "../db/practiceResumeRepository";

beforeEach(async () => {
  await db.progress.clear();
  await db.ownerProgress.clear();
  await db.examSessions.clear();
  await db.ownerExamSessions.clear();
  await db.practiceResume.clear();
  await db.practiceProgressState.clear();
});

describe("progressRepository", () => {
  it("saves and reads progress by question id", async () => {
    const progress = {
      ...createEmptyProgress(42),
      attempts: 1,
      lastSelected: ["A" as const],
      lastResult: "correct" as const,
    };

    await saveProgress(progress);

    await expect(getProgressByQuestionId(42)).resolves.toMatchObject({
      questionId: 42,
      attempts: 1,
      lastSelected: ["A"],
      lastResult: "correct",
    });
  });

  it("returns all progress records", async () => {
    await saveProgress(createEmptyProgress(1));
    await saveProgress(createEmptyProgress(2));

    await expect(getAllProgress()).resolves.toHaveLength(2);
  });

  it("isolates question progress by owner", async () => {
    await saveProgress(createEmptyProgress(1), "user-1");
    await saveProgress(createEmptyProgress(2), "user-2");

    await expect(getAllProgress("user-1")).resolves.toMatchObject([
      { questionId: 1 },
    ]);
    await expect(getAllProgress("user-2")).resolves.toMatchObject([
      { questionId: 2 },
    ]);
  });

  it("clears progress records", async () => {
    await saveProgress(createEmptyProgress(1));

    await clearAllProgress();

    await expect(getAllProgress()).resolves.toEqual([]);
  });
});

describe("examRepository", () => {
  it("saves and reads an exam session", async () => {
    const session: ExamSession = {
      id: "exam-1",
      questionIds: [1, 2, 3],
      startedAt: "2026-01-01T00:00:00.000Z",
      durationSeconds: 120,
      answers: {
        1: ["A"],
      },
    };

    await saveExamSession(session);

    await expect(getExamSessionById("exam-1")).resolves.toMatchObject({
      id: "exam-1",
      questionIds: [1, 2, 3],
      answers: {
        1: ["A"],
      },
    });
  });

  it("returns newest exam sessions first", async () => {
    await saveExamSession({
      id: "old",
      questionIds: [1],
      startedAt: "2026-01-01T00:00:00.000Z",
      durationSeconds: 60,
      answers: {},
    });

    await saveExamSession({
      id: "new",
      questionIds: [2],
      startedAt: "2026-01-02T00:00:00.000Z",
      durationSeconds: 60,
      answers: {},
    });

    const sessions = await getAllExamSessions();

    expect(sessions.map((session) => session.id)).toEqual(["new", "old"]);
  });

  it("clears exam sessions", async () => {
    await saveExamSession({
      id: "exam-1",
      questionIds: [1],
      startedAt: "2026-01-01T00:00:00.000Z",
      durationSeconds: 60,
      answers: {},
    });

    await clearAllExamSessions();

    await expect(getAllExamSessions()).resolves.toEqual([]);
  });

  it("isolates exam sessions by owner", async () => {
    await saveExamSession(
      {
        id: "exam-1",
        questionIds: [1],
        startedAt: "2026-01-01T00:00:00.000Z",
        durationSeconds: 60,
        answers: {},
      },
      "user-1",
    );

    await expect(getAllExamSessions("user-2")).resolves.toEqual([]);
    await expect(getAllExamSessions("user-1")).resolves.toHaveLength(1);
  });
});

describe("practice progress reset state", () => {
  it("atomically clears one owner's practice data and preserves exams", async () => {
    await saveProgress(createEmptyProgress(1), "user-1");
    await saveProgress(createEmptyProgress(2), "user-2");
    await savePracticeResume(
      updatePracticePosition(
        createEmptyPracticeResume("user-1"),
        "sequential",
        { questionId: 12, index: 11 },
      ),
    );
    await saveExamSession(
      {
        id: "kept-exam",
        questionIds: [1],
        startedAt: "2026-08-01T00:00:00.000Z",
        durationSeconds: 60,
        answers: {},
      },
      "user-1",
    );

    await applyLocalPracticeReset("user-1", 2);

    await expect(getAppliedPracticeGeneration("user-1")).resolves.toBe(2);
    await expect(getAllProgress("user-1")).resolves.toEqual([]);
    await expect(getPracticeResume("user-1")).resolves.toEqual(
      {
        ...createEmptyPracticeResume("user-1"),
        resetGeneration: 2,
      },
    );
    await expect(getAllExamSessions("user-1")).resolves.toHaveLength(1);
    await expect(getAllProgress("user-2")).resolves.toHaveLength(1);
  });

  it("does not reapply an equal or older generation", async () => {
    await applyLocalPracticeReset("user-1", 2);
    await saveProgress(createEmptyProgress(3, 2), "user-1", 2);

    await applyLocalPracticeReset("user-1", 2);
    await applyLocalPracticeReset("user-1", 1);

    await expect(getAllProgress("user-1")).resolves.toHaveLength(1);
    await expect(getAppliedPracticeGeneration("user-1")).resolves.toBe(2);
  });

  it("rejects stale progress and resume writes after reset", async () => {
    const staleProgress = {
      ...createEmptyProgress(4),
      resetGeneration: 0,
    };
    const staleResume = {
      ...createEmptyPracticeResume("user-1"),
      resetGeneration: 0,
    };
    await applyLocalPracticeReset("user-1", 1);

    await expect(saveProgress(staleProgress, "user-1", 0)).rejects.toThrow(
      "Stale practice generation",
    );
    await expect(savePracticeResume(staleResume, 0)).rejects.toThrow(
      "Stale practice generation",
    );
    await expect(getAllProgress("user-1")).resolves.toEqual([]);
    await expect(getPracticeResume("user-1")).resolves.toEqual(
      expect.objectContaining({ resetGeneration: 1 }),
    );
  });

  it("rejects a malformed stored generation", async () => {
    await db.practiceProgressState.put({
      ownerId: "user-1",
      generation: "broken" as unknown as number,
    });

    await expect(getAppliedPracticeGeneration("user-1")).rejects.toThrow(
      "Invalid practice generation",
    );
  });

  it("atomically merges anonymous practice data into the current generation", async () => {
    await applyLocalPracticeReset("user-1", 2);
    await saveProgress(createEmptyProgress(9), "anonymous", 0);
    await savePracticeResume(
      updatePracticePosition(
        createEmptyPracticeResume("anonymous"),
        "sequential",
        { questionId: 9, index: 8 },
      ),
      0,
    );

    const mergedResume = await mergeAnonymousPracticeData("user-1", 2);

    await expect(getAllProgress("anonymous")).resolves.toEqual([]);
    await expect(getPracticeResume("anonymous")).resolves.toBeUndefined();
    await expect(getAllProgress("user-1", 2)).resolves.toEqual([
      expect.objectContaining({ questionId: 9, resetGeneration: 2 }),
    ]);
    expect(mergedResume).toMatchObject({
      ownerId: "user-1",
      resetGeneration: 2,
      positions: { sequential: { questionId: 9 } },
    });
  });
});
