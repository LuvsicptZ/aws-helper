import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  CheckCircle2,
  CircleHelp,
  ListChecks,
  PlayCircle,
  Target,
  XCircle,
} from "lucide-react";
import { AuthPanel } from "../components/AuthPanel";
import { totalQuestions } from "../data/questions";
import { calculateDashboardStats } from "../domain/dashboard";
import type { PracticeMode } from "../domain/practiceMode";
import type { QuestionProgress } from "../domain/progress";
import { getAllProgress } from "../db/progressRepository";

type DashboardPageProps = {
  onPracticeClick: (mode?: PracticeMode) => void;
  onExamClick: () => void;
};

type StatCardProps = {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
};

function StatCard({ label, value, detail, icon }: StatCardProps) {
  return (
    <article className="rounded-md border border-stone-300/80 bg-[#fffdf8] p-5 shadow-sm shadow-stone-300/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-stone-100 text-slate-700">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}

type PrimaryActionProps = {
  label: string;
  detail: string;
  primary?: boolean;
  onClick: () => void;
};

function PrimaryAction({ label, detail, primary = false, onClick }: PrimaryActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-h-16 items-center justify-between gap-3 rounded-md border px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950",
        primary
          ? "border-slate-950 bg-slate-950 text-white shadow-sm shadow-stone-400/40 hover:bg-slate-800"
          : "border-stone-300 bg-white text-slate-800 shadow-sm shadow-stone-300/30 hover:bg-stone-50",
      ].join(" ")}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span
          className={[
            "mt-1 block text-xs leading-5",
            primary ? "text-slate-200" : "text-slate-500",
          ].join(" ")}
        >
          {detail}
        </span>
      </span>
      <ArrowRight size={18} className="shrink-0" />
    </button>
  );
}

export function DashboardPage({ onPracticeClick, onExamClick }: DashboardPageProps) {
  const [progressList, setProgressList] = useState<QuestionProgress[]>([]);

  const refreshProgress = useCallback(() => {
    void getAllProgress().then(setProgressList);
  }, []);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  const stats = calculateDashboardStats(totalQuestions, progressList);
  const progressPercent =
    stats.totalQuestions === 0
      ? 0
      : Math.round((stats.answeredQuestions / stats.totalQuestions) * 100);

  return (
    <main className="min-h-screen bg-[#f4f1ea] px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="border-b border-stone-300/70 pb-5">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-950 text-white">
                <BarChart3 size={17} strokeWidth={2.2} />
              </span>
              <span>AWS SAA-C03</span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Dashboard
            </h1>
          </div>
        </header>

        <section className="grid gap-4 rounded-md border border-stone-300/80 bg-[#fffdf8] p-5 shadow-sm shadow-stone-300/30 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <PlayCircle size={18} />
              Study next
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {stats.answeredQuestions} / {stats.totalQuestions}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {progressPercent}% complete. {stats.remainingQuestions} questions remaining.
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full bg-slate-950 transition-[width] duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <PrimaryAction
              primary
              label="Continue practice"
              detail="Resume regular question flow"
              onClick={() => onPracticeClick("sequential")}
            />
            <PrimaryAction
              label="Review incorrect"
              detail={`${stats.incorrectQuestions} questions waiting`}
              onClick={() => onPracticeClick("incorrect")}
            />
            <PrimaryAction
              label="Start mock exam"
              detail="65 questions, 130 minutes"
              onClick={onExamClick}
            />
          </div>
        </section>

        <section className="rounded-md border border-stone-300/80 bg-stone-100/70 p-3">
          <AuthPanel onSyncComplete={refreshProgress} />
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total"
            value={stats.totalQuestions}
            detail="Questions in the local bank"
            icon={<ListChecks size={19} />}
          />
          <StatCard
            label="Answered"
            value={stats.answeredQuestions}
            detail={`${stats.remainingQuestions} remaining`}
            icon={<CheckCircle2 size={19} />}
          />
          <StatCard
            label="Accuracy"
            value={`${stats.accuracyPercent}%`}
            detail="Based on all answer attempts"
            icon={<Target size={19} />}
          />
          <StatCard
            label="Incorrect"
            value={stats.incorrectQuestions}
            detail="Questions with latest incorrect result"
            icon={<XCircle size={19} />}
          />
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <StatCard
            label="Guessed"
            value={stats.guessedQuestions}
            detail="Questions marked as guessed"
            icon={<CircleHelp size={19} />}
          />
          <StatCard
            label="Bookmarked"
            value={stats.bookmarkedQuestions}
            detail="Questions saved for review"
            icon={<Bookmark size={19} />}
          />
        </section>
      </div>
    </main>
  );
}
