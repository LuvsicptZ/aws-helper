import { useCallback, useEffect, useState, useMemo } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Moon, Search, Star, Sun, AlertCircle, LayoutGrid, RotateCcw } from "lucide-react";
import { AppShell } from "../components/AppShell";
import type { ShellRoute } from "../components/AppShell";
import { AnonymousProgressPrompt } from "../components/AnonymousProgressPrompt";
import { AuthPanel } from "../components/AuthPanel";
import { questions, totalQuestions } from "../data/questions";
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

  // Question Navigator States
  const [navigatorTab, setNavigatorTab] = useState<"all" | "incorrect" | "bookmarked" | "unattempted">("all");
  const [activeChunk, setActiveChunk] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const CHUNK_SIZE = 100;

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

  // Question Map Calculations
  const progressMap = useMemo(() => {
    return new Map(progressList.map((p) => [p.questionId, p]));
  }, [progressList]);

  const filteredMapQuestions = useMemo(() => {
    let list = totalQuestions === 0 ? [] : questions;

    if (navigatorTab === "incorrect") {
      list = list.filter((q) => progressMap.get(q.id)?.lastResult === "incorrect");
    } else if (navigatorTab === "bookmarked") {
      list = list.filter((q) => progressMap.get(q.id)?.bookmarked === true);
    } else if (navigatorTab === "unattempted") {
      list = list.filter((q) => {
        const p = progressMap.get(q.id);
        return !p || p.attempts === 0;
      });
    }

    if (searchQuery.trim()) {
      const qId = parseInt(searchQuery.trim(), 10);
      if (!isNaN(qId)) {
        list = list.filter((q) => q.id === qId);
      } else {
        const query = searchQuery.toLowerCase();
        list = list.filter((q) => q.stem.toLowerCase().includes(query));
      }
    }

    return list;
  }, [navigatorTab, searchQuery, progressMap]);

  const totalChunks = Math.ceil(filteredMapQuestions.length / CHUNK_SIZE);
  const safeChunk = Math.min(activeChunk, Math.max(0, totalChunks - 1));

  const displayQuestions = useMemo(() => {
    const needsChunking = navigatorTab === "all" || navigatorTab === "unattempted";
    if (needsChunking && !searchQuery.trim()) {
      const start = safeChunk * CHUNK_SIZE;
      return filteredMapQuestions.slice(start, start + CHUNK_SIZE);
    }
    return filteredMapQuestions;
  }, [filteredMapQuestions, navigatorTab, searchQuery, safeChunk]);

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

        <section className="dashboard-map-card" data-dashboard-question-map>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between dashboard-map-header">
            <div>
              <h2 className="dashboard-map-title flex items-center gap-2">
                <LayoutGrid size={20} className="text-amber-500" />
                Question Navigation Map
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Visual index of all 1,019 exam questions. Click a number to jump directly to it in practice mode.
              </p>
            </div>
            
            {/* Search Box */}
            <div className="relative w-full md:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search size={14} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID (e.g. 42) or keyword..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs dashboard-map-input focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              />
            </div>
          </div>

          {/* Filters and Tabs */}
          <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
            <div className="dashboard-map-tabs-mobile dashboard-map-control-bg">
              {(["all", "incorrect", "bookmarked"] as const).map((tab) => {
                const isActive = navigatorTab === tab;
                const labels: Record<typeof tab, string> = {
                  all: "All Questions",
                  incorrect: "Incorrect",
                  bookmarked: "Bookmarked",
                };
                
                let badgeVal = 0;
                let badgeColor = "dashboard-map-tab-badge--all";
                if (tab === "all") {
                  badgeVal = totalQuestions;
                } else if (tab === "incorrect") {
                  badgeVal = stats.incorrectQuestions;
                  badgeColor = "dashboard-map-tab-badge--incorrect";
                } else if (tab === "bookmarked") {
                  badgeVal = stats.bookmarkedQuestions;
                  badgeColor = "dashboard-map-tab-badge--bookmarked";
                }

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setNavigatorTab(tab);
                      setActiveChunk(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap ${
                      isActive
                        ? "dashboard-map-tab--active shadow-sm"
                        : "dashboard-map-tab"
                    }`}
                  >
                    <span className="dashboard-map-tab-label-full">{labels[tab]}</span>
                    <span className="dashboard-map-tab-label-short">
                      {tab === "all" ? "All" : tab === "incorrect" ? "Wrong" : "Saved"}
                    </span>
                    <span className={`dashboard-map-tab-badge ${badgeColor}`}>
                      {badgeVal}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Chunk selector (Pagination) */}
            {totalChunks > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safeChunk === 0}
                  onClick={() => setActiveChunk(c => Math.max(0, c - 1))}
                  className="p-1.5 rounded-lg dashboard-map-input hover:bg-slate-800/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <select
                  value={safeChunk}
                  onChange={(e) => setActiveChunk(parseInt(e.target.value, 10))}
                  className="dashboard-map-input text-xs py-1.5 px-2.5 rounded-lg focus:outline-none"
                >
                  {Array.from({ length: totalChunks }).map((_, idx) => {
                    const startRange = idx * CHUNK_SIZE + 1;
                    const endRange = Math.min(filteredMapQuestions.length, (idx + 1) * CHUNK_SIZE);
                    return (
                      <option key={idx} value={idx}>
                        Range {startRange} - {endRange}
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  disabled={safeChunk === totalChunks - 1}
                  onClick={() => setActiveChunk(c => Math.min(totalChunks - 1, c + 1))}
                  className="p-1.5 rounded-lg dashboard-map-input hover:bg-slate-800/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Grid display */}
          {displayQuestions.length > 0 ? (
            <div 
              className="grid gap-2 max-h-[400px] overflow-y-auto pr-1"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))" }}
            >
              {displayQuestions.map((q) => {
                const qProgress = progressMap.get(q.id);
                const isCorrect = qProgress?.lastResult === "correct";
                const isIncorrect = qProgress?.lastResult === "incorrect";
                const isBookmarked = qProgress?.bookmarked;
                
                let nodeStyle = "dashboard-map-node";
                if (isCorrect) {
                  nodeStyle = "dashboard-map-node--correct";
                } else if (isIncorrect) {
                  nodeStyle = "dashboard-map-node--incorrect";
                }
                
                const borderStyle = isBookmarked ? "border-amber-500 ring-1 ring-amber-500/30" : "border";

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => onPracticeClick("sequential", q.id - 1)}
                    title={`Question ${q.id}: ${q.stem.slice(0, 60)}...`}
                    className={`relative flex flex-col h-11 items-center justify-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${nodeStyle} ${borderStyle}`}
                  >
                    <span>{q.id}</span>
                    {isBookmarked && (
                      <span className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 text-slate-950">
                        <Star size={7} className="fill-slate-950" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-gray-200 dark:border-slate-700/60 rounded-xl bg-gray-50 dark:bg-slate-900/20">
              <AlertCircle size={24} className="mx-auto text-gray-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-gray-400 dark:text-slate-400">No questions found</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Try changing your filters or search query.</p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
