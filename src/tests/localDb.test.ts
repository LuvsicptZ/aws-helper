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

beforeEach(async () => {
  await db.progress.clear();
  await db.examSessions.clear();
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
});