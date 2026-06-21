import type { ChoiceKey } from "./question";

export type QuestionProgress = {
  questionId: number;
  attempts: number;
  correctAttempts: number;
  lastSelected: ChoiceKey[];
  lastResult?: "correct" | "incorrect";
  markedGuessed: boolean;
  bookmarked: boolean;
  note: string;
  updatedAt: string;
  syncedAt?: string;
};

export function createEmptyProgress(questionId: number): QuestionProgress {
  return {
    questionId,
    attempts: 0,
    correctAttempts: 0,
    lastSelected: [],
    markedGuessed: false,
    bookmarked: false,
    note: "",
    updatedAt: new Date().toISOString(),
  };
}

export function updateProgressAfterAnswer(
  progress: QuestionProgress,
  selectedAnswer: ChoiceKey[],
  result: "correct" | "incorrect",
  now = new Date(),
): QuestionProgress {
  return {
    ...progress,
    attempts: progress.attempts + 1,
    correctAttempts:
      result === "correct" ? progress.correctAttempts + 1 : progress.correctAttempts,
    lastSelected: [...selectedAnswer],
    lastResult: result,
    updatedAt: now.toISOString(),
  };
}

export function updateProgressReviewMetadata(
  progress: QuestionProgress,
  metadata: Partial<
    Pick<QuestionProgress, "bookmarked" | "markedGuessed" | "note">
  >,
  now = new Date(),
): QuestionProgress {
  return {
    ...progress,
    ...metadata,
    updatedAt: now.toISOString(),
  };
}
