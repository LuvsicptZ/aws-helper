import { describe, expect, it } from "vitest";
import {
  calculateDashboardStats,
  calculateRecentActivity,
  calculateTopicProgress,
  calculateWeakAreas,
} from "../domain/dashboard";
import type { Question } from "../domain/question";
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

describe("dashboard weak areas", () => {
  const questions: Question[] = [
    {
      id: 1,
      sourceNumber: 1,
      stem: "An EC2 instance uses EBS storage.",
      options: {},
      answer: "A",
      explanation: "",
      topics: ["EC2"],
    },
    {
      id: 2,
      sourceNumber: 2,
      stem: "A VPC subnet needs route table changes.",
      options: {},
      answer: "A",
      explanation: "",
      topics: ["VPC"],
    },
    {
      id: 3,
      sourceNumber: 3,
      stem: "An IAM role needs permission.",
      options: {},
      answer: "A",
      explanation: "",
      topics: ["IAM"],
    },
  ];

  it("calculates weak areas from attempted incorrect topic rates", () => {
    const weakAreas = calculateWeakAreas(questions, [
      progress({
        questionId: 1,
        attempts: 2,
        lastResult: "incorrect",
      }),
      progress({
        questionId: 2,
        attempts: 1,
        lastResult: "correct",
      }),
      progress({
        questionId: 3,
        attempts: 1,
        lastResult: "incorrect",
      }),
    ]);

    expect(weakAreas.map((area) => [area.label, area.errorRatePercent])).toEqual([
      ["EC2", 100],
      ["IAM", 100],
    ]);
  });

  it("does not infer topics from question text without explicit tags", () => {
    const topicProgress = calculateTopicProgress([
      {
        id: 1,
        sourceNumber: 1,
        stem: "An EC2 instance uses EBS storage.",
        options: {},
        answer: "A",
        explanation: "",
      },
    ], [
      progress({
        questionId: 1,
        attempts: 1,
        lastResult: "incorrect",
      }),
    ]);

    expect(topicProgress).toEqual([]);
  });
});

describe("dashboard recent activity", () => {
  it("sorts answered questions by latest update time", () => {
    const recentActivity = calculateRecentActivity([
      progress({
        questionId: 1,
        attempts: 1,
        lastResult: "correct",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
      progress({
        questionId: 2,
        attempts: 0,
        updatedAt: "2026-01-03T00:00:00.000Z",
      }),
      progress({
        questionId: 3,
        attempts: 1,
        lastResult: "incorrect",
        updatedAt: "2026-01-02T00:00:00.000Z",
      }),
    ]);

    expect(recentActivity.map((item) => item.questionId)).toEqual([3, 1]);
  });
});
