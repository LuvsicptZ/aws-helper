import { describe, expect, it } from "vitest";
import type { Question } from "../domain/question";
import { createExamQuestionIds, scoreExam } from "../domain/exam";

function question(id: number, answer: Question["answer"]): Question {
  return {
    id,
    sourceNumber: id,
    stem: `Question ${id}`,
    options: { A: "A", B: "B", C: "C" },
    answer,
    explanation: `Explanation ${id}`,
  };
}

describe("exam generation", () => {
  it("selects 65 unique question ids", () => {
    const questionIds = Array.from({ length: 1019 }, (_, index) => index + 1);
    const selected = createExamQuestionIds(questionIds, 65, () => 0.5);

    expect(selected).toHaveLength(65);
    expect(new Set(selected).size).toBe(65);
  });

  it("does not select more questions than are available", () => {
    const selected = createExamQuestionIds([1, 2, 3], 65, () => 0.5);

    expect(selected).toHaveLength(3);
    expect(new Set(selected)).toEqual(new Set([1, 2, 3]));
  });
});

describe("exam scoring", () => {
  it("scores correct answers and treats unanswered questions as incorrect", () => {
    const result = scoreExam(
      [question(1, "A"), question(2, ["A", "C"]), question(3, "B")],
      {
        1: ["A"],
        2: ["C", "A"],
      },
    );

    expect(result).toEqual({
      totalQuestions: 3,
      correctQuestions: 2,
      incorrectQuestions: 1,
      scorePercent: 67,
      incorrectQuestionIds: [3],
    });
  });

  it("returns zero score when there are no questions", () => {
    expect(scoreExam([], {})).toEqual({
      totalQuestions: 0,
      correctQuestions: 0,
      incorrectQuestions: 0,
      scorePercent: 0,
      incorrectQuestionIds: [],
    });
  });
});
