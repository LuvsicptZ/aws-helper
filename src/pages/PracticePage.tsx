import { useEffect, useMemo, useRef, useState } from "react";
import { Gauge } from "lucide-react";
import { AppShell } from "../components/AppShell";
import type { ShellRoute } from "../components/AppShell";
import { AnswerOptions } from "../components/AnswerOptions";
import { EmptyModeState } from "../components/EmptyModeState";
import { ExplanationPanel } from "../components/ExplanationPanel";
import { PracticeModeTabs } from "../components/PracticeModeTabs";
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
  const [mode, setMode] = useState<PracticeMode>(initialMode);
  const [currentIndex, setCurrentIndex] = useState(initialPosition?.index ?? 0);
  const [answerState, setAnswerState] = useState<{
    questionId?: number;
    selected: ChoiceKey[];
    result?: "correct" | "incorrect";
  }>({ selected: [] });
  const [isSaving, setIsSaving] = useState(false);
  const [allProgress, setAllProgress] = useState<QuestionProgress[]>([]);
  const [randomQuestions, setRandomQuestions] = useState(() => {
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
  const progressPercent = hasQuestions
    ? ((safeCurrentIndex + 1) / visibleTotal) * 100
    : 0;
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

  function handleModeChange(nextMode: PracticeMode) {
    setMode(nextMode);
    setCurrentIndex(resumePositions?.[nextMode]?.index ?? 0);
    resetAnswerState();

    if (nextMode === "random") {
      const savedQuestionIds = resumePositions?.random?.randomQuestionIds;
      if (savedQuestionIds) {
        const questionById = new Map(questions.map((item) => [item.id, item]));
        setRandomQuestions(
          repairRandomQuestionIds(
            savedQuestionIds,
            questions.map((item) => item.id),
          )
            .map((questionId) => questionById.get(questionId))
            .filter(
              (item): item is (typeof questions)[number] => item !== undefined,
            ),
        );
      } else {
        setRandomQuestions(shuffleQuestions(questions));
      }
    }
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
      onNavigate={onNavigate}
      onDashboardClick={onDashboardClick}
      onPracticeClick={onPracticeClick}
      onExamClick={onExamClick}
    >
      <div className="space-y-6">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Practice session</h2>
            <p className="mt-1 text-sm text-gray-500">
              Answer directly from the options. Feedback appears after selection.
            </p>
          </div>

          <div className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:w-80">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-500">
              <span>Progress</span>
              <span>
                {hasQuestions ? safeCurrentIndex + 1 : 0} / {visibleTotal}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#0B1120] transition-[width] duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </section>

        <PracticeModeTabs mode={mode} onModeChange={handleModeChange} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 space-y-4">
            {question ? (
              <>
                <QuestionNavigator
                  currentIndex={safeCurrentIndex}
                  totalQuestions={visibleTotal}
                  onPrevious={goToPrevious}
                  onNext={goToNext}
                />

                <QuestionCard
                  question={question}
                />

                <AnswerOptions
                  options={question.options}
                  selected={selected}
                  disabled={Boolean(result) || isSaving}
                  isMultiAnswer={isMultiAnswer}
                  result={result}
                  correctAnswer={question.answer}
                  onChange={handleAnswerChange}
                />

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

          <aside className="space-y-4">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center font-medium text-gray-900">
                <Gauge size={18} className="mr-2 text-gray-400" />
                Session Context
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="text-gray-500">Mode</span>
                  <span className="font-medium text-gray-900">{mode}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="text-gray-500">Status</span>
                  <span className="font-medium text-gray-900">{result ?? "open"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Selected</span>
                  <span className="font-medium text-gray-900">{selected.length}</span>
                </div>
              </div>
            </section>

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
