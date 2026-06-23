import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileQuestion,
  Layers,
  PenLine,
  Target,
  XCircle,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import type { ShellRoute } from "../components/AppShell";
import { questions } from "../data/questions";
import { calculateDashboardStats, calculateTopicProgress } from "../domain/dashboard";
import { EXAM_QUESTION_COUNT } from "../domain/exam";
import type { ExamSession } from "../domain/exam";
import type { PracticeMode } from "../domain/practiceMode";
import type { QuestionProgress } from "../domain/progress";
import { getAllExamSessions } from "../db/examRepository";
import { getAllProgress } from "../db/progressRepository";

type SecondaryPageProps = {
  route: Exclude<ShellRoute, "dashboard" | "practice" | "exam">;
  onNavigate: (route: ShellRoute) => void;
  onPracticeClick: (mode?: PracticeMode) => void;
  onExamClick: () => void;
};

type ActionCardProps = {
  title: string;
  detail: string;
  icon: React.ReactNode;
  onClick?: () => void;
};

function ActionCard({ title, detail, icon, onClick }: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-24 w-full items-start justify-between rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120]"
    >
      <span>
        <span className="mb-2 flex items-center text-sm font-semibold text-gray-900">
          <span className="mr-2 text-gray-400">{icon}</span>
          {title}
        </span>
        <span className="block text-sm leading-6 text-gray-500">{detail}</span>
      </span>
      <ArrowRight size={16} className="mt-1 text-gray-400" />
    </button>
  );
}

function EmptyCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <p className="text-base font-semibold text-gray-900">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500">{detail}</p>
    </div>
  );
}

function formatDate(value?: string): string {
  if (!value) return "Not submitted";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function SecondaryPage({
  route,
  onNavigate,
  onPracticeClick,
  onExamClick,
}: SecondaryPageProps) {
  const [progressList, setProgressList] = useState<QuestionProgress[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSession[]>([]);

  const refresh = useCallback(() => {
    void getAllProgress().then(setProgressList);
    void getAllExamSessions().then(setExamSessions);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats = calculateDashboardStats(questions.length, progressList);
  const notedProgress = progressList.filter((progress) => progress.note.trim().length > 0);
  const bookmarkedProgress = progressList.filter((progress) => progress.bookmarked);
  const topicRows = useMemo(
    () => calculateTopicProgress(questions, progressList),
    [progressList],
  );

  const pageMeta: Record<typeof route, { title: string; subtitle: string; icon: React.ReactNode }> = {
    topics: {
      title: "Topics",
      subtitle: "Topic analytics based on explicit question tags.",
      icon: <Layers size={18} />,
    },
    notes: {
      title: "My Notes",
      subtitle: "Questions where you wrote your own explanation or reminder.",
      icon: <PenLine size={18} />,
    },
    flashcards: {
      title: "Flashcards",
      subtitle: "A review surface for saved and incorrect questions.",
      icon: <FileQuestion size={18} />,
    },
    analytics: {
      title: "Analytics",
      subtitle: "High-level progress signals from local practice data.",
      icon: <Target size={18} />,
    },
    history: {
      title: "Study History",
      subtitle: "Saved mock exam sessions and recent activity.",
      icon: <Clock size={18} />,
    },
    focus: {
      title: "Focus Mode",
      subtitle: "A focused launchpad for the next useful study action.",
      icon: <Target size={18} />,
    },
  };
  const meta = pageMeta[route];

  return (
    <AppShell
      active={route}
      onNavigate={onNavigate}
      onDashboardClick={() => onNavigate("dashboard")}
      onPracticeClick={onPracticeClick}
      onExamClick={onExamClick}
    >
      <div className="space-y-6">
        <section>
          <div className="mb-2 flex items-center text-sm font-medium text-gray-500">
            <span className="mr-2">{meta.icon}</span>
            AWS Mastery
          </div>
          <h2 className="text-3xl font-bold text-gray-900">{meta.title}</h2>
          <p className="mt-1 text-sm text-gray-500">{meta.subtitle}</p>
        </section>

        {route === "topics" ? (
          topicRows.length > 0 ? (
            <section className="grid gap-4 lg:grid-cols-2">
              {topicRows.map((topic) => (
                <article
                  key={topic.label}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900">
                      {topic.label}
                    </h3>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500">
                      {topic.total} questions
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {topic.attempted}
                      </p>
                      <p className="text-xs text-gray-500">Attempted</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {topic.incorrect}
                      </p>
                      <p className="text-xs text-gray-500">Incorrect</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {topic.coveragePercent}%
                      </p>
                      <p className="text-xs text-gray-500">Coverage</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {topic.errorRatePercent}%
                      </p>
                      <p className="text-xs text-gray-500">Error rate</p>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <EmptyCard
              title="No topic data yet."
              detail="The current question bank does not include explicit topic tags, so topic analytics are hidden instead of using unreliable keyword guesses."
            />
          )
        ) : null}

        {route === "notes" ? (
          notedProgress.length > 0 ? (
            <section className="grid gap-4">
              {notedProgress.map((progress) => (
                <article
                  key={progress.questionId}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      Question #{progress.questionId}
                    </h3>
                    <button
                      type="button"
                      onClick={() => onPracticeClick("sequential")}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      Open bank
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">
                    {progress.note}
                  </p>
                </article>
              ))}
            </section>
          ) : (
            <EmptyCard
              title="No notes yet."
              detail="Open a practice question, use Add note, and your notes will collect here for review."
            />
          )
        ) : null}

        {route === "flashcards" ? (
          bookmarkedProgress.length > 0 || stats.incorrectQuestions > 0 ? (
            <section className="grid gap-4 sm:grid-cols-2">
              <ActionCard
                title="Review bookmarked"
                detail={`${bookmarkedProgress.length} saved questions are ready for a flashcard-style pass.`}
                icon={<Bookmark size={17} />}
                onClick={() => onPracticeClick("favorite")}
              />
              <ActionCard
                title="Review incorrect"
                detail={`${stats.incorrectQuestions} incorrect questions are available for active recall.`}
                icon={<XCircle size={17} />}
                onClick={() => onPracticeClick("incorrect")}
              />
            </section>
          ) : (
            <EmptyCard
              title="No flashcards yet."
              detail="Bookmark or miss questions during practice. They will become your flashcard review queue."
            />
          )
        ) : null}

        {route === "analytics" ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ActionCard
              title={`${stats.answeredQuestions} answered`}
              detail={`${stats.remainingQuestions} questions remain in the question bank.`}
              icon={<CheckCircle2 size={17} />}
              onClick={() => onPracticeClick("sequential")}
            />
            <ActionCard
              title={`${stats.accuracyPercent}% accuracy`}
              detail="Calculated from all saved answer attempts."
              icon={<Target size={17} />}
            />
            <ActionCard
              title={`${stats.incorrectQuestions} incorrect`}
              detail="Latest incorrect answers that need review."
              icon={<XCircle size={17} />}
              onClick={() => onPracticeClick("incorrect")}
            />
            <ActionCard
              title={`${examSessions.length} exams`}
              detail="Saved mock exam records."
              icon={<CalendarDays size={17} />}
              onClick={() => onNavigate("history")}
            />
          </section>
        ) : null}

        {route === "history" ? (
          examSessions.length > 0 ? (
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {examSessions.map((exam) => (
                <div
                  key={exam.id}
                  className="grid gap-2 border-b border-gray-100 p-4 text-sm last:border-b-0 sm:grid-cols-[1fr_auto_auto]"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      Mock exam · {exam.questionIds.length} questions
                    </p>
                    <p className="text-gray-500">{formatDate(exam.submittedAt ?? exam.startedAt)}</p>
                  </div>
                  <div className="font-medium text-gray-700">
                    Score {exam.score ?? 0}%
                  </div>
                  <div className="text-gray-500">
                    {Math.round(exam.durationSeconds / 60)} min
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <EmptyCard
              title="No exam history yet."
              detail="Start and submit a mock exam. Saved sessions will appear here."
            />
          )
        ) : null}

        {route === "focus" ? (
          <section className="grid gap-4 lg:grid-cols-3">
            <ActionCard
              title="Focused practice"
              detail="Start with sequential questions and keep momentum without extra setup."
              icon={<Target size={17} />}
              onClick={() => onPracticeClick("sequential")}
            />
            <ActionCard
              title="Review weak signal"
              detail="Use incorrect and guessed queues when you have enough attempts."
              icon={<XCircle size={17} />}
              onClick={() => onPracticeClick("incorrect")}
            />
            <ActionCard
              title="Full mock exam"
              detail={`Switch to exam mode when you want a timed ${EXAM_QUESTION_COUNT}-question run.`}
              icon={<Clock size={17} />}
              onClick={onExamClick}
            />
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
