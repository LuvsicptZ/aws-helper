import { describe, expect, it } from "vitest";
import type { Question } from "../domain/question";
import type { QuestionProgress } from "../domain/progress";
import { createEmptyProgress } from "../domain/progress";
import { filterQuestionsByPracticeMode } from "../domain/practiceMode";

const questions: Question[] = [
  {
    id: 1,
    sourceNumber: 1,
    stem: "Question 1",
    options: { A: "A", B: "B" },
    answer: "A",
    explanation: "Explanation 1",
  },
  {
    id: 2,
    sourceNumber: 2,
    stem: "Question 2",
    options: { A: "A", B: "B" },
    answer: "B",
    explanation: "Explanation 2",
  },
  {
    id: 3,
    sourceNumber: 3,
    stem: "Question 3",
    options: { A: "A", B: "B" },
    answer: "A",
    explanation: "Explanation 3",
  },
];

function progress(overrides: Partial<QuestionProgress>): QuestionProgress {
  return {
    ...createEmptyProgress(overrides.questionId ?? 1),
    ...overrides,
  };
}

describe("practice mode filtering", () => {
  it("returns all questions for sequential mode", () => {
    expect(filterQuestionsByPracticeMode("sequential", questions, [])).toEqual(questions);
  });

  it("returns all questions for random mode before shuffle order is applied", () => {
    expect(filterQuestionsByPracticeMode("random", questions, [])).toEqual(questions);
  });

  it("returns only questions with incorrect progress", () => {
    const filtered = filterQuestionsByPracticeMode("incorrect", questions, [
      progress({ questionId: 1, lastResult: "correct" }),
      progress({ questionId: 2, lastResult: "incorrect" }),
    ]);

    expect(filtered.map((question) => question.id)).toEqual([2]);
  });

  it("returns only questions marked guessed", () => {
    const filtered = filterQuestionsByPracticeMode("guessed", questions, [
      progress({ questionId: 1, markedGuessed: true }),
      progress({ questionId: 2, markedGuessed: false }),
    ]);

    expect(filtered.map((question) => question.id)).toEqual([1]);
  });

  it("returns only bookmarked questions", () => {
    const filtered = filterQuestionsByPracticeMode("favorite", questions, [
      progress({ questionId: 1, bookmarked: false }),
      progress({ questionId: 3, bookmarked: true }),
    ]);

    expect(filtered.map((question) => question.id)).toEqual([3]);
  });

  it("returns an empty list when a filtered mode has no matches", () => {
    expect(filterQuestionsByPracticeMode("incorrect", questions, [])).toEqual([]);
  });
});
