import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  CalendarCheck,
  CheckCircle2,
  CircleHelp,
  Clock,
  Layers,
  Target,
  XCircle,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import type { ShellRoute } from "../components/AppShell";
import { AuthPanel } from "../components/AuthPanel";
import { AnonymousProgressPrompt } from "../components/AnonymousProgressPrompt";
import { questions, totalQuestions } from "../data/questions";
import {
  calculateDashboardStats,
  calculateRecentActivity,
  calculateWeakAreas,
} from "../domain/dashboard";
import type { PracticeMode } from "../domain/practiceMode";
import { practiceModeLabels } from "../domain/practiceMode";
import type { PracticeResume } from "../domain/practiceResume";
import type { QuestionProgress } from "../domain/progress";
import { getAllProgress } from "../db/progressRepository";

type DashboardPageProps = {
  onNavigate: (route: ShellRoute) => void;
  ownerId?: string;
  progressRefreshToken?: number;
  onPracticeClick: (mode?: PracticeMode) => void;
  onExamClick: () => void;
  practiceResume: PracticeResume;
  syncStatus?: string;
  showAnonymousProgressPrompt?: boolean;
  onMergeAnonymousProgress?: () => void;
  onKeepAnonymousProgressSeparate?: () => void;
  onSyncComplete?: () => void;
};

type StatCardProps = {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
  accent: string;
};

function StatCard({ label, value, detail, icon, accent }: StatCardProps) {
  return (
    <article className="relative flex min-h-40 flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center text-sm font-medium text-gray-600">
        <span className={`mr-2 ${accent}`}>{icon}</span>
        {label}
      </div>
      <div>
        <div className="mb-1 text-3xl font-bold text-gray-900">{value}</div>
        <p className="w-2/3 text-xs leading-tight text-gray-500">{detail}</p>
      </div>
      <svg
        className="absolute bottom-4 right-4 h-8 w-20"
        preserveAspectRatio="none"
        viewBox="0 0 100 30"
        aria-hidden="true"
      >
        <path
          d="M0,25 C20,25 30,10 50,20 C70,30 80,5 100,15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={accent}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </article>
  );
}

type WeakAreaProps = {
  label: string;
  percent: number;
  icon: React.ReactNode;
  iconClass: string;
};

function WeakArea({ label, percent, icon, iconClass }: WeakAreaProps) {
  return (
    <div className="flex items-center">
      <div
        className={`mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${iconClass}`}
      >
        {icon}
      </div>
      <div className="w-16 text-sm font-medium text-gray-700">{label}</div>
      <div className="mx-4 h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-[#0B1120]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="w-8 text-right text-sm text-gray-500">{percent}%</div>
    </div>
  );
}

function getProgressSource(progress: QuestionProgress): string {
  return progress.syncedAt ? "Synced" : "Local";
}

export function DashboardPage({
  ownerId = "anonymous",
  progressRefreshToken = 0,
  onNavigate,
  onPracticeClick,
  onExamClick,
  practiceResume,
  syncStatus,
  showAnonymousProgressPrompt = false,
  onMergeAnonymousProgress,
  onKeepAnonymousProgressSeparate,
  onSyncComplete,
}: DashboardPageProps) {
  const [progressList, setProgressList] = useState<QuestionProgress[]>([]);

  const refreshProgress = useCallback(() => {
    void getAllProgress(ownerId).then(setProgressList);
  }, [ownerId]);

  useEffect(() => {
    refreshProgress();
  }, [progressRefreshToken, refreshProgress]);

  const stats = calculateDashboardStats(totalQuestions, progressList);
  const weakAreas = calculateWeakAreas(questions, progressList);
  const recentActivity = calculateRecentActivity(progressList);
  const progressPercent =
    stats.totalQuestions === 0
      ? 0
      : Math.round((stats.answeredQuestions / stats.totalQuestions) * 100);
  const resumeMode = practiceResume.lastMode;
  const resumePosition = practiceResume.positions[resumeMode];
  const resumeLabel = resumePosition.questionId
    ? `Continue ${practiceModeLabels[resumeMode]} · Question ${resumePosition.questionId}`
    : "Continue Practice";

  return (
    <AppShell
      active="dashboard"
      onNavigate={onNavigate}
      onDashboardClick={() => onNavigate("dashboard")}
      onPracticeClick={onPracticeClick}
      onExamClick={onExamClick}
      headerActions={
        <AuthPanel
          onSyncComplete={() => {
            refreshProgress();
            onSyncComplete?.();
          }}
        />
      }
    >
      <div className="space-y-6">
        {syncStatus ? (
          <p aria-live="polite" className="text-sm text-gray-500">
            {syncStatus}
          </p>
        ) : null}

        {showAnonymousProgressPrompt &&
        onMergeAnonymousProgress &&
        onKeepAnonymousProgressSeparate ? (
          <AnonymousProgressPrompt
            onMerge={onMergeAnonymousProgress}
            onKeepSeparate={onKeepAnonymousProgressSeparate}
          />
        ) : null}

        <section className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="mb-1 text-3xl font-bold text-gray-900">
              Welcome back
            </h2>
            <p className="text-sm text-gray-500">
              Keep going one small session at a time.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <article className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div>
              <div className="mb-4 flex items-center font-medium text-gray-900">
                <Target size={18} className="mr-2 text-gray-400" />
                Continue Practice
              </div>
              <div className="mb-6">
                <div className="mb-2 text-4xl font-bold text-gray-900">
                  {stats.answeredQuestions} / {stats.totalQuestions}
                </div>
                <div className="mb-3 text-sm text-gray-500">
                  {progressPercent}% completed · {stats.remainingQuestions} questions remaining
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="relative h-2 rounded-full bg-[#0B1120]"
                    style={{ width: `${progressPercent}%` }}
                  >
                    <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-[#0B1120] shadow-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onPracticeClick(resumeMode)}
                className="inline-flex min-h-11 items-center rounded-xl bg-[#0B1120] px-5 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120]"
              >
                {resumeLabel}
                <ArrowRight size={14} className="ml-2" />
              </button>
              <button
                type="button"
                onClick={() => onPracticeClick("incorrect")}
                className="min-h-11 rounded-xl border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Review {stats.incorrectQuestions} Incorrect
              </button>
              <button
                type="button"
                onClick={onExamClick}
                className="min-h-11 rounded-xl border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Start Mock Exam
              </button>
            </div>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-1 flex items-center font-medium text-gray-900">
              <CalendarCheck size={18} className="mr-2 text-gray-400" />
              Today's Plan
            </div>
            <p className="mb-6 ml-6 text-xs text-gray-500">Suggested for today</p>

            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center text-sm text-gray-700">
                  <div className="mr-3 h-4 w-4 shrink-0 rounded-full border-2 border-blue-500" />
                  Regular questions
                </div>
                <span className="text-sm text-gray-500">20 questions</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center text-sm text-gray-700">
                  <div className="mr-3 h-4 w-4 shrink-0 rounded-full border-2 border-yellow-500" />
                  Review incorrect
                </div>
                <span className="text-sm text-gray-500">
                  {stats.incorrectQuestions} questions
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-700">
                  <div className="mr-3 h-4 w-4 shrink-0 rounded-full border-2 border-emerald-500" />
                  Review bookmarked
                </div>
                <span className="text-sm text-gray-500">
                  {stats.bookmarkedQuestions} questions
                </span>
              </div>
            </div>

            <button className="flex items-center text-sm font-medium text-gray-600 transition-colors hover:text-gray-900">
              Customize your plan
              <ArrowRight size={14} className="ml-2" />
            </button>
          </article>
        </section>

        <section className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          <StatCard
            label="Accuracy"
            value={`${stats.accuracyPercent}%`}
            detail="Based on all answer attempts"
            icon={<Target size={16} />}
            accent="text-purple-500"
          />
          <StatCard
            label="Incorrect"
            value={stats.incorrectQuestions}
            detail="Questions to review"
            icon={<XCircle size={16} />}
            accent="text-red-500"
          />
          <StatCard
            label="Bookmarked"
            value={stats.bookmarkedQuestions}
            detail="Questions saved for later"
            icon={<Bookmark size={16} />}
            accent="text-yellow-500"
          />
          <StatCard
            label="Guessed"
            value={stats.guessedQuestions}
            detail="Questions marked as guessed"
            icon={<CircleHelp size={16} />}
            accent="text-blue-500"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <div className="mb-1 flex items-center font-medium text-gray-900">
                <Layers size={18} className="mr-2 text-gray-400" />
                Weak Areas
              </div>
              <p className="ml-6 text-xs text-gray-500">
                Topics that need more attention
              </p>
            </div>

            <div className="flex-1 space-y-5">
              {weakAreas.map((area) => {
                return (
                  <WeakArea
                    key={area.label}
                    label={area.label}
                    percent={area.errorRatePercent}
                    icon={<Layers size={12} />}
                    iconClass="bg-gray-100 text-gray-500"
                  />
                );
              })}

              {weakAreas.length === 0 ? (
                <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  No weak areas yet. Answer more questions and incorrect topic
                  patterns will appear here.
                </p>
              ) : null}
            </div>
          </article>

          <article className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <div className="mb-1 flex items-center font-medium text-gray-900">
                <Clock size={18} className="mr-2 text-gray-400" />
                Recent Activity
              </div>
              <p className="ml-6 text-xs text-gray-500">
                Your latest question attempts
              </p>
            </div>

            <div className="flex-1 space-y-4">
              {recentActivity.map((progress) => {
                const isCorrect = progress.lastResult === "correct";

                return (
                  <div
                    key={progress.questionId}
                    className="flex items-center justify-between border-b border-gray-50 pb-3 text-sm last:border-b-0"
                  >
                    <div className="flex w-1/3 items-center">
                      {isCorrect ? (
                        <CheckCircle2 size={16} className="mr-2 text-emerald-500" />
                      ) : (
                        <XCircle size={16} className="mr-2 text-red-500" />
                      )}
                      <span className="font-medium text-gray-700">
                        Question #{progress.questionId}
                      </span>
                    </div>
                    <div className="w-1/4">
                      <span
                        className={[
                          "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
                          isCorrect
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-red-50 text-red-500",
                        ].join(" ")}
                      >
                        {isCorrect ? "Correct" : "Incorrect"}
                      </span>
                    </div>
                    <div className="w-1/4 text-gray-500">Practice</div>
                    <div className="w-1/6 text-right text-xs text-gray-400">
                      {getProgressSource(progress)}
                    </div>
                  </div>
                );
              })}

              {recentActivity.length === 0 ? (
                <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  No recent activity yet. Start a practice session to populate history.
                </p>
              ) : null}
            </div>
          </article>
        </section>
      </div>
    </AppShell>
  );
}
