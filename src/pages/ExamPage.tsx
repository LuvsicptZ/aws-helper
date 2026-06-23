import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Send } from "lucide-react";
import { AppShell } from "../components/AppShell";
import type { ShellRoute } from "../components/AppShell";
import { AnswerOptions } from "../components/AnswerOptions";
import { ExplanationPanel } from "../components/ExplanationPanel";
import { QuestionCard } from "../components/QuestionCard";
import { QuestionNavigator } from "../components/QuestionNavigator";
import { questions } from "../data/questions";
import {
  createExamQuestionIds,
  EXAM_DURATION_SECONDS,
  EXAM_QUESTION_COUNT,
  scoreExam,
} from "../domain/exam";
import type { ChoiceKey } from "../domain/question";
import { normalizeAnswer } from "../domain/question";
import { saveExamSession } from "../db/examRepository";
import type { PracticeMode } from "../domain/practiceMode";

type ExamPageProps = {
  onDashboardClick: () => void;
  onPracticeClick?: (mode?: PracticeMode) => void;
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

function getExamDurationMinutes(): number {
  return Math.round(EXAM_DURATION_SECONDS / 60);
}

export function ExamPage({
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
      onNavigate={onNavigate}
      onDashboardClick={onDashboardClick}
      onPracticeClick={onPracticeClick}
      onExamClick={onExamClick}
    >
      <div className="space-y-5">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Mock exam</h2>
            <p className="mt-1 text-sm text-gray-500">
              {EXAM_QUESTION_COUNT} questions. {getExamDurationMinutes()} minutes.
              Unanswered questions count as incorrect.
            </p>
          </div>

          <button
            type="button"
            onClick={onDashboardClick}
            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <ArrowLeft size={17} />
            Dashboard
          </button>
        </section>

        <section className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white/95 p-2 shadow-sm backdrop-blur">
          <span className="inline-flex min-h-11 items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900">
            {formatTime(remainingSeconds)}
          </span>
          <span className="text-sm font-medium text-gray-600">
            {Object.keys(answers).length} / {examQuestions.length} answered
          </span>
          {!score ? (
            <button
              type="button"
              onClick={submitExamWithConfirmation}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0B1120] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120] disabled:cursor-wait disabled:opacity-70"
              disabled={isSaving}
            >
              <Send size={17} />
              Submit
            </button>
          ) : null}
        </section>

        {score ? (
          <section
            aria-label="Exam score summary"
            className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm sm:p-6"
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
            <h2 className="text-lg font-semibold text-gray-950">Incorrect review</h2>
            {incorrectQuestions.map((incorrectQuestion) => (
              <div key={incorrectQuestion.id} className="space-y-3">
                <QuestionCard
                  question={incorrectQuestion}
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
    </AppShell>
  );
}
