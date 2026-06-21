import type { ChoiceKey } from "./question";
import type { Question } from "./question";
import { gradeAnswer } from "./question";

export type ExamSession = {
  id: string;
  questionIds: number[];
  startedAt: string;
  submittedAt?: string;
  durationSeconds: number;
  answers: Record<number, ChoiceKey[]>;
  score?: number;
};

export type ExamScore = {
  totalQuestions: number;
  correctQuestions: number;
  incorrectQuestions: number;
  scorePercent: number;
  incorrectQuestionIds: number[];
};

export const EXAM_QUESTION_COUNT = 65;
export const EXAM_DURATION_SECONDS = 130 * 60;

export function createExamQuestionIds(
  questionIds: number[],
  count = EXAM_QUESTION_COUNT,
  random = Math.random,
): number[] {
  const shuffled = [...questionIds];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function scoreExam(
  questions: Question[],
  answers: Record<number, ChoiceKey[]>,
): ExamScore {
  if (questions.length === 0) {
    return {
      totalQuestions: 0,
      correctQuestions: 0,
      incorrectQuestions: 0,
      scorePercent: 0,
      incorrectQuestionIds: [],
    };
  }

  const incorrectQuestionIds: number[] = [];
  let correctQuestions = 0;

  for (const question of questions) {
    const selectedAnswer = answers[question.id] ?? [];
    const result =
      selectedAnswer.length > 0
        ? gradeAnswer(question.answer, selectedAnswer)
        : "incorrect";

    if (result === "correct") {
      correctQuestions += 1;
    } else {
      incorrectQuestionIds.push(question.id);
    }
  }

  return {
    totalQuestions: questions.length,
    correctQuestions,
    incorrectQuestions: incorrectQuestionIds.length,
    scorePercent: Math.round((correctQuestions / questions.length) * 100),
    incorrectQuestionIds,
  };
}
