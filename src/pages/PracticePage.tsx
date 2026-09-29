import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, Check, ChevronLeft, LayoutDashboard, X, FileText, Star, ChevronDown, ChevronUp, LayoutGrid, ListChecks, ClipboardList, CalendarX } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { MarkdownText } from "../components/MarkdownText";

import type { ShellRoute } from "../components/AppShell";
import { EmptyModeState } from "../components/EmptyModeState";
import { questions } from "../data/questions";
import type { ChoiceKey } from "../domain/question";
import { gradeAnswer, stripChoicePrefix } from "../domain/question";
import type { PracticeMode } from "../domain/practiceMode";
import { filterQuestionsByPracticeMode, practiceModeLabels } from "../domain/practiceMode";
import type { PracticePosition } from "../domain/practiceResume";
import { resolvePracticePosition } from "../domain/practiceResume";
import type { QuestionProgress } from "../domain/progress";
import {
  updateProgressAfterAnswer,
  updateProgressReviewMetadata,
} from "../domain/progress";
import {
  getAllProgress,
  getProgressForUpdate,
  saveProgress,
} from "../db/progressRepository";
import { StalePracticeGenerationError } from "../domain/practiceGeneration";
import { supabaseClient } from "../auth/supabaseClient";
import { syncQuestionProgress } from "../sync/supabasePracticeCoordinator";


const CHOICE_KEYS: ChoiceKey[] = ["A", "B", "C", "D", "E", "F"];

type PracticePageProps = {
  ownerId?: string;
  progressRefreshToken?: number;
  initialMode?: PracticeMode;
  resumePositions?: Record<PracticeMode, PracticePosition>;
  onPositionChange?: (
    mode: PracticeMode,
    position: Omit<PracticePosition, "updatedAt">,
  ) => void;
  onDashboardClick?: () => void;
  onPracticeClick?: (mode?: PracticeMode, initialIndex?: number) => void;
  onExamClick?: () => void;
  onNavigate?: (route: ShellRoute) => void;
};

function isCorrectChoice(answer: ChoiceKey | ChoiceKey[], choice: ChoiceKey) {
  return Array.isArray(answer) ? answer.includes(choice) : answer === choice;
}

function formatAnswer(answer: ChoiceKey | ChoiceKey[]) {
  return Array.isArray(answer) ? answer.join(", ") : answer;
}

function getModeLabel(mode: PracticeMode) {
  if (mode === "incorrect") return "Review incorrect";
  if (mode === "favorite") return "Review bookmarked";
  return "Question bank";
}

export function PracticePage({
  ownerId = "anonymous",
  progressRefreshToken,
  initialMode = "sequential",
  resumePositions,
  onPositionChange,
  onDashboardClick,
  onPracticeClick,
  onExamClick,
  onNavigate,
}: PracticePageProps) {

  const initialPosition = resumePositions?.[initialMode];
  const mode = initialMode;
  const [currentIndex, setCurrentIndex] = useState(initialPosition?.index ?? 0);
  const [answerState, setAnswerState] = useState<{
    questionId?: number;
    selected: ChoiceKey[];
    result?: "correct" | "incorrect";
  }>({ selected: [] });
  const [isSaving, setIsSaving] = useState(false);
  const [allProgress, setAllProgress] = useState<QuestionProgress[]>([]);
  const restoredMode = useRef<PracticeMode | undefined>(undefined);

  // Notes and Review States
  const [noteText, setNoteText] = useState("");
  const [isNoteSaving, setIsNoteSaving] = useState(false);
  const [noteSavedMessage, setNoteSavedMessage] = useState(false);
  const [practiceError, setPracticeError] = useState<string>();
  const noteSaveInFlight = useRef(false);

  // Background Sync Refs and Callback
  const isSyncing = useRef(false);
  const syncPending = useRef(false);
  const [isNavigatorExpanded, setIsNavigatorExpanded] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigatorDialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!isDrawerOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = navigatorDialogRef.current;
    dialog?.showModal();
    return () => { dialog?.close(); previousFocus?.focus(); };
  }, [isDrawerOpen]);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1023px)").matches : false
  );
  const explanationRef = useRef<HTMLElement>(null);
  const practicePageRef = useRef<HTMLDivElement>(null);

  // Mobile matchMedia listener
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function triggerBackgroundSync() {
    if (ownerId === "anonymous" || !supabaseClient) return;

    if (isSyncing.current) {
      syncPending.current = true;
      return;
    }

    isSyncing.current = true;
    syncPending.current = false;

    void (async () => {
      try {
        await syncQuestionProgress(supabaseClient, ownerId);
      } catch (err) {
        console.error("Background sync failed", err);
      } finally {
        isSyncing.current = false;
        if (syncPending.current) {
          triggerBackgroundSync();
        }
      }
    })();
  }

  const filteredQuestions = useMemo(
    () => filterQuestionsByPracticeMode(mode, questions, allProgress),
    [allProgress, mode],
  );
  const visibleTotal = filteredQuestions.length;
  const hasQuestions = visibleTotal > 0;
  const safeCurrentIndex = hasQuestions
    ? Math.min(currentIndex, visibleTotal - 1)
    : 0;
  const question = filteredQuestions[safeCurrentIndex];
  const currentProgress = question
    ? allProgress.find((progress) => progress.questionId === question.id)
    : undefined;
  const selected =
    answerState.questionId === question?.id
      ? answerState.selected
      : currentProgress?.lastSelected ?? [];
  const result =
    answerState.questionId === question?.id
      ? answerState.result
      : currentProgress?.lastResult;
  const requiredSelectionCount = question
    ? Array.isArray(question.answer)
      ? question.answer.length
      : 1
    : 0;
  const hasCompleteSelection = selected.length === requiredSelectionCount;

  // Auto-scroll to explanation on mobile after auto-submit grading
  useEffect(() => {
    if (result && isMobile && explanationRef.current) {
      const timeout = window.setTimeout(() => {
        explanationRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
      }, 80);
      return () => window.clearTimeout(timeout);
    }
  }, [result, isMobile]);

  const progressPercent =
    visibleTotal === 0 ? 0 : ((safeCurrentIndex + 1) / visibleTotal) * 100;

  useEffect(() => {
    void getAllProgress(ownerId).then(progress => {
      setAllProgress(progress);
      setAnswerState({ selected: [] });
    });
  }, [ownerId, progressRefreshToken]);

  const previousQuestionId = useRef(question?.id);
  useEffect(() => {
    if (!question) return;

    onPositionChange?.(mode, {
      questionId: question.id,
      index: safeCurrentIndex,
    });
  }, [mode, onPositionChange, question, safeCurrentIndex]);

  useEffect(() => {
    const scrollContainer = practicePageRef.current?.closest(".app-shell-main");
    if (scrollContainer instanceof HTMLElement) {
      scrollContainer.scrollTop = 0;
    }
    if (previousQuestionId.current !== question?.id) {
      practicePageRef.current?.querySelector<HTMLElement>("#question-title")?.focus({ preventScroll: true });
      previousQuestionId.current = question?.id;
    }
  }, [question?.id]);

  useEffect(() => {
    const savedPosition = resumePositions?.[mode];
    if (
      !savedPosition ||
      filteredQuestions.length === 0 ||
      restoredMode.current === mode
    ) {
      return;
    }

    setCurrentIndex(
      resolvePracticePosition(
        savedPosition,
        filteredQuestions.map((item) => item.id),
      ),
    );
    restoredMode.current = mode;
  }, [filteredQuestions, mode, resumePositions]);

  // Sync note text when active question or saved note changes
  useEffect(() => {
    queueMicrotask(() => setNoteText(currentProgress?.note ?? ""));
  }, [question?.id, currentProgress?.note]);

  async function submitAnswer(selectedAnswer: ChoiceKey[]) {
    if (!question) return;
    if (
      selectedAnswer.length !== requiredSelectionCount ||
      result ||
      isSaving
    ) return;

    const nextResult = gradeAnswer(question.answer, selectedAnswer);
    setPracticeError(undefined);
    setAnswerState({
      questionId: question.id,
      selected: selectedAnswer,
      result: nextResult,
    });
    setIsSaving(true);

    try {
      const existingProgress = await getProgressForUpdate(question.id, ownerId);

      await saveProgress(
        updateProgressAfterAnswer(existingProgress, selectedAnswer, nextResult),
        ownerId,
        existingProgress.resetGeneration,
      );

      setAllProgress(await getAllProgress(ownerId));
      triggerBackgroundSync();
    } catch (error) {
      resetAnswerState();
      await handlePracticeWriteError(
        error,
        "We couldn't save your answer. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleBookmark() {
    if (!question) return;
    setPracticeError(undefined);
    try {
      const existingProgress = await getProgressForUpdate(question.id, ownerId);
      const nextProgress = updateProgressReviewMetadata(existingProgress, {
        bookmarked: !existingProgress.bookmarked,
      });

      await saveProgress(
        nextProgress,
        ownerId,
        existingProgress.resetGeneration,
      );
      setAllProgress(await getAllProgress(ownerId));
      triggerBackgroundSync();
    } catch (error) {
      await handlePracticeWriteError(
        error,
        "We couldn't update this bookmark. Please try again.",
      );
    }
  }

  async function saveNote(text: string) {
    if (!question || isSaving || noteSaveInFlight.current) return;
    noteSaveInFlight.current = true;
    setIsNoteSaving(true);
    setNoteSavedMessage(false);
    setPracticeError(undefined);

    try {
      const existingProgress = await getProgressForUpdate(question.id, ownerId);

      const nextProgress = updateProgressReviewMetadata(existingProgress, {
        note: text,
      });

      await saveProgress(
        nextProgress,
        ownerId,
        existingProgress.resetGeneration,
      );
      setAllProgress(await getAllProgress(ownerId));
      triggerBackgroundSync();

      setNoteSavedMessage(true);
      setTimeout(() => setNoteSavedMessage(false), 2000);
    } catch (error) {
      await handlePracticeWriteError(
        error,
        "We couldn't save your note. Please try again.",
      );
    } finally {
      noteSaveInFlight.current = false;
      setIsNoteSaving(false);
    }
  }

  async function handlePracticeWriteError(error: unknown, message: string) {
    if (error instanceof StalePracticeGenerationError) {
      resetAnswerState();
      setAllProgress(await getAllProgress(ownerId));
      return;
    }

    console.error(message, error);
    setPracticeError(message);
  }

  function handleAnswerChange(choice: ChoiceKey) {
    if (!question || result || isSaving) return;

    const required = Array.isArray(question.answer) ? question.answer.length : 1;
    const isSingleSelect = required === 1;

    if (isSingleSelect) {
      setAnswerState({
        questionId: question.id,
        selected: [choice],
        result,
      });
      void submitAnswer([choice]);
      return;
    }

    // Support toggling for multi-select questions in practice mode
    let nextSelected: ChoiceKey[];
    if (selected.includes(choice)) {
      nextSelected = selected.filter((c) => c !== choice);
    } else {
      nextSelected = [...selected, choice].slice(-required);
    }

    setAnswerState({
      questionId: question.id,
      selected: nextSelected,
      result,
    });
  }

  function resetAnswerState() {
    setAnswerState({ selected: [] });
    setPracticeError(undefined);
  }

  function goToNext() {
    resetAnswerState();
    setCurrentIndex(() => Math.min(visibleTotal - 1, safeCurrentIndex + 1));
  }

  function goToPrevious() {
    resetAnswerState();
    setCurrentIndex(() => Math.max(0, safeCurrentIndex - 1));
  }

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (!question) return;
      if (document.querySelector("dialog[open]") || event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const shortcut = event.key.toLowerCase();
      if (shortcut === "enter" && target instanceof HTMLElement && target.closest("button, a, summary")) return;
      const shortcutChoices: Record<string, ChoiceKey> = {
        "1": "A",
        "2": "B",
        "3": "C",
        "4": "D",
        "5": "E",
        "6": "F",
      };

      if (shortcut in shortcutChoices) {
        const choice = shortcutChoices[shortcut];
        if (question.options[choice] !== undefined && !result && !isSaving) {
          event.preventDefault();
          handleAnswerChange(choice);
        }
        return;
      }

      if (shortcut === "enter" && !result && hasCompleteSelection) {
        event.preventDefault();
        void submitAnswer(selected);
        return;
      }

      if (shortcut === "enter" && result && safeCurrentIndex < visibleTotal - 1) {
        event.preventDefault();
        goToNext();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });

  return (
    <AppShell
      active="practice"
      hideHeader
      immersive
      practiceMode={mode}
      onNavigate={onNavigate}
      onDashboardClick={onDashboardClick}
      onPracticeClick={onPracticeClick}
      onExamClick={onExamClick}
    >
      {/* Mobile Top Header */}
      <header className="zen-mobile-header">
        <button
          aria-label="Back to dashboard"
          onClick={onDashboardClick}
          className="zen-mobile-header-back"
          type="button"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="zen-mobile-header-title">
          {hasQuestions
            ? `Question ${safeCurrentIndex + 1} of ${visibleTotal}`
            : practiceModeLabels[mode] || "Practice"}
        </span>
        {hasQuestions && (
          <div className="zen-mobile-header-actions">
            <button
              aria-label={currentProgress?.bookmarked ? "Remove bookmark" : "Bookmark question"}
              aria-pressed={Boolean(currentProgress?.bookmarked)} onClick={toggleBookmark}
              className="zen-mobile-header-action"
              type="button"
            >
              <Bookmark size={18} className={currentProgress?.bookmarked ? "fill-current" : ""} />
            </button>
            <button
              aria-label="Open question navigator" aria-haspopup="dialog" aria-expanded={isDrawerOpen}
              onClick={() => setIsDrawerOpen(true)}
              className="zen-mobile-header-action"
              type="button"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        )}
      </header>

      <div
        ref={practicePageRef}
        className="ui-product-surface zen-practice-page zen-practice-page--study"
        data-focused-practice-layout
      >
        <div className="zen-practice-progress" aria-hidden="true">
          <span style={{ width: `${progressPercent}%` }} />
        </div>

        <aside className="zen-practice-sidebar flex flex-col" aria-label="Practice session">
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
                    className={`zen-reader-nav-item ${
                      mode === "sequential" ? "zen-reader-nav-item--active" : ""
                    }`}
                    aria-current={mode === "sequential" ? "page" : undefined}
                    onClick={() => onPracticeClick?.("sequential")}
                    type="button"
                  >
                    <span className="zen-reader-nav-icon">
                      <ListChecks size={16} />
                    </span>
                    <span>Question Bank</span>
                  </button>

                  <button
                    className="zen-reader-nav-item"
                    onClick={onExamClick}
                    type="button"
                  >
                    <span className="zen-reader-nav-icon">
                      <ClipboardList size={16} />
                    </span>
                    <span>Mock Exams</span>
                  </button>

                  <button
                    className={`zen-reader-nav-item ${
                      mode === "incorrect" ? "zen-reader-nav-item--active" : ""
                    }`}
                    aria-current={mode === "incorrect" ? "page" : undefined}
                    onClick={() => onPracticeClick?.("incorrect")}
                    type="button"
                  >
                    <span className="zen-reader-nav-icon">
                      <CalendarX size={16} />
                    </span>
                    <span>Review Incorrect</span>
                  </button>

                  <button
                    className={`zen-reader-nav-item ${
                      mode === "favorite" ? "zen-reader-nav-item--active" : ""
                    }`}
                    aria-current={mode === "favorite" ? "page" : undefined}
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

            </div>
          </div>
        </aside>

        <article className="zen-practice-main" aria-label="Question content">
          {question ? (
            <>
              <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
                <nav className="zen-practice-breadcrumb !mb-0" aria-label="Practice path">
                  <button onClick={onDashboardClick} type="button">
                    <LayoutDashboard aria-hidden="true" size={14} />
                    Dashboard
                  </button>
                  <span aria-hidden="true">/</span>
                  <span>{getModeLabel(mode)}</span>
                  <span aria-hidden="true">/</span>
                  <strong>
                    Question {safeCurrentIndex + 1} of {visibleTotal}
                  </strong>
                </nav>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={Boolean(currentProgress?.bookmarked)} onClick={toggleBookmark}
                    className="ui-button ui-button--tertiary reader-bookmark"                  >
                    <Bookmark
                      size={14}
                      className={currentProgress?.bookmarked ? "fill-current" : ""}
                    />
                    <span>{currentProgress?.bookmarked ? "Bookmarked" : "Bookmark"}</span>
                  </button>
                </div>
              </div>

              <section className="zen-question-block" aria-labelledby="question-title">
                <h1 id="question-title" tabIndex={-1}>Question {safeCurrentIndex + 1}</h1><p className="question-stem">{question.stem}</p><p className="answer-hint">Choose {Array.isArray(question.answer) ? `${question.answer.length} answers` : "one answer"}.</p>
              </section>

              <section className="zen-options-list" aria-label="Answer options">
                {CHOICE_KEYS.filter((choice) => question.options[choice]).map(
                  (choice) => {
                    const isSelected = selected.includes(choice);
                    const isCorrect = result ? isCorrectChoice(question.answer, choice) : false;
                    const isIncorrectSelected = result && isSelected && !isCorrect;
                    const shouldShowCorrect = result && isCorrect;
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
                        disabled={Boolean(result)}
                        onClick={() => handleAnswerChange(choice)}
                        className={[
                          "zen-option",
                          isSelected && !result ? "zen-option--selected" : "",
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
                  }
                )}
              </section>

              {result && (
                <section
                  ref={explanationRef as React.Ref<HTMLElement>}
                  className={[
                    "zen-explanation",
                    result === "correct"
                      ? "zen-explanation--correct"
                      : "zen-explanation--incorrect",
                  ].join(" ")}
                  aria-live="polite"
                >
                  <p className="zen-explanation-kicker">
                    {result === "correct" ? "Correct" : "Incorrect"}
                  </p>
                  <p className="zen-explanation-answer">
                    Correct answer: {formatAnswer(question.answer)}
                  </p>
                  <p><MarkdownText text={question.explanation} /></p>
                </section>
              )}

              {practiceError && (
                <p
                  className="ui-message ui-message--error mt-6"
                  role="alert"
                >
                  {practiceError}
                </p>
              )}

              {/* Study Notes */}
              <section className="notes-panel" aria-labelledby="notes-label">
                <label id="notes-label" htmlFor="study-notes">
                  <FileText size={16} aria-hidden="true" />
                  Study Notes
                </label>
                <p id="notes-help" className="notes-caption">Capture what you learned. Notes save when you leave the field.</p>

                <textarea
                  id="study-notes" aria-describedby="notes-help" className="zen-practice-notes-textarea"
                  placeholder="Write your study notes here. They will auto-save when you click away..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onBlur={() => saveNote(noteText)}
                />

                <div className="notes-toolbar">
                  <span role="status" aria-live="polite">
                    {isNoteSaving ? "Saving..." : noteSavedMessage ? "Saved" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => saveNote(noteText)}
                    disabled={isNoteSaving}
                    className="ui-button ui-button--secondary"
                  >
                    Save Note
                  </button>
                </div>
              </section>

              <div className="zen-practice-actions">
                {safeCurrentIndex > 0 && (
                  <button
                    className="zen-secondary-button flex items-center justify-center gap-2 flex-1 md:flex-none"
                    onClick={goToPrevious}
                    type="button"
                  >
                    <ArrowLeft aria-hidden="true" size={16} />
                    <span>Previous</span>
                  </button>
                )}

                {/* Single-select answers are auto-graded on mobile, so the action
                    remains available for moving past an unanswered question. */}
                {(() => {
                  const isSingleSelect = !Array.isArray(question.answer);
                  const canNavigateWithoutSubmission = isMobile && isSingleSelect;

                  return (
                    <button
                      className="zen-next-button ml-auto flex items-center justify-center gap-2 flex-1 md:flex-none"
                      onClick={() => {
                        if (result || canNavigateWithoutSubmission) {
                          if (safeCurrentIndex === visibleTotal - 1) {
                            onDashboardClick?.();
                            return;
                          }
                          goToNext();
                          return;
                        }
                        void submitAnswer(selected);
                      }}
                      type="button"
                      disabled={
                        !result &&
                        !canNavigateWithoutSubmission &&
                        !hasCompleteSelection
                      }
                    >
                      <span>
                        {result || canNavigateWithoutSubmission
                          ? safeCurrentIndex === visibleTotal - 1
                            ? "Back to Dashboard"
                            : "Next Question"
                          : "Submit Answer"}
                      </span>
                      <ArrowRight aria-hidden="true" size={16} />
                    </button>
                  );
                })()}
              </div>
            </>
          ) : (
            <EmptyModeState mode={mode} />
          )}
        </article>
        <aside className="reader-index" aria-label="Question navigation">
              {/* Sidebar Question Navigator */}
              {hasQuestions && (
                <div>
                  <button
                    type="button"
                    onClick={() => setIsNavigatorExpanded(!isNavigatorExpanded)}
                    aria-expanded={isNavigatorExpanded}
                    aria-controls="question-index"
                    className="zen-reader-nav-toggle"
                  >
                    <span className="zen-reader-nav-heading">
                      <span className="zen-reader-nav-section !mb-0 !px-0">
                        Question Navigator
                      </span>
                      <span className="zen-reader-nav-count">
                        {safeCurrentIndex + 1} / {visibleTotal}
                      </span>
                    </span>
                    <span className="zen-reader-nav-toggle-icon">
                      {isNavigatorExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </button>
                  <div
                    id="question-index" className={`zen-practice-navigator-grid zen-reader-page-grid ${
                      isNavigatorExpanded ? "zen-practice-navigator-grid--expanded" : ""
                    }`}
                  >
                    {filteredQuestions.map((q, idx) => {
                      const qProgress = allProgress.find((p) => p.questionId === q.id);
                      const isCorrect = qProgress?.lastResult === "correct";
                      const isIncorrect = qProgress?.lastResult === "incorrect";
                      const isBookmarked = qProgress?.bookmarked;
                      const isActive = idx === safeCurrentIndex;

                      let dotClass = "zen-practice-navigator-dot";
                      if (isCorrect) {
                        dotClass = "zen-practice-navigator-dot--correct";
                      } else if (isIncorrect) {
                        dotClass = "zen-practice-navigator-dot--incorrect";
                      }

                      if (isActive) {
                        dotClass += " zen-practice-navigator-dot--active";
                      }

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => {
                            resetAnswerState();
                            setCurrentIndex(idx);
                          }}
                          title={`Question ${idx + 1}`}
                          aria-current={isActive ? "step" : undefined}
                          aria-label={"Question " + (idx + 1) + ", " + (isCorrect ? "correct" : isIncorrect ? "incorrect" : "unanswered") + (isBookmarked ? ", bookmarked" : "")}
                          className={`zen-reader-page-dot ${dotClass}`}
                        >
                          {idx + 1}
                          {isBookmarked && (
                            <span className="zen-reader-page-dot-bookmark">
                              <Star size={6} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
<div className="navigator-legend" aria-hidden="true"><span><i className="legend-correct" />Correct</span><span><i className="legend-incorrect" />Incorrect</span><span><i />Unanswered</span></div>
        </aside>
      </div>

      {/* Mobile Drawer (Bottom Sheet) */}
      {isDrawerOpen && (
        <dialog ref={navigatorDialogRef} className="ui-dialog zen-navigator-drawer" aria-labelledby="navigator-title" onClose={() => setIsDrawerOpen(false)} onClick={event => { if (event.target === event.currentTarget) setIsDrawerOpen(false); }}>
            <div className="zen-navigator-drawer-header">
              <h2 id="navigator-title">Question Navigator</h2>
              <button
                className="ui-icon-button" aria-label="Close question navigator"
                onClick={() => setIsDrawerOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="zen-navigator-drawer-grid">
              {filteredQuestions.map((q, idx) => {
                const qProgress = allProgress.find((p) => p.questionId === q.id);
                const isCorrect = qProgress?.lastResult === "correct";
                const isIncorrect = qProgress?.lastResult === "incorrect";
                const isBookmarked = qProgress?.bookmarked;
                const isActive = idx === safeCurrentIndex;

                let dotClass = "zen-practice-navigator-dot";
                if (isCorrect) {
                  dotClass = "zen-practice-navigator-dot--correct";
                } else if (isIncorrect) {
                  dotClass = "zen-practice-navigator-dot--incorrect";
                }

                if (isActive) {
                  dotClass += " zen-practice-navigator-dot--active";
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      resetAnswerState();
                      setCurrentIndex(idx);
                      setIsDrawerOpen(false);
                    }}
                    title={`Question ${idx + 1}`}
                          aria-current={isActive ? "step" : undefined}
                          aria-label={"Question " + (idx + 1) + ", " + (isCorrect ? "correct" : isIncorrect ? "incorrect" : "unanswered") + (isBookmarked ? ", bookmarked" : "")}
                    className={`zen-reader-page-dot ${dotClass}`}
                  >
                    {idx + 1}
                    {isBookmarked && (
                      <span className="zen-reader-page-dot-bookmark">
                        <Star size={6} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
        </dialog>
      )}
    </AppShell>
  );
}
