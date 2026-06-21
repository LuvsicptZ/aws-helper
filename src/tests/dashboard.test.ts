import { describe, expect, it } from "vitest";
import { calculateDashboardStats } from "../domain/dashboard";
import type { QuestionProgress } from "../domain/progress";
import { createEmptyProgress } from "../domain/progress";

function progress(overrides: Partial<QuestionProgress>): QuestionProgress {
  return {
    ...createEmptyProgress(overrides.questionId ?? 1),
    ...overrides,
  };
}

describe("dashboard stats", () => {
  it("counts total, answered, remaining, incorrect, guessed, and bookmarked questions", () => {
    const stats = calculateDashboardStats(5, [
      progress({
        questionId: 1,
        attempts: 2,
        correctAttempts: 1,
        lastResult: "incorrect",
        markedGuessed: true,
      }),
      progress({
        questionId: 2,
        attempts: 1,
        correctAttempts: 1,
        lastResult: "correct",
        bookmarked: true,
      }),
      progress({
        questionId: 3,
        attempts: 0,
        bookmarked: true,
      }),
    ]);

    expect(stats).toEqual({
      totalQuestions: 5,
      answeredQuestions: 2,
      remainingQuestions: 3,
      accuracyPercent: 67,
      incorrectQuestions: 1,
      guessedQuestions: 1,
      bookmarkedQuestions: 2,
    });
  });

  it("returns zero accuracy when there are no answer attempts", () => {
    const stats = calculateDashboardStats(3, [
      progress({ questionId: 1, bookmarked: true }),
    ]);

    expect(stats.accuracyPercent).toBe(0);
    expect(stats.answeredQuestions).toBe(0);
    expect(stats.remainingQuestions).toBe(3);
  });
});
