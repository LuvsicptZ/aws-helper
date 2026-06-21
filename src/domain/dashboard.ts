import type { QuestionProgress } from "./progress";

export type DashboardStats = {
  totalQuestions: number;
  answeredQuestions: number;
  remainingQuestions: number;
  accuracyPercent: number;
  incorrectQuestions: number;
  guessedQuestions: number;
  bookmarkedQuestions: number;
};

export function calculateDashboardStats(
  totalQuestions: number,
  progressList: QuestionProgress[],
): DashboardStats {
  const answeredQuestions = progressList.filter(
    (progress) => progress.attempts > 0,
  ).length;
  const totalAttempts = progressList.reduce(
    (sum, progress) => sum + progress.attempts,
    0,
  );
  const correctAttempts = progressList.reduce(
    (sum, progress) => sum + progress.correctAttempts,
    0,
  );

  return {
    totalQuestions,
    answeredQuestions,
    remainingQuestions: Math.max(0, totalQuestions - answeredQuestions),
    accuracyPercent:
      totalAttempts === 0 ? 0 : Math.round((correctAttempts / totalAttempts) * 100),
    incorrectQuestions: progressList.filter(
      (progress) => progress.lastResult === "incorrect",
    ).length,
    guessedQuestions: progressList.filter(
      (progress) => progress.markedGuessed === true,
    ).length,
    bookmarkedQuestions: progressList.filter(
      (progress) => progress.bookmarked === true,
    ).length,
  };
}
