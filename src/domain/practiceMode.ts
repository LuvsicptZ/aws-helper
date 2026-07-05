import type { Question } from "./question";
import type { QuestionProgress } from "./progress";

export type PracticeMode = "sequential" | "incorrect" | "favorite";

export const practiceModeLabels: Record<PracticeMode, string> = {
  sequential: "Sequential",
  incorrect: "Incorrect",
  favorite: "Bookmarked",
};

export function filterQuestionsByPracticeMode(
  mode: PracticeMode,
  questions: Question[],
  progressList: QuestionProgress[],
): Question[] {
  if (mode === "sequential") {
    return questions;
  }

  const progressByQuestionId = new Map(
    progressList.map((progress) => [progress.questionId, progress]),
  );

  return questions.filter((question) => {
    const progress = progressByQuestionId.get(question.id);

    if (mode === "incorrect") {
      return progress?.lastResult === "incorrect";
    }

    return progress?.bookmarked === true;
  });
}
