import { useEffect, useState } from "react";
import { BookOpenCheck } from "lucide-react";
import { AnswerOptions } from "../components/AnswerOptions";
import { EmptyModeState } from "../components/EmptyModeState";
import { ExplanationPanel } from "../components/ExplanationPanel";
import { PracticeModeTabs } from "../components/PracticeModeTabs";
import { QuestionCard } from "../components/QuestionCard";
import { QuestionNavigator } from "../components/QuestionNavigator";
import { questions } from "../data/questions";
import type { ChoiceKey } from "../domain/question";
import { gradeAnswer, normalizeAnswer } from "../domain/question";
import type { PracticeMode } from "../domain/practiceMode";
import {
  filterQuestionsByPracticeMode,
  shuffleQuestions,
} from "../domain/practiceMode";
import type { QuestionProgress } from "../domain/progress";
import { createEmptyProgress, updateProgressAfterAnswer } from "../domain/progress";
import {
  getAllProgress,
  getProgressByQuestionId,
  saveProgress,
} from "../db/progressRepository";

export function PracticePage() {
  const [mode, setMode] = useState<PracticeMode>("sequential");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerState, setAnswerState] = useState<{
    questionId?: number;
    selected: ChoiceKey[];
    result?: "correct" | "incorrect";
  }>({ selected: [] });
  const [isSaving, setIsSaving] = useState(false);
  const [allProgress, setAllProgress] = useState<QuestionProgress[]>([]);
  const [randomQuestions, setRandomQuestions] = useState(() =>
    shuffleQuestions(questions),
  );

  const filteredQuestions = filterQuestionsByPracticeMode(
    mode,
    questions,
    allProgress,
  );
  const visibleQuestions = mode === "random" ? randomQuestions : filteredQuestions;
  const visibleTotal = visibleQuestions.length;
  const hasQuestions = visibleTotal > 0;
  const safeCurrentIndex = hasQuestions
    ? Math.min(currentIndex, visibleTotal - 1)
    : 0;
  const question = visibleQuestions[safeCurrentIndex];
  const selected =
    answerState.questionId === question?.id ? answerState.selected : [];
  const result = answerState.questionId === question?.id ? answerState.result : undefined;
  const isMultiAnswer = question ? Array.isArray(question.answer) : false;
  const progressPercent = hasQuestions
    ? ((safeCurrentIndex + 1) / visibleTotal) * 100
    : 0;

  useEffect(() => {
    void getAllProgress().then(setAllProgress);
  }, []);

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
        (await getProgressByQuestionId(question.id)) ?? createEmptyProgress(question.id);

      await saveProgress(
        updateProgressAfterAnswer(existingProgress, selectedAnswer, nextResult),
      );

      setAllProgress(await getAllProgress());
    } finally {
      setIsSaving(false);
    }
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
    setCurrentIndex(0);
    resetAnswerState();

    if (nextMode === "random") {
      setRandomQuestions(shuffleQuestions(questions));
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
    <main className="min-h-screen bg-[#f4f1ea] px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:gap-5">
        <header className="flex flex-col gap-4 border-b border-stone-300/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-950 text-white">
                <BookOpenCheck size={17} strokeWidth={2.2} />
              </span>
              <span>AWS SAA-C03</span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Practice session
            </h1>
          </div>

          <div className="min-w-0 sm:w-72">
            <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              <span>Progress</span>
              <span>
                {hasQuestions ? safeCurrentIndex + 1 : 0} / {visibleTotal}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-300/80">
              <div
                className="h-full rounded-full bg-slate-950 transition-[width] duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </header>

        <PracticeModeTabs mode={mode} onModeChange={handleModeChange} />

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
              currentIndex={safeCurrentIndex}
              totalQuestions={visibleTotal}
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
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">Saving...</span>
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
      </div>
    </main>
  );
}
