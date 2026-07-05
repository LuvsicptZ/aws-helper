import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Send, ArrowRight, ChevronLeft, LayoutDashboard, Check, X, ChevronDown, ChevronUp, Bookmark, LayoutGrid, ListChecks, ClipboardList, CalendarX, Moon, Sun } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { BrandLogo } from "../components/BrandLogo";
import type { ShellRoute } from "../components/AppShell";
import { questions } from "../data/questions";
import {
  createExamQuestionIds,
  EXAM_DURATION_SECONDS,
  scoreExam,
} from "../domain/exam";
import type { ChoiceKey } from "../domain/question";
import { normalizeAnswer, stripChoicePrefix } from "../domain/question";
import { saveExamSession } from "../db/examRepository";
import type { PracticeMode } from "../domain/practiceMode";
import { useTheme } from "../theme/useTheme";

type ExamPageProps = {
  ownerId?: string;
  onDashboardClick: () => void;
  onPracticeClick?: (mode?: PracticeMode, initialIndex?: number) => void;
  onExamClick?: () => void;
  onNavigate?: (route: ShellRoute) => void;
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(
    2,
    "0",
  )}`;
}

function createExamId(): string {
  return `exam-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const CHOICE_KEYS: ChoiceKey[] = ["A", "B", "C", "D"];

function isCorrectChoice(answer: ChoiceKey | ChoiceKey[], choice: ChoiceKey) {
  return Array.isArray(answer) ? answer.includes(choice) : answer === choice;
}

function formatAnswer(answer: ChoiceKey | ChoiceKey[]) {
  return Array.isArray(answer) ? answer.join(", ") : answer;
}

function isCorrectAnswerSelected(answer: ChoiceKey | ChoiceKey[], selected: ChoiceKey[]) {
  const expected = normalizeAnswer(answer);
  if (expected.length !== selected.length) return false;
  return expected.every((c) => selected.includes(c));
}

export function ExamPage({
  ownerId = "anonymous",
  onDashboardClick,
  onPracticeClick,
  onExamClick,
  onNavigate,
}: ExamPageProps) {
  const { isDark, toggleTheme } = useTheme();
  const [examId] = useState(createExamId);
  const [startedAt] = useState(() => new Date().toISOString());
  const [remainingSeconds, setRemainingSeconds] = useState(EXAM_DURATION_SECONDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, ChoiceKey[]>>({});
  const [submittedAt, setSubmittedAt] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [isNavigatorExpanded, setIsNavigatorExpanded] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [examQuestionIds] = useState(() =>
    createExamQuestionIds(questions.map((question) => question.id)),
  );
  const examQuestions = useMemo(
    () =>
      examQuestionIds
        .map((questionId) => questions.find((question) => question.id === questionId))
        .filter((question) => question !== undefined),
    [examQuestionIds],
  );
  const question = examQuestions[currentIndex];
  const selected = question ? answers[question.id] ?? [] : [];
  const score = submittedAt ? scoreExam(examQuestions, answers) : undefined;

  const progressPercent = examQuestions.length === 0 ? 0 : ((currentIndex + 1) / examQuestions.length) * 100;

  const submitExam = useCallback(async (durationSeconds: number) => {
    if (submittedAt || isSaving) return;

    const nextSubmittedAt = new Date().toISOString();
    const nextScore = scoreExam(examQuestions, answers);
    setSubmittedAt(nextSubmittedAt);
    setIsSaving(true);

    try {
      await saveExamSession({
        id: examId,
        questionIds: examQuestionIds,
        startedAt,
        submittedAt: nextSubmittedAt,
        durationSeconds,
        answers,
        score: nextScore.scorePercent,
      }, ownerId);
    } finally {
      setIsSaving(false);
    }
  }, [
    answers,
    examId,
    examQuestionIds,
    examQuestions,
    isSaving,
    ownerId,
    startedAt,
    submittedAt,
  ]);

  useEffect(() => {
    if (submittedAt) return;

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(intervalId);
          void submitExam(EXAM_DURATION_SECONDS);
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [submittedAt, submitExam]);

  function handleAnswerChange(nextSelected: ChoiceKey[]) {
    if (!question || submittedAt) return;

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [question.id]: nextSelected,
    }));
  }

  function goToPrevious() {
    setCurrentIndex((index) => Math.max(0, index - 1));
  }

  function goToNext() {
    setCurrentIndex((index) => Math.min(examQuestions.length - 1, index + 1));
  }

  function submitExamWithConfirmation() {
    const answeredCount = Object.keys(answers).length;

    if (
      answeredCount < examQuestions.length &&
      !window.confirm(
        `You answered ${answeredCount} / ${examQuestions.length} questions. Submit anyway?`,
      )
    ) {
      return;
    }

    void submitExam(EXAM_DURATION_SECONDS - remainingSeconds);
  }

  return (
    <AppShell
      active="exam"
      hideHeader
      immersive
      onNavigate={onNavigate}
      onDashboardClick={onDashboardClick}
      onPracticeClick={onPracticeClick}
      onExamClick={onExamClick}
    >
      {/* Mobile Top Header */}
      {examQuestions.length > 0 && (
        <header className="zen-mobile-header lg:hidden">
          <button onClick={onDashboardClick} className="zen-mobile-header-back" type="button">
            <ChevronLeft size={20} />
          </button>
          <span className="zen-mobile-header-title">
            Question {currentIndex + 1} of {examQuestions.length}
          </span>
          <div className="zen-mobile-header-actions">
            <div className="flex items-center text-xs font-semibold mr-2 tabular-nums opacity-80">
              {formatTime(remainingSeconds)}
            </div>
            <button
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              className="zen-mobile-header-action"
              onClick={toggleTheme}
              title={isDark ? "Switch to light theme" : "Switch to dark theme"}
              type="button"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => setIsDrawerOpen(true)} className="zen-mobile-header-action" type="button">
              <LayoutGrid size={18} />
            </button>
          </div>
        </header>
      )}

      <div className="zen-practice-page" data-focused-practice-layout>
        <div className="zen-practice-progress" aria-hidden="true">
          <span style={{ width: `${progressPercent}%` }} />
        </div>

        <aside className="zen-practice-sidebar flex flex-col" aria-label="Exam session">
          <div className="flex h-16 items-center justify-between gap-3 px-6 shrink-0">
            <BrandLogo className="h-11 w-auto" onClick={onDashboardClick} />
            <button
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              className="zen-practice-theme-button"
              onClick={toggleTheme}
              title={isDark ? "Switch to light theme" : "Switch to dark theme"}
              type="button"
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-6">
              <div>
                <button
                  className="zen-reader-nav-item"
                  onClick={onDashboardClick}
                  type="button"
                >
                  <span className="zen-reader-nav-icon">
                    <LayoutDashboard size={16} />
                  </span>
                  <span>Dashboard</span>
                </button>
              </div>

              <div>
                <h3 className="zen-reader-nav-section">
                  Practice
                </h3>
                <nav className="zen-reader-nav-list">
                  <button
                    className="zen-reader-nav-item"
                    onClick={() => onPracticeClick?.("sequential")}
                    type="button"
                  >
                    <span className="zen-reader-nav-icon">
                      <ListChecks size={16} />
                    </span>
                    <span>Question Bank</span>
                  </button>

                  <button
                    className="zen-reader-nav-item zen-reader-nav-item--active"
                    onClick={onExamClick}
                    type="button"
                  >
                    <span className="zen-reader-nav-icon">
                      <ClipboardList size={16} />
                    </span>
                    <span>Mock Exams</span>
                  </button>

                  <button
                    className="zen-reader-nav-item"
                    onClick={() => onPracticeClick?.("incorrect")}
                    type="button"
                  >
                    <span className="zen-reader-nav-icon">
                      <CalendarX size={16} />
                    </span>
                    <span>Review Incorrect</span>
                  </button>

                  <button
                    className="zen-reader-nav-item"
                    onClick={() => onPracticeClick?.("favorite")}
                    type="button"
                  >
                    <span className="zen-reader-nav-icon">
                      <Bookmark size={16} />
                    </span>
                    <span>Review Bookmarked</span>
                  </button>
                </nav>
              </div>

              <div>
                <h3 className="mb-2 px-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-gray-400">
                  Session Stats
                </h3>
                <dl className="zen-practice-stats px-3">
                  <div>
                    <dt>Remaining</dt>
                    <dd className="tabular-nums">{formatTime(remainingSeconds)}</dd>
                  </div>
                  <div>
                    <dt>Progress</dt>
                    <dd>
                      {Object.keys(answers).length} / {examQuestions.length}
                    </dd>
                  </div>
                </dl>

                {!submittedAt && (
                  <button
                    type="button"
                    onClick={submitExamWithConfirmation}
                    disabled={isSaving}
                    className="mt-6 flex w-full min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    <Send size={15} />
                    <span>Submit Exam</span>
                  </button>
                )}
              </div>

              {/* Sidebar Question Navigator */}
              {examQuestions.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setIsNavigatorExpanded(!isNavigatorExpanded)}
                    className="zen-reader-nav-toggle"
                  >
                    <span className="zen-reader-nav-heading">
                      <span className="zen-reader-nav-section !mb-0 !px-0">
                        Question Navigator
                      </span>
                      <span className="zen-reader-nav-count">
                        {currentIndex + 1} / {examQuestions.length}
                      </span>
                    </span>
                    <span className="zen-reader-nav-toggle-icon">
                      {isNavigatorExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </button>
                  <div
                    className={`zen-practice-navigator-grid zen-reader-page-grid ${
                      isNavigatorExpanded ? "zen-practice-navigator-grid--expanded" : ""
                    }`}
                  >
                    {examQuestions.map((q, idx) => {
                      const isAnswered = (answers[q.id]?.length ?? 0) > 0;
                      const isActive = idx === currentIndex;
                      
                      let dotClass = "zen-practice-navigator-dot";
                      
                      if (submittedAt) {
                        const isCorrect = isCorrectAnswerSelected(q.answer, answers[q.id] ?? []);
                        dotClass = isCorrect
                          ? "zen-practice-navigator-dot--correct"
                          : "zen-practice-navigator-dot--incorrect";
                      } else if (isAnswered) {
                        dotClass = "zen-practice-navigator-dot--answered";
                      }
                      
                      if (isActive) {
                        dotClass += " zen-practice-navigator-dot--active";
                      }

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => {
                            setCurrentIndex(idx);
                          }}
                          title={`Question ${idx + 1}`}
                          className={`zen-reader-page-dot ${dotClass}`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="zen-practice-main">
          {question ? (
            <>
              <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
                <nav className="zen-practice-breadcrumb !mb-0" aria-label="Practice path">
                  <button onClick={onDashboardClick} type="button">
                    <LayoutDashboard aria-hidden="true" size={14} />
                    Dashboard
                  </button>
                  <span aria-hidden="true">/</span>
                  <span>Mock Exam</span>
                  <span aria-hidden="true">/</span>
                  <strong>
                    Question {currentIndex + 1} of {examQuestions.length}
                  </strong>
                </nav>
              </div>

              {submittedAt && score && (
                <section
                  aria-label="Exam score summary"
                  className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm sm:p-6 mb-8 text-slate-800"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
                      <CheckCircle2 size={20} />
                    </span>
                    <div>
                      <p className="text-base font-semibold text-emerald-950">
                        Score {score.scorePercent}%
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        {score.correctQuestions} correct / {score.totalQuestions} total.
                        {isSaving ? " Saving..." : " Saved locally."}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <section className="zen-question-block" aria-labelledby="question-title">
                <h1 id="question-title">"{question.stem}"</h1>
              </section>

              <section className="zen-options-list" aria-label="Answer options">
                {CHOICE_KEYS.filter((choice) => question.options[choice]).map((choice) => {
                  const isSelected = selected.includes(choice);
                  const isCorrect = submittedAt ? isCorrectChoice(question.answer, choice) : false;
                  const isIncorrectSelected = submittedAt && isSelected && !isCorrect;
                  const shouldShowCorrect = submittedAt && isCorrect;
                  const stateClass = shouldShowCorrect
                    ? "zen-option--correct"
                    : isIncorrectSelected
                      ? "zen-option--incorrect"
                      : "";

                  return (
                    <button
                      key={choice}
                      type="button"
                      aria-pressed={isSelected}
                      disabled={Boolean(submittedAt)}
                      onClick={() => {
                        if (submittedAt) return;
                        
                        const required = normalizeAnswer(question.answer).length;
                        let nextSelected: ChoiceKey[];
                        if (required === 1) {
                          nextSelected = [choice];
                        } else {
                          if (selected.includes(choice)) {
                            nextSelected = selected.filter((c) => c !== choice);
                          } else {
                            nextSelected = [...selected, choice].slice(-required);
                          }
                        }
                        
                        handleAnswerChange(nextSelected);
                      }}
                      className={[
                        "zen-option",
                        isSelected && !submittedAt ? "zen-option--selected" : "",
                        stateClass,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="zen-option-marker">
                        {shouldShowCorrect ? (
                          <Check aria-hidden="true" size={14} strokeWidth={2.4} />
                        ) : isIncorrectSelected ? (
                          <X aria-hidden="true" size={14} strokeWidth={2.1} />
                        ) : (
                          choice
                        )}
                      </span>
                      <span className="zen-option-copy">
                        {stripChoicePrefix(choice, question.options[choice] ?? "")}
                      </span>
                    </button>
                  );
                })}
              </section>

              {submittedAt && (
                <section
                  className={[
                    "zen-explanation",
                    isCorrectAnswerSelected(question.answer, selected)
                      ? "zen-explanation--correct"
                      : "zen-explanation--incorrect",
                  ].join(" ")}
                  aria-live="polite"
                >
                  <p className="zen-explanation-kicker">
                    {isCorrectAnswerSelected(question.answer, selected) ? "Correct" : "Incorrect"}
                  </p>
                  <p className="zen-explanation-answer">
                    Correct answer: {formatAnswer(question.answer)}
                  </p>
                  <p>{question.explanation}</p>
                </section>
              )}

              <div className="zen-practice-actions flex justify-between items-center mt-8">
                <button
                  type="button"
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  className="zen-secondary-button"
                >
                  Previous
                </button>

                <button
                  className="zen-next-button"
                  onClick={() => {
                    if (currentIndex === examQuestions.length - 1) {
                      if (submittedAt) {
                        onDashboardClick?.();
                      } else {
                        submitExamWithConfirmation();
                      }
                      return;
                    }
                    goToNext();
                  }}
                  type="button"
                >
                  <span>
                    {currentIndex === examQuestions.length - 1
                      ? submittedAt
                        ? "Back to Dashboard"
                        : "Submit Exam"
                      : "Next Question"}
                  </span>
                  <ArrowRight aria-hidden="true" size={16} />
                </button>
              </div>
            </>
          ) : null}
        </main>
      </div>

      {/* Mobile Drawer (Bottom Sheet) */}
      {isDrawerOpen && (
        <div className="zen-navigator-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="zen-navigator-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="zen-navigator-drawer-header">
              <h3>Question Navigator</h3>
              <button onClick={() => setIsDrawerOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>
            <div className="zen-navigator-drawer-grid">
              {examQuestions.map((q, idx) => {
                const isAnswered = (answers[q.id]?.length ?? 0) > 0;
                const isActive = idx === currentIndex;

                let dotClass = "zen-practice-navigator-dot";
                if (submittedAt) {
                  const isCorrect = isCorrectAnswerSelected(q.answer, answers[q.id] ?? []);
                  dotClass = isCorrect
                    ? "zen-practice-navigator-dot--correct"
                    : "zen-practice-navigator-dot--incorrect";
                } else if (isAnswered) {
                  dotClass = "zen-practice-navigator-dot--answered";
                }

                if (isActive) {
                  dotClass += " zen-practice-navigator-dot--active";
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsDrawerOpen(false);
                    }}
                    title={`Question ${idx + 1}`}
                    className={`zen-reader-page-dot ${dotClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
