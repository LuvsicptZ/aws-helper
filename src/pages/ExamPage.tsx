import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Send, ArrowLeft, ArrowRight, Check, X, LayoutGrid } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { MarkdownText } from "../components/MarkdownText";

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
import { ANONYMOUS_OWNER_ID } from "../domain/practiceResume";

import { supabaseClient } from "../auth/supabaseClient";
import { syncExamSessionsWithSupabase } from "../sync/supabaseExamSync";

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

const CHOICE_KEYS: ChoiceKey[] = ["A", "B", "C", "D", "E", "F"];

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

  const [examId] = useState(createExamId);
  const [startedAt] = useState(() => new Date().toISOString());
  const [remainingSeconds, setRemainingSeconds] = useState(EXAM_DURATION_SECONDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, ChoiceKey[]>>({});
  const [submittedAt, setSubmittedAt] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [examSaveError, setExamSaveError] = useState<string>();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigatorDialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!isDrawerOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = navigatorDialogRef.current;
    dialog?.showModal();
    const activeQuestion = dialog?.querySelector<HTMLElement>('[aria-current="step"]');
    const grid = activeQuestion?.parentElement;
    if (activeQuestion && grid) {
      grid.scrollTop += activeQuestion.getBoundingClientRect().top - grid.getBoundingClientRect().top - grid.clientHeight / 2 + activeQuestion.clientHeight / 2;
      activeQuestion.focus({ preventScroll: true });
    }
    return () => { dialog?.close(); previousFocus?.focus(); };
  }, [isDrawerOpen]);
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
  const examPageRef = useRef<HTMLElement>(null);
  const previousQuestionId = useRef(question?.id);
  useEffect(() => {
    if (previousQuestionId.current === question?.id) return;
    const container = examPageRef.current?.closest(".app-shell-main");
    if (container instanceof HTMLElement) container.scrollTop = 0;
    examPageRef.current?.querySelector<HTMLElement>("#question-title")?.focus({ preventScroll: true });
    previousQuestionId.current = question?.id;
  }, [question?.id]);
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

      if (ownerId !== ANONYMOUS_OWNER_ID && supabaseClient) {
        void syncExamSessionsWithSupabase(supabaseClient, ownerId).catch(
          (error) => {
            console.error("Exam background sync failed", error);
          },
        );
      }
    } catch {
      setExamSaveError("We could not save your exam result. Keep this page open to review your answers.");
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
        <header className="zen-mobile-header">
          <span className="zen-mobile-header-title">{submittedAt ? "Exam review" : "Time remaining"}</span>
          <div className="zen-mobile-header-actions">
            <div className="exam-timer" role="timer" aria-label="Time remaining">
              {formatTime(remainingSeconds)}
            </div>
            {!submittedAt && <button className="ui-button ui-button--secondary exam-submit-button" type="button" aria-label="Submit Exam" title="Submit Exam" onClick={submitExamWithConfirmation} disabled={isSaving}><Send size={18} aria-hidden="true" />Submit exam</button>}
            <button aria-label="Open question navigator" aria-haspopup="dialog" aria-expanded={isDrawerOpen} onClick={() => setIsDrawerOpen(true)} className="zen-mobile-header-action" type="button">
              <LayoutGrid size={18} />
            </button>
          </div>
        </header>
      )}

      <div className="ui-product-surface zen-practice-page zen-practice-page--exam" data-focused-practice-layout>
        <article ref={examPageRef} className="zen-practice-main" aria-label="Question content">
          {question ? (
            <>
              {submittedAt && score && (
                <section aria-label="Exam score summary" className="exam-score" role="status">
                  <div className="exam-score-top"><CheckCircle2 size={32} strokeWidth={1.5} aria-hidden="true" /><div><p className="ui-eyebrow">Exam complete</p><h2>Score {score.scorePercent}%</h2></div></div>
                  <p>{score.correctQuestions} correct / {score.totalQuestions} total. {isSaving ? "Saving..." : examSaveError ? "Your result is shown below." : "Saved locally."}</p>
                  <dl className="exam-score-stats"><div><dt>Correct answers</dt><dd>{score.correctQuestions}</dd></div><div><dt>Incorrect / unanswered</dt><dd>{score.incorrectQuestions}</dd></div><div><dt>Time used</dt><dd>{formatTime(EXAM_DURATION_SECONDS - remainingSeconds)}</dd></div></dl>
                  {examSaveError && <p className="ui-message ui-message--error" role="alert">{examSaveError}</p>}
                  <p className="mt-6">Review each question below to understand your answers.</p>
                </section>
              )}
              <section className="zen-question-block" aria-labelledby="question-title">
                <h1 id="question-title" tabIndex={-1}>Question {currentIndex + 1} of {examQuestions.length}</h1><div className="focus-progress" role="progressbar" aria-label="Question position" aria-valuenow={currentIndex + 1} aria-valuemin={0} aria-valuemax={examQuestions.length}><span style={{ width: `${progressPercent}%` }} /></div><p className="question-stem">{question.stem}</p><p className="answer-hint">Choose {Array.isArray(question.answer) ? `${question.answer.length} answers` : "one answer"}.</p>
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
                          {shouldShowCorrect && <span className="option-state">Correct answer</span>}
                          {isIncorrectSelected && <span className="option-state">Your answer · Incorrect</span>}
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
                  <p><MarkdownText text={question.explanation} /></p>
                </section>
              )}

              <div className="zen-practice-actions">
                <button
                  type="button"
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  className="zen-secondary-button flex items-center justify-center gap-2 flex-1 md:flex-none"
                >
                  <ArrowLeft aria-hidden="true" size={16} />
                  <span>Previous</span>
                </button>

                <button
                  className="zen-next-button flex items-center justify-center gap-2 flex-1 md:flex-none ml-auto"
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
        </article>
      </div>

      {/* Mobile Drawer (Bottom Sheet) */}
      {isDrawerOpen && (
        <dialog ref={navigatorDialogRef} className="ui-dialog zen-navigator-drawer" aria-labelledby="navigator-title" onClose={() => setIsDrawerOpen(false)} onClick={event => { if (event.target === event.currentTarget) setIsDrawerOpen(false); }}>
            <div className="zen-navigator-drawer-header">
              <h2 id="navigator-title">Question Navigator</h2>
              <button className="ui-icon-button" aria-label="Close question navigator" onClick={() => setIsDrawerOpen(false)} type="button">
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
                          aria-current={isActive ? "step" : undefined}
                          aria-label={"Question " + (idx + 1) + ", " + (dotClass.includes("--correct") ? "correct" : dotClass.includes("--incorrect") ? "incorrect" : isAnswered ? "answered" : "unanswered")}
                    className={`zen-reader-page-dot ${dotClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
        </dialog>
      )}
    </AppShell>
  );
}
