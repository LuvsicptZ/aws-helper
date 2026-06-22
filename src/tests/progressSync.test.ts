import { describe, expect, it } from "vitest";
import type { QuestionProgress } from "../domain/progress";
import { createEmptyProgress } from "../domain/progress";
import { mergeProgressRecords, syncProgress } from "../sync/progressSync";

function progress(overrides: Partial<QuestionProgress>): QuestionProgress {
  return {
    ...createEmptyProgress(overrides.questionId ?? 1),
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("progress sync merge", () => {
  it("keeps valuable review fields during conflicts", () => {
    const local = progress({
      questionId: 1,
      attempts: 1,
      correctAttempts: 1,
      bookmarked: true,
      markedGuessed: true,
      note: "local note",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const remote = progress({
      questionId: 1,
      attempts: 2,
      correctAttempts: 1,
      bookmarked: false,
      markedGuessed: false,
      note: "",
      lastSelected: ["B"],
      lastResult: "incorrect",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });

    expect(mergeProgressRecords(local, remote)).toMatchObject({
      questionId: 1,
      attempts: 2,
      correctAttempts: 1,
      bookmarked: true,
      markedGuessed: true,
      note: "local note",
      lastSelected: ["B"],
      lastResult: "incorrect",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
  });

  it("uses the newest non-empty note when both sides have notes", () => {
    const local = progress({
      questionId: 1,
      note: "older note",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const remote = progress({
      questionId: 1,
      note: "newer note",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });

    expect(mergeProgressRecords(local, remote).note).toBe("newer note");
  });

  it("uses field timestamps so bookmark and guessed removals can sync", () => {
    const local = progress({
      questionId: 1,
      bookmarked: false,
      markedGuessed: false,
      bookmarkedUpdatedAt: "2026-01-03T00:00:00.000Z",
      markedGuessedUpdatedAt: "2026-01-03T00:00:00.000Z",
      updatedAt: "2026-01-03T00:00:00.000Z",
    });
    const remote = progress({
      questionId: 1,
      bookmarked: true,
      markedGuessed: true,
      bookmarkedUpdatedAt: "2026-01-02T00:00:00.000Z",
      markedGuessedUpdatedAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });

    expect(mergeProgressRecords(local, remote)).toMatchObject({
      bookmarked: false,
      markedGuessed: false,
    });
  });
});

describe("progress sync", () => {
  it("uploads local progress when cloud is empty", async () => {
    const local = [progress({ questionId: 1, bookmarked: true })];
    const savedLocal: QuestionProgress[] = [];
    const uploaded: QuestionProgress[] = [];

    const result = await syncProgress({
      localProgress: local,
      remoteProgress: [],
      saveLocalProgress: async (progressList) => {
        savedLocal.push(...progressList);
      },
      saveRemoteProgress: async (progressList) => {
        uploaded.push(...progressList);
      },
      now: new Date("2026-01-03T00:00:00.000Z"),
    });

    expect(result).toEqual({ merged: 1, uploaded: 1, downloaded: 0 });
    expect(uploaded).toHaveLength(1);
    expect(uploaded[0]).toMatchObject({ questionId: 1, bookmarked: true });
    expect(savedLocal[0].syncedAt).toBe("2026-01-03T00:00:00.000Z");
  });

  it("downloads remote progress when local is empty", async () => {
    const remote = [progress({ questionId: 2, note: "remote note" })];
    const savedLocal: QuestionProgress[] = [];

    const result = await syncProgress({
      localProgress: [],
      remoteProgress: remote,
      saveLocalProgress: async (progressList) => {
        savedLocal.push(...progressList);
      },
      saveRemoteProgress: async () => undefined,
      now: new Date("2026-01-03T00:00:00.000Z"),
    });

    expect(result).toEqual({ merged: 1, uploaded: 0, downloaded: 1 });
    expect(savedLocal[0]).toMatchObject({ questionId: 2, note: "remote note" });
  });
});
