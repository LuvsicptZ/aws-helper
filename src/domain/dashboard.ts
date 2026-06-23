import type { QuestionProgress } from "./progress";
import type { Question } from "./question";

export type DashboardStats = {
  totalQuestions: number;
  answeredQuestions: number;
  remainingQuestions: number;
  accuracyPercent: number;
  incorrectQuestions: number;
  guessedQuestions: number;
  bookmarkedQuestions: number;
};

export type TopicProgress = {
  label: string;
  total: number;
  attempted: number;
  incorrect: number;
  coveragePercent: number;
  errorRatePercent: number;
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

export function calculateTopicProgress(
  questions: Question[],
  progressList: QuestionProgress[],
): TopicProgress[] {
  const progressByQuestionId = new Map(
    progressList.map((progress) => [progress.questionId, progress]),
  );
  const topicLabels = Array.from(
    new Set(questions.flatMap((question) => question.topics ?? [])),
  ).sort((a, b) => a.localeCompare(b));

  return topicLabels.map((label) => {
    const matchingQuestions = questions.filter((question) =>
      question.topics?.includes(label),
    );
    const attempted = matchingQuestions.filter(
      (question) => (progressByQuestionId.get(question.id)?.attempts ?? 0) > 0,
    ).length;
    const incorrect = matchingQuestions.filter(
      (question) => progressByQuestionId.get(question.id)?.lastResult === "incorrect",
    ).length;

    return {
      label,
      total: matchingQuestions.length,
      attempted,
      incorrect,
      coveragePercent:
        matchingQuestions.length === 0
          ? 0
          : Math.round((attempted / matchingQuestions.length) * 100),
      errorRatePercent:
        attempted === 0 ? 0 : Math.round((incorrect / attempted) * 100),
    };
  });
}

export function calculateWeakAreas(
  questions: Question[],
  progressList: QuestionProgress[],
  limit = 3,
): TopicProgress[] {
  return calculateTopicProgress(questions, progressList)
    .filter((topic) => topic.attempted > 0 && topic.incorrect > 0)
    .sort(
      (a, b) =>
        b.errorRatePercent - a.errorRatePercent || b.incorrect - a.incorrect,
    )
    .slice(0, limit);
}

export function calculateRecentActivity(
  progressList: QuestionProgress[],
  limit = 5,
): QuestionProgress[] {
  return [...progressList]
    .filter((progress) => progress.attempts > 0 && progress.lastResult)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() ||
        b.questionId - a.questionId,
    )
    .slice(0, limit);
}
