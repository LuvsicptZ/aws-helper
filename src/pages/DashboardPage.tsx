import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Moon, Sun, RotateCcw } from "lucide-react";
import { AppShell } from "../components/AppShell";
import type { ShellRoute } from "../components/AppShell";
import { AnonymousProgressPrompt } from "../components/AnonymousProgressPrompt";
import { AuthPanel } from "../components/AuthPanel";
import { totalQuestions } from "../data/questions";
import { calculateDashboardStats } from "../domain/dashboard";
import type { PracticeMode } from "../domain/practiceMode";
import { practiceModeLabels } from "../domain/practiceMode";
import type { PracticeResume } from "../domain/practiceResume";
import type { QuestionProgress } from "../domain/progress";
import { getAllProgress } from "../db/progressRepository";
import { useAuth } from "../auth/authContext";
import { useTheme } from "../theme/useTheme";

type DashboardPageProps = {
  onNavigate: (route: ShellRoute) => void;
  ownerId?: string;
  progressRefreshToken?: number;
  onPracticeClick: (mode?: PracticeMode, initialIndex?: number) => void;
  onExamClick: () => void;
  practiceResume: PracticeResume;
  showAnonymousProgressPrompt?: boolean;
  onMergeAnonymousProgress?: () => void;
  onKeepAnonymousProgressSeparate?: () => void;
  onResetProgress?: () => Promise<void>;
};

function getDashboardDisplayName(email?: string): string {
  if (!email) return "Ryan";

  const localPart = email.split("@")[0] ?? "";
  const match = localPart.match(/[a-zA-Z]+/);
  const name = match?.[0] ?? "Ryan";

  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export function DashboardPage({
  ownerId = "anonymous",
  progressRefreshToken = 0,
  onNavigate,
  onPracticeClick,
  onExamClick,
  practiceResume,
  showAnonymousProgressPrompt = false,
  onMergeAnonymousProgress,
  onKeepAnonymousProgressSeparate,
  onResetProgress,
}: DashboardPageProps) {
  const { session } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [progressList, setProgressList] = useState<QuestionProgress[]>([]);



  const refreshProgress = useCallback(() => {
    void getAllProgress(ownerId).then(setProgressList);
  }, [ownerId]);

  useEffect(() => {
    refreshProgress();
  }, [progressRefreshToken, refreshProgress]);

  const stats = calculateDashboardStats(totalQuestions, progressList);
  const progressPercent =
    stats.totalQuestions === 0
      ? 0
      : Math.round((stats.answeredQuestions / stats.totalQuestions) * 100);
  const resumeMode =
    practiceResume.lastMode === "incorrect" || practiceResume.lastMode === "favorite"
      ? practiceResume.lastMode
      : "sequential";
  const resumePosition = practiceResume.positions[resumeMode];
  const resumeQuestionLabel = resumePosition.questionId
    ? `Question ${resumePosition.questionId}`
    : "Question 1";
  const resumeContext = resumePosition.questionId
    ? `${practiceModeLabels[resumeMode]} mode · ${progressPercent}% complete`
    : "Start a clean practice session";
  const displayName = getDashboardDisplayName(session?.user.email);



  return (
    <AppShell
      active="dashboard"
      hideHeader
      onNavigate={onNavigate}
      onDashboardClick={() => onNavigate("dashboard")}
      onPracticeClick={onPracticeClick}
      onExamClick={onExamClick}
      sidebarBadges={{
        incorrect: stats.incorrectQuestions,
        favorite: stats.bookmarkedQuestions,
      }}
      variant="studio"
    >
      <div className="dashboard-prototype" data-dashboard-prototype>
        {showAnonymousProgressPrompt &&
        onMergeAnonymousProgress &&
        onKeepAnonymousProgressSeparate ? (
          <AnonymousProgressPrompt
            onMerge={onMergeAnonymousProgress}
            onKeepSeparate={onKeepAnonymousProgressSeparate}
          />
        ) : null}

        <div className="dashboard-prototype__topbar">
          {session ? <AuthPanel /> : null}
          {onResetProgress && (
            <button
              type="button"
              className="dashboard-prototype__reset-btn"
              onClick={onResetProgress}
              title="Reset All Progress"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
          <button
            type="button"
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            className="dashboard-prototype__theme"
            onClick={toggleTheme}
            title={isDark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {isDark ? (
              <Sun aria-hidden="true" size={13} />
            ) : (
              <Moon aria-hidden="true" size={13} />
            )}
            <span>Theme</span>
          </button>
        </div>

        <header className="dashboard-prototype__header">
          <h1>
            Welcome back, <span>{displayName}</span>{" "}
            <span aria-hidden="true">👋</span>
          </h1>
          <p>Let's continue your AWS journey.</p>
        </header>

        {/* Study Command Center Dashboard */}
        <div className="study-command-center grid grid-cols-1 md:grid-cols-3 border-t border-b border-gray-200 dark:border-gray-800/50 py-8 mb-8 mt-4 gap-y-3 md:gap-y-0">
          {/* Column 1: Progress */}
          <div className="study-command-zone pr-6 md:border-r border-gray-200/50 dark:border-gray-800/50">
            <span className="study-command-eyebrow">
              Progress Status
            </span>
            <div className="mt-4">
              <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Answered</span>
              <strong className="text-3xl font-extrabold text-gray-900 dark:text-white block mt-1 leading-none">
                {stats.answeredQuestions} <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">/ {stats.totalQuestions}</span>
              </strong>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Accuracy</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 block mt-1">{stats.accuracyPercent}%</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Remaining</span>
                <span className="text-base font-bold text-gray-700 dark:text-gray-300 block mt-1">{stats.remainingQuestions}</span>
              </div>
            </div>
          </div>

          {/* Column 2: Continue Practice */}
          <div 
            className="study-command-zone px-0 md:px-6 md:border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col justify-between"
            data-dashboard-resume-action
          >
            <div>
              <span className="study-command-eyebrow">
                Continue Practice
              </span>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-3.5 leading-tight">{resumeQuestionLabel}</h2>
              <p className="dashboard-prototype__context mt-1.5 text-xs text-gray-500 dark:text-gray-400">{resumeContext}</p>
              
              <div
                className="dashboard-prototype__progress mt-4"
                data-dashboard-progress-strip
              >
                <div
                  aria-label={`${stats.answeredQuestions} of ${stats.totalQuestions} questions completed`}
                  aria-valuemax={stats.totalQuestions}
                  aria-valuemin={0}
                  aria-valuenow={stats.answeredQuestions}
                  className="dashboard-prototype__progress-track"
                  role="progressbar"
                >
                  <div style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => onPracticeClick(resumeMode)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-xl hover:bg-gray-700 dark:hover:bg-gray-100 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5 w-fit"
                aria-label={`Continue practice from ${resumeQuestionLabel}`}
              >
                <span>Resume Practice</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Column 3: Review Queue */}
          <div 
            className="study-command-zone pl-0 md:pl-6 flex flex-col justify-between"
            data-dashboard-secondary-actions
          >
            <div>
              <span className="study-command-eyebrow">
                Review Queue
              </span>
              
              <div className="mt-3.5 space-y-2">
                <button
                  type="button"
                  onClick={() => onPracticeClick("incorrect")}
                  className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-gray-100/50 dark:hover:bg-slate-800/40 transition-all group text-left cursor-pointer"
                  aria-label="Review incorrect questions"
                >
                  <div>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">Review Incorrect</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">Incorrect questions that need another look</p>
                  </div>
                  <span className="text-red-500 font-bold text-xs bg-red-500/10 px-2 py-0.5 rounded flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    {stats.incorrectQuestions} <ArrowRight size={12} />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onPracticeClick("favorite")}
                  className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-gray-100/50 dark:hover:bg-slate-800/40 transition-all group text-left cursor-pointer"
                  aria-label="Review Bookmarked questions"
                >
                  <div>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">Review Bookmarked</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">Bookmarked questions for reference</p>
                  </div>
                  <span className="text-amber-500 font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    {stats.bookmarkedQuestions} <ArrowRight size={12} />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>


      </div>
    </AppShell>
  );
}
