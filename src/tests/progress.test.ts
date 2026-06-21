import { describe, expect, it } from "vitest";
import { gradeAnswer, normalizeAnswer } from "../domain/question";
import {
  createEmptyProgress,
  updateProgressAfterAnswer,
} from "../domain/progress";

describe("question grading", () => {
  it("normalizes a single answer", () => {
    expect(normalizeAnswer("A")).toEqual(["A"]);
  });

  it("grades a correct single-choice answer", () => {
    expect(gradeAnswer("A", ["A"])).toBe("correct");
  });

  it("grades an incorrect single-choice answer", () => {
    expect(gradeAnswer("A", ["B"])).toBe("incorrect");
  });

  it("grades multi-choice answers independent of order", () => {
    expect(gradeAnswer(["A", "C"], ["C", "A"])).toBe("correct");
  });

  it("grades missing multi-choice selections as incorrect", () => {
    expect(gradeAnswer(["A", "C"], ["A"])).toBe("incorrect");
  });

  it("grades extra multi-choice selections as incorrect", () => {
    expect(gradeAnswer(["A", "C"], ["A", "C", "D"])).toBe("incorrect");
  });
});

describe("question progress", () => {
  it("creates empty progress for a question", () => {
    expect(createEmptyProgress(42)).toMatchObject({
      questionId: 42,
      attempts: 0,
      correctAttempts: 0,
      lastSelected: [],
      markedGuessed: false,
      bookmarked: false,
      note: "",
    });
  });

  it("increments attempts after an incorrect answer", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const progress = createEmptyProgress(1);

    const updated = updateProgressAfterAnswer(progress, ["B"], "incorrect", now);

    expect(updated).toMatchObject({
      questionId: 1,
      attempts: 1,
      correctAttempts: 0,
      lastSelected: ["B"],
      lastResult: "incorrect",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("increments correct attempts after a correct answer", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const progress = createEmptyProgress(1);

    const updated = updateProgressAfterAnswer(progress, ["A"], "correct", now);

    expect(updated.attempts).toBe(1);
    expect(updated.correctAttempts).toBe(1);
  });

  it("preserves review metadata when updating answer progress", () => {
    const progress = {
      ...createEmptyProgress(1),
      markedGuessed: true,
      bookmarked: true,
      note: "Review this later",
    };

    const updated = updateProgressAfterAnswer(
      progress,
      ["A"],
      "correct",
      new Date("2026-01-01T00:00:00.000Z"),
    );

    expect(updated.markedGuessed).toBe(true);
    expect(updated.bookmarked).toBe(true);
    expect(updated.note).toBe("Review this later");
  });
});