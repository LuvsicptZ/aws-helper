import { useEffect, useState } from "react";
import { BookOpenCheck } from "lucide-react";
import { AnswerOptions } from "../components/AnswerOptions";
import { ExplanationPanel } from "../components/ExplanationPanel";
import { QuestionCard } from "../components/QuestionCard";
import { QuestionNavigator } from "../components/QuestionNavigator";
import { questions, totalQuestions } from "../data/questions";
import type { ChoiceKey } from "../domain/question";
import { gradeAnswer, normalizeAnswer } from "../domain/question";
import { createEmptyProgress, updateProgressAfterAnswer } from "../domain/progress";
import {
  getProgressByQuestionId,
  saveProgress,
} from "../db/progressRepository";

export function PracticePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<ChoiceKey[]>([]);
  const [result, setResult] = useState<"correct" | "incorrect" | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const question = questions[currentIndex];
  const isMultiAnswer = Array.isArray(question.answer);
  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100;

  useEffect(() => {
    setSelected([]);
    setResult(undefined);
  }, [question.id]);

  async function submitAnswer(selectedAnswer: ChoiceKey[]) {
    if (selectedAnswer.length === 0 || result || isSaving) return;

    const nextResult = gradeAnswer(question.answer, selectedAnswer);
    setResult(nextResult);
    setIsSaving(true);

    try {
      const existingProgress =
        (await getProgressByQuestionId(question.id)) ?? createEmptyProgress(question.id);

      await saveProgress(
        updateProgressAfterAnswer(existingProgress, selectedAnswer, nextResult),
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleAnswerChange(nextSelected: ChoiceKey[]) {
    setSelected(nextSelected);

    const requiredSelections = normalizeAnswer(question.answer).length;
    if (nextSelected.length === requiredSelections) {
      void submitAnswer(nextSelected);
    }
  }

  function goToPrevious() {
    setCurrentIndex((index) => Math.max(0, index - 1));
  }

  function goToNext() {
    setCurrentIndex((index) => Math.min(totalQuestions - 1, index + 1));
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
                {currentIndex + 1} / {totalQuestions}
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

        <QuestionNavigator
          currentIndex={currentIndex}
          totalQuestions={totalQuestions}
          onPrevious={goToPrevious}
          onNext={goToNext}
        />

        <QuestionCard
          question={question}
          currentIndex={currentIndex}
          totalQuestions={totalQuestions}
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
      </div>
    </main>
  );
}
