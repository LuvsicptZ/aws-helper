import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  CircleUserRound,
  Sun,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import type { ShellRoute } from "../components/AppShell";
import { AnswerOptions } from "../components/AnswerOptions";
import { EmptyModeState } from "../components/EmptyModeState";
import { ExplanationPanel } from "../components/ExplanationPanel";
import { QuestionCard } from "../components/QuestionCard";
import { QuestionNavigator } from "../components/QuestionNavigator";
import { QuestionReviewPanel } from "../components/QuestionReviewPanel";
import { questions } from "../data/questions";
import type { ChoiceKey } from "../domain/question";
import { gradeAnswer, normalizeAnswer } from "../domain/question";
import type { PracticeMode } from "../domain/practiceMode";
import {
  filterQuestionsByPracticeMode,
  shuffleQuestions,
} from "../domain/practiceMode";
import type { PracticePosition } from "../domain/practiceResume";
import {
  repairRandomQuestionIds,
  resolvePracticePosition,
} from "../domain/practiceResume";
import type { QuestionProgress } from "../domain/progress";
import {
  createEmptyProgress,
  updateProgressAfterAnswer,
  updateProgressReviewMetadata,
} from "../domain/progress";
import {
  getAllProgress,
  getProgressByQuestionId,
  saveProgress,
} from "../db/progressRepository";

function upsertProgress(
  progressList: QuestionProgress[],
  progress: QuestionProgress,
): QuestionProgress[] {
  const exists = progressList.some((item) => item.questionId === progress.questionId);

  if (!exists) {
    return [...progressList, progress];
  }

  return progressList.map((item) =>
    item.questionId === progress.questionId ? progress : item,
  );
}

type PracticePageProps = {
  ownerId?: string;
  initialMode?: PracticeMode;
  resumePositions?: Record<PracticeMode, PracticePosition>;
  onPositionChange?: (
    mode: PracticeMode,
    position: Omit<PracticePosition, "updatedAt">,
  ) => void;
  onDashboardClick?: () => void;
  onPracticeClick?: (mode?: PracticeMode) => void;
  onExamClick?: () => void;
  onNavigate?: (route: ShellRoute) => void;
};

export function PracticePage({
  ownerId = "anonymous",
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
  const [randomQuestions] = useState(() => {
    if (!initialPosition?.randomQuestionIds) {
      return shuffleQuestions(questions);
    }

    const questionById = new Map(questions.map((item) => [item.id, item]));
    return repairRandomQuestionIds(
      initialPosition.randomQuestionIds,
      questions.map((item) => item.id),
    )
      .map((questionId) => questionById.get(questionId))
      .filter((item): item is (typeof questions)[number] => item !== undefined);
  });

  const filteredQuestions = useMemo(
    () => filterQuestionsByPracticeMode(mode, questions, allProgress),
    [allProgress, mode],
  );
  const visibleQuestions = mode === "random" ? randomQuestions : filteredQuestions;
  const visibleTotal = visibleQuestions.length;
  const hasQuestions = visibleTotal > 0;
  const safeCurrentIndex = hasQuestions
    ? Math.min(currentIndex, visibleTotal - 1)
    : 0;
  const question = visibleQuestions[safeCurrentIndex];
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
  const isMultiAnswer = question ? Array.isArray(question.answer) : false;
  const restoredMode = useRef<PracticeMode | undefined>(undefined);

  useEffect(() => {
    void getAllProgress(ownerId).then(setAllProgress);
  }, [ownerId]);

  useEffect(() => {
    if (!question) return;

    onPositionChange?.(mode, {
      questionId: question.id,
      index: safeCurrentIndex,
      randomQuestionIds:
        mode === "random" ? randomQuestions.map((item) => item.id) : undefined,
    });
  }, [mode, onPositionChange, question, randomQuestions, safeCurrentIndex]);

  useEffect(() => {
    const savedPosition = resumePositions?.[mode];
    if (
      !savedPosition ||
      visibleQuestions.length === 0 ||
      restoredMode.current === mode
    ) {
      return;
    }

    setCurrentIndex(
      resolvePracticePosition(
        savedPosition,
        visibleQuestions.map((item) => item.id),
      ),
    );
    restoredMode.current = mode;
  }, [mode, resumePositions, visibleQuestions]);

  async function submitAnswer(selectedAnswer: ChoiceKey[]) {
    if (!question) return;
    if (selectedAnswer.length === 0 || result || isSaving) return;

    const nextResult = gradeAnswer(question.answer, selectedAnswer);
    setAnswerState({
      questionId: question.id,
      selected: selectedAnswer,
      result: nextResult,
    });
    setIsSaving(true);

    try {
      const existingProgress =
        (await getProgressByQuestionId(question.id, ownerId)) ??
        createEmptyProgress(question.id);

      await saveProgress(
        updateProgressAfterAnswer(existingProgress, selectedAnswer, nextResult),
        ownerId,
      );

      setAllProgress(await getAllProgress(ownerId));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveReviewMetadata(
    metadata: Partial<
      Pick<QuestionProgress, "bookmarked" | "markedGuessed" | "note">
    >,
  ) {
    if (!question) return;

    const optimisticProgress = updateProgressReviewMetadata(
      currentProgress ?? createEmptyProgress(question.id),
      metadata,
    );
    setAllProgress((progressList) =>
      upsertProgress(progressList, optimisticProgress),
    );

    const existingProgress =
      (await getProgressByQuestionId(question.id, ownerId)) ??
      createEmptyProgress(question.id);
    const updatedProgress = updateProgressReviewMetadata(existingProgress, metadata);

    await saveProgress(updatedProgress, ownerId);
    setAllProgress((progressList) => upsertProgress(progressList, updatedProgress));
  }

  function handleAnswerChange(nextSelected: ChoiceKey[]) {
    if (!question) return;

    setAnswerState({
      questionId: question.id,
      selected: nextSelected,
      result,
    });

    const requiredSelections = normalizeAnswer(question.answer).length;
    if (nextSelected.length === requiredSelections) {
      void submitAnswer(nextSelected);
    }
  }

  function resetAnswerState() {
    setAnswerState({ selected: [] });
  }

  function goToPrevious() {
    resetAnswerState();
    setCurrentIndex(() => Math.max(0, safeCurrentIndex - 1));
  }

  function goToNext() {
    resetAnswerState();
    setCurrentIndex(() => Math.min(visibleTotal - 1, safeCurrentIndex + 1));
  }

  return (
    <AppShell
      active="practice"
      mobileHeader={
        <div
          className="flex min-h-14 items-center justify-between"
          data-mobile-practice-header
        >
          <div className="flex min-w-0 items-center">
            <button
              aria-label="Back to dashboard"
              className="-ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-800 transition-colors hover:bg-gray-100"
              onClick={onDashboardClick}
              type="button"
            >
              <ChevronLeft size={23} />
            </button>

            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                <img
                  alt=""
                  aria-hidden="true"
                  className="h-10 w-10"
                  height={40}
                  src="/aws-mastery-mark.svg"
                  width={40}
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold leading-5 text-gray-950">
                  AWS Mastery
                </span>
                <span className="block text-xs leading-4 text-gray-500">
                  Practice
                </span>
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label="Toggle theme"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-800 transition-colors hover:bg-gray-100"
              type="button"
            >
              <Sun size={20} />
            </button>
            <button
              aria-label="Account"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm"
              type="button"
            >
              <CircleUserRound size={22} />
            </button>
          </div>
        </div>
      }
      practiceMode={mode}
      onNavigate={onNavigate}
      onDashboardClick={onDashboardClick}
      onPracticeClick={onPracticeClick}
      onExamClick={onExamClick}
    >
      <div>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="min-w-0 space-y-4">
            {question ? (
              <>
                <QuestionNavigator
                  currentIndex={safeCurrentIndex}
                  totalQuestions={visibleTotal}
                  onPrevious={goToPrevious}
                  onNext={goToNext}
                />

                <section
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:hidden"
                  data-mobile-question-card
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="text-base font-semibold text-gray-950">
                      Question
                    </h2>
                    <button
                      aria-label="Bookmark question"
                      aria-pressed={currentProgress?.bookmarked === true}
                      className={[
                        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors",
                        currentProgress?.bookmarked
                          ? "bg-amber-50 text-amber-600"
                          : "text-gray-400 hover:bg-gray-100 hover:text-gray-700",
                      ].join(" ")}
                      disabled={!question}
                      onClick={() =>
                        void saveReviewMetadata({
                          bookmarked: currentProgress?.bookmarked !== true,
                        })
                      }
                      type="button"
                    >
                      <Bookmark
                        fill={
                          currentProgress?.bookmarked ? "currentColor" : "none"
                        }
                        size={21}
                      />
                    </button>
                  </div>

                  <p className="break-words text-base leading-6 text-gray-900 [overflow-wrap:anywhere]">
                    {question.stem}
                  </p>

                  <div className="mt-6">
                    <AnswerOptions
                      options={question.options}
                      selected={selected}
                      disabled={Boolean(result) || isSaving}
                      isMultiAnswer={isMultiAnswer}
                      result={result}
                      correctAnswer={question.answer}
                      onChange={handleAnswerChange}
                    />
                  </div>
                </section>

                <div className="hidden space-y-4 md:block">
                  <QuestionCard question={question} />

                  <AnswerOptions
                    options={question.options}
                    selected={selected}
                    disabled={Boolean(result) || isSaving}
                    isMultiAnswer={isMultiAnswer}
                    result={result}
                    correctAnswer={question.answer}
                    onChange={handleAnswerChange}
                  />
                </div>

                {isSaving ? (
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
                    Saving...
                  </div>
                ) : null}

                {result ? (
                  <ExplanationPanel
                    result={result}
                    correctAnswer={question.answer}
                    explanation={question.explanation}
                  />
                ) : null}
              </>
            ) : (
              <EmptyModeState mode={mode} />
            )}
          </section>

          <aside className="hidden md:block xl:sticky xl:top-4 xl:self-start">
            <QuestionReviewPanel
              bookmarked={currentProgress?.bookmarked === true}
              markedGuessed={currentProgress?.markedGuessed === true}
              note={currentProgress?.note ?? ""}
              disabled={!question}
              onBookmarkedChange={(bookmarked) =>
                void saveReviewMetadata({ bookmarked })
              }
              onMarkedGuessedChange={(markedGuessed) =>
                void saveReviewMetadata({ markedGuessed })
              }
              onNoteChange={(note) => void saveReviewMetadata({ note })}
            />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
