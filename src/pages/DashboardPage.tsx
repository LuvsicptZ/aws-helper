import { useCallback, useEffect, useState } from "react";
import { ArrowRight, RotateCcw, ClipboardList, BookOpen, Bookmark, CalendarX } from "lucide-react";
import { AppShell } from "../components/AppShell";
import type { ShellRoute } from "../components/AppShell";
import { AnonymousProgressPrompt } from "../components/AnonymousProgressPrompt";

import { totalQuestions } from "../data/questions";
import { calculateDashboardStats } from "../domain/dashboard";
import type { PracticeMode } from "../domain/practiceMode";
import type { PracticeResume } from "../domain/practiceResume";
import type { QuestionProgress } from "../domain/progress";
import { getAllProgress } from "../db/progressRepository";
import { getAllExamSessions } from "../db/examRepository";
import type { ExamSession } from "../domain/exam";
import { useAuth } from "../auth/authContext";



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



  const modes = [
    { title: "Question bank", eyebrow: "01 / Practice", description: `${stats.totalQuestions.toLocaleString()} questions. One step at a time.`, icon: BookOpen, tone: "coral", action: () => onPracticeClick("sequential"), label: "Browse questions" },
    { title: "Mock exam", eyebrow: "02 / Test yourself", description: "65 questions · 130 minutes", icon: ClipboardList, tone: "blue", action: onExamClick, label: "Start exam" },
    { title: "Review incorrect", eyebrow: "03 / Learn again", description: `${stats.incorrectQuestions} incorrect questions`, icon: CalendarX, tone: "magenta", action: () => onPracticeClick("incorrect"), label: "Review incorrect questions" },
    { title: "Review bookmarked", eyebrow: "04 / Your collection", description: `${stats.bookmarkedQuestions} bookmarked questions`, icon: Bookmark, tone: "purple", action: () => onPracticeClick("favorite"), label: "Review bookmarks" },
  ];
  return (
    <AppShell active="dashboard" onNavigate={onNavigate} onDashboardClick={() => onNavigate("dashboard")} onPracticeClick={onPracticeClick} onExamClick={onExamClick} sidebarBadges={{ incorrect: stats.incorrectQuestions, favorite: stats.bookmarkedQuestions }} variant="studio">
      <div className="ui-product-surface minimal-dashboard">
        {showAnonymousProgressPrompt && onMergeAnonymousProgress && onKeepAnonymousProgressSeparate && <AnonymousProgressPrompt onMerge={onMergeAnonymousProgress} onKeepSeparate={onKeepAnonymousProgressSeparate} />}
        <section className="minimal-hero-container" aria-labelledby="dashboard-title">
          <div className="dashboard-intro"><span className="ui-eyebrow">AWS SAA-C03 / Your learning space</span><h1 id="dashboard-title">Build knowledge.<br />Find your confidence.</h1><p>Welcome back, {displayName}. Your next question is ready.</p></div>
          <div className="dashboard-resume">
            <div><p className="ui-eyebrow">Continue where you left off</p><h2>{resumeQuestionLabel}</h2><p>AWS Solutions Architect Associate</p></div>
            <div className="dashboard-resume-actions"><button className="ui-button ui-button--primary" type="button" onClick={() => onPracticeClick(resumeMode)}>Continue practice <ArrowRight size={16} aria-hidden="true" /></button><button className="ui-button ui-button--secondary" type="button" onClick={() => onPracticeClick("sequential")}>Browse questions</button></div>
          </div>
          <div className="dashboard-progress"><div className="progress-caption"><span>Question bank completion</span><span>{stats.answeredQuestions} of {stats.totalQuestions} · {progressPercent}%</span></div><div className="minimal-progress-bar-container" role="progressbar" aria-label="Question bank completion" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progressPercent}%` }} /><span className="minimal-progress-thumb" aria-hidden="true" /></div></div>
        </section>
        <dl className="dashboard-stats" aria-label="Practice statistics">{[[stats.answeredQuestions, "Questions answered"], [stats.remainingQuestions, "Questions remaining"], [stats.answeredQuestions ? `${stats.accuracyPercent}%` : "—", "Answer accuracy"], [examSessions.filter(s => s.submittedAt).length, "Exams completed"]].map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <section className="dashboard-modes" aria-labelledby="modes-title"><div className="section-heading"><div><span className="ui-eyebrow">A way forward</span><h2 id="modes-title">Choose your practice.</h2></div><p>Build understanding, then put it to the test.</p></div><div className="mode-matrix">{modes.map(({ title, eyebrow, description, icon: Icon, tone, action, label }) => <article key={title} className={`mode-card mode-card--${tone}`}><div className="mode-card-top"><span>{eyebrow}</span><Icon size={24} strokeWidth={1.5} aria-hidden="true" /></div><h3>{title}</h3><p>{description}</p><button type="button" onClick={action} className="ui-button mode-card-action" aria-label={label}>{title === "Mock exam" ? "Start" : "Open"}<ArrowRight size={16} aria-hidden="true" /></button></article>)}</div></section>
        <section className="dashboard-history" aria-labelledby="history-title"><div className="section-heading"><div><span className="ui-eyebrow">Keep track</span><h2 id="history-title">Recent Simulator Attempts</h2></div>{onResetProgress && <button className="ui-button ui-button--tertiary" type="button" onClick={() => void onResetProgress()} aria-label="Reset All Progress"><RotateCcw size={16} aria-hidden="true" />Reset progress</button>}</div>
          {examSessions.length ? <div className="history-list">{examSessions.slice(0, 4).map(sess => <button key={sess.id} type="button" onClick={onExamClick} aria-label="Open mock exam attempt" className="history-row"><span className="history-icon"><ClipboardList size={20} aria-hidden="true" /></span><span className="history-summary"><strong>Mock Exam Simulator</strong><time dateTime={sess.startedAt}>{new Date(sess.startedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></span><span className="history-score"><strong>{sess.submittedAt && sess.score !== undefined ? `${Math.round(sess.score)}%` : `${Object.keys(sess.answers).length} / ${sess.questionIds.length} answered`}</strong><span>{sess.submittedAt ? "Submitted" : "In Progress"}</span></span><span className="minimal-attempt-action-label">Open <ArrowRight size={16} aria-hidden="true" /></span></button>)}</div> : <div className="ui-empty history-empty"><ClipboardList size={32} strokeWidth={1.5} aria-hidden="true" /><h3>No simulator attempts yet</h3><p>Complete a timed Mock Exam to test your readiness and track your scores here.</p><button className="ui-button ui-button--secondary" onClick={onExamClick} type="button">Take your first exam <ArrowRight size={16} aria-hidden="true" /></button></div>}
        </section>
        <footer className="dashboard-footer"><span>AWS Mastery</span><p>Practice with purpose. Learn at your own pace.</p><span>SAA-C03</span></footer>
      </div>
    </AppShell>
  );
}
