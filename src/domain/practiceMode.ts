import type { Question } from "./question";
import type { QuestionProgress } from "./progress";

export type PracticeMode =
  | "sequential"
  | "random"
  | "incorrect"
  | "guessed"
  | "favorite";

export const practiceModeLabels: Record<PracticeMode, string> = {
  sequential: "顺序",
  random: "随机",
  incorrect: "错题",
  guessed: "蒙对",
  favorite: "收藏",
};

export function filterQuestionsByPracticeMode(
  mode: PracticeMode,
  questions: Question[],
  progressList: QuestionProgress[],
): Question[] {
  if (mode === "sequential" || mode === "random") {
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

    if (mode === "guessed") {
      return progress?.markedGuessed === true;
    }

    return progress?.bookmarked === true;
  });
}

export function shuffleQuestions(questions: Question[]): Question[] {
  const shuffled = [...questions];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}
