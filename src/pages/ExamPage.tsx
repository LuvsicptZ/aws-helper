import { useCallback, useEffect, useMemo, useState } from "react";
import { AlarmClock, ArrowLeft, CheckCircle2, Send } from "lucide-react";
import { AnswerOptions } from "../components/AnswerOptions";
import { ExplanationPanel } from "../components/ExplanationPanel";
import { QuestionCard } from "../components/QuestionCard";
import { QuestionNavigator } from "../components/QuestionNavigator";
import { questions } from "../data/questions";
import {
  createExamQuestionIds,
  EXAM_DURATION_SECONDS,
  scoreExam,
} from "../domain/exam";
import type { ChoiceKey } from "../domain/question";
import { normalizeAnswer } from "../domain/question";
import { saveExamSession } from "../db/examRepository";

type ExamPageProps = {
  onDashboardClick: () => void;
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

export function ExamPage({ onDashboardClick }: ExamPageProps) {
  const [examId] = useState(createExamId);
  const [startedAt] = useState(() => new Date().toISOString());
  const [remainingSeconds, setRemainingSeconds] = useState(EXAM_DURATION_SECONDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, ChoiceKey[]>>({});
  const [submittedAt, setSubmittedAt] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
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
  const incorrectQuestions = score
    ? examQuestions.filter((question) =>
        score.incorrectQuestionIds.includes(question.id),
      )
    : [];

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
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    answers,
    examId,
    examQuestionIds,
    examQuestions,
    isSaving,
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

  return (
    <main className="min-h-screen bg-[#f4f1ea] px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:gap-5">
        <header className="flex flex-col gap-4 border-b border-stone-300/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-950 text-white">
                <AlarmClock size={17} strokeWidth={2.2} />
              </span>
              <span>AWS SAA-C03</span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Mock exam
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onDashboardClick}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm shadow-stone-300/30 transition hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
            >
              <ArrowLeft size={17} />
              Dashboard
            </button>
          </div>
        </header>

        <section className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-md border border-stone-300/80 bg-[#f4f1ea]/95 p-2 shadow-sm shadow-stone-300/40 backdrop-blur">
          <span className="inline-flex min-h-11 items-center rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900">
            {formatTime(remainingSeconds)}
          </span>
          <span className="text-sm font-medium text-slate-600">
            {Object.keys(answers).length} / {examQuestions.length} answered
          </span>
          {!score ? (
            <button
              type="button"
              onClick={() => void submitExam(EXAM_DURATION_SECONDS - remainingSeconds)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-stone-400/40 transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-wait disabled:opacity-70"
              disabled={isSaving}
            >
              <Send size={17} />
              Submit
            </button>
          ) : null}
        </section>

        {score ? (
          <section className="rounded-md border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm shadow-emerald-100/70 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white">
                <CheckCircle2 size={20} />
              </span>
              <div>
                <p className="text-base font-semibold text-emerald-950">
                  Score {score.scorePercent}%
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {score.correctQuestions} correct / {score.totalQuestions} total.
                  {isSaving ? " Saving..." : " Saved locally."}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {question ? (
          <>
            <QuestionNavigator
              currentIndex={currentIndex}
              totalQuestions={examQuestions.length}
              onPrevious={goToPrevious}
              onNext={goToNext}
            />

            <QuestionCard
              question={question}
              currentIndex={currentIndex}
              totalQuestions={examQuestions.length}
            />

            <AnswerOptions
              options={question.options}
              selected={selected}
              disabled={Boolean(submittedAt)}
              isMultiAnswer={Array.isArray(question.answer)}
              result={undefined}
              correctAnswer={question.answer}
              onChange={(nextSelected) => {
                const requiredSelections = normalizeAnswer(question.answer).length;
                handleAnswerChange(nextSelected.slice(0, requiredSelections));
              }}
            />
          </>
        ) : null}

        {score && incorrectQuestions.length > 0 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-950">Incorrect review</h2>
            {incorrectQuestions.map((incorrectQuestion) => (
              <div key={incorrectQuestion.id} className="space-y-3">
                <QuestionCard
                  question={incorrectQuestion}
                  currentIndex={examQuestionIds.indexOf(incorrectQuestion.id)}
                  totalQuestions={examQuestions.length}
                />
                <ExplanationPanel
                  result="incorrect"
                  correctAnswer={incorrectQuestion.answer}
                  explanation={incorrectQuestion.explanation}
                />
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
