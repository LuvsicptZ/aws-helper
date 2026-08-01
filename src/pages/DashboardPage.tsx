import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Moon, Sun, RotateCcw, ClipboardList, LogOut } from "lucide-react";
import { AppShell } from "../components/AppShell";
import type { ShellRoute } from "../components/AppShell";
import { AnonymousProgressPrompt } from "../components/AnonymousProgressPrompt";
import { AuthPanel } from "../components/AuthPanel";
import { totalQuestions } from "../data/questions";
import { calculateDashboardStats } from "../domain/dashboard";
import type { PracticeMode } from "../domain/practiceMode";
import type { PracticeResume } from "../domain/practiceResume";
import type { QuestionProgress } from "../domain/progress";
import { getAllProgress } from "../db/progressRepository";
import { getAllExamSessions } from "../db/examRepository";
import type { ExamSession } from "../domain/exam";
import { useAuth } from "../auth/authContext";
import { useTheme } from "../theme/useTheme";
import { supabaseClient } from "../auth/supabaseClient";

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
  const [examSessions, setExamSessions] = useState<ExamSession[]>([]);

  const refreshProgress = useCallback(() => {
    void getAllProgress(ownerId).then(setProgressList);
  }, [ownerId]);

  const refreshSessions = useCallback(() => {
    void getAllExamSessions(ownerId).then(setExamSessions);
  }, [ownerId]);

  useEffect(() => {
    refreshProgress();
    refreshSessions();
  }, [progressRefreshToken, refreshProgress, refreshSessions]);

  const stats = calculateDashboardStats(totalQuestions, progressList);
  const progressPercent =
    stats.totalQuestions === 0
      ? 0
      : Math.round((stats.answeredQuestions / stats.totalQuestions) * 100);
  const resumeMode = "sequential";
  const resumePosition = practiceResume.positions[resumeMode];
  const resumeQuestionLabel = resumePosition.questionId
    ? `Question ${resumePosition.questionId}`
    : "Question 1";
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
      <div className="ui-product-surface minimal-dashboard">
        {showAnonymousProgressPrompt &&
        onMergeAnonymousProgress &&
        onKeepAnonymousProgressSeparate ? (
          <AnonymousProgressPrompt
            onMerge={onMergeAnonymousProgress}
            onKeepSeparate={onKeepAnonymousProgressSeparate}
          />
        ) : null}

        {/* Minimal Header */}
        <div className="minimal-header">
          <div className="minimal-title">
            <span className="md:hidden">AWS Mastery</span>
          </div>
          <div className="flex items-center gap-4">
            {onResetProgress && (
              <button
                type="button"
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex items-center gap-1.5 cursor-pointer bg-transparent border-0"
                onClick={onResetProgress}
                title="Reset All Progress"
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
            <button
              type="button"
              className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex items-center gap-1.5 cursor-pointer bg-transparent border-0"
              onClick={toggleTheme}
              title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            >
              {isDark ? <Sun size={13} /> : <Moon size={13} />}
              <span className="hidden sm:inline">Theme</span>
            </button>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-800" />
            {session ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  {displayName}
                </span>
                <button
                  onClick={() => void supabaseClient?.auth.signOut()}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 cursor-pointer bg-transparent border-0 flex items-center gap-1"
                  title="Sign out"
                >
                  <LogOut size={12} />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            ) : (
              <AuthPanel />
            )}
          </div>
        </div>

        {/* Main "Continue where you left off" Hero Area */}
        <div className="minimal-hero-container">
          <div className="minimal-hero-content">
            <span className="minimal-hero-eyebrow">Continue where you left off</span>
            <h1 className="minimal-hero-title">{resumeQuestionLabel}</h1>
            <p className="minimal-hero-subtitle">
              AWS Solutions Architect Associate · {stats.answeredQuestions} of {stats.totalQuestions}
            </p>

            {/* Custom Premium Progress Slider */}
            <div className="minimal-progress-wrapper">
              <div className="minimal-progress-bar-container">
                <div
                  className="minimal-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
                <div
                  className="minimal-progress-thumb"
                  style={{ left: `${progressPercent}%` }}
                />
              </div>
              <div className="minimal-progress-percentage">
                {progressPercent}%
              </div>
            </div>

            {/* Action buttons */}
            <div className="minimal-btn-stack">
              <button
                type="button"
                onClick={() => onPracticeClick(resumeMode)}
                className="minimal-btn-primary"
              >
                <span>Continue practice</span>
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => onPracticeClick("sequential")}
                className="minimal-btn-secondary"
              >
                Browse questions
              </button>
            </div>
          </div>

        </div>

        {/* Mock Exam & Review List */}
        <div className="minimal-list-section">
          <div className="minimal-list-row">
            <div className="minimal-row-info">
              <span className="minimal-row-title">Mock exam</span>
              <span className="minimal-row-meta">65 questions · 130 minutes</span>
            </div>
            <button
              onClick={onExamClick}
              className="minimal-row-action"
              type="button"
            >
              <span>Start</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="minimal-list-row">
            <div className="minimal-row-info">
              <span className="minimal-row-title">Review incorrect</span>
              <span className="minimal-row-meta">
                {stats.incorrectQuestions} incorrect questions
              </span>
            </div>
            <button
              onClick={() => onPracticeClick("incorrect")}
              className="minimal-row-action"
              type="button"
            >
              <span>Open</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="minimal-list-row">
            <div className="minimal-row-info">
              <span className="minimal-row-title">Review bookmarked</span>
              <span className="minimal-row-meta">
                {stats.bookmarkedQuestions} bookmarked questions
              </span>
            </div>
            <button
              onClick={() => onPracticeClick("favorite")}
              className="minimal-row-action"
              type="button"
            >
              <span>Open</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Recent Simulator Attempts */}
        <div className="mt-16">
          <div className="minimal-hero-eyebrow mb-6">
            Recent Simulator Attempts
          </div>
          
          {examSessions.length > 0 ? (
            <div className="minimal-list-section">
              {examSessions.slice(0, 4).map((sess) => {
                const dateStr = new Date(sess.startedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const totalQ = sess.questionIds.length;
                const answeredCount = Object.keys(sess.answers).length;
                
                let status = "In Progress";
                let scoreText: string;
                let isPassed = false;
                
                if (sess.submittedAt && sess.score !== undefined) {
                  const pct = Math.round(sess.score);
                  status = "Submitted";
                  scoreText = `${pct}%`;
                  isPassed = pct >= 72;
                } else {
                  scoreText = `${answeredCount} / ${totalQ} answered`;
                }

                const scoreColorClass = sess.submittedAt 
                  ? (isPassed ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-amber-600 dark:text-amber-500 font-bold") 
                  : "text-blue-500 font-bold";

                return (
                  <button
                    key={sess.id}
                    type="button"
                    aria-label="Open mock exam attempt"
                    onClick={onExamClick}
                    className="minimal-list-row minimal-attempt-row"
                  >
                    <div className="minimal-row-info minimal-attempt-summary flex-1">
                      <span className="minimal-row-title text-sm font-semibold">
                        Mock Exam Simulator
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500">
                        {dateStr}
                      </span>
                    </div>

                    <div className="minimal-attempt-result text-right">
                      <span className={`text-sm block ${scoreColorClass}`}>
                        {scoreText}
                      </span>
                      <span
                        className="minimal-attempt-result-separator"
                        aria-hidden="true"
                      >
                        ·
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 block">
                        {status}
                      </span>
                    </div>

                    <span
                      className="minimal-row-action minimal-attempt-action"
                    >
                      <span className="minimal-attempt-action-label">Open</span>
                      <ArrowRight size={14} />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-gray-200 dark:border-slate-800/60 rounded-2xl bg-white/10 dark:bg-slate-950/20 text-center max-w-lg mx-auto">
              <div className="p-3 rounded-2xl bg-gray-100/80 dark:bg-amber-500/5 text-gray-400 dark:text-amber-500/50 mb-4">
                <ClipboardList size={22} />
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-slate-200 block">
                No simulator attempts yet
              </span>
              <p className="text-xs text-gray-400 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
                Complete a timed Mock Exam to test your readiness and track your scores here.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
