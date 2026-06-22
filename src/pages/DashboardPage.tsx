import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Bookmark,
  CheckCircle2,
  CircleHelp,
  ListChecks,
  Target,
  XCircle,
} from "lucide-react";
import { AuthPanel } from "../components/AuthPanel";
import { totalQuestions } from "../data/questions";
import { calculateDashboardStats } from "../domain/dashboard";
import type { QuestionProgress } from "../domain/progress";
import { getAllProgress } from "../db/progressRepository";

type DashboardPageProps = {
  onPracticeClick: () => void;
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

export function DashboardPage({ onPracticeClick, onExamClick }: DashboardPageProps) {
  const [progressList, setProgressList] = useState<QuestionProgress[]>([]);

  const refreshProgress = useCallback(() => {
    void getAllProgress().then(setProgressList);
  }, []);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  const stats = calculateDashboardStats(totalQuestions, progressList);

  return (
    <main className="min-h-screen bg-[#f4f1ea] px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-stone-300/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
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

          <div className="flex flex-col gap-3 sm:items-end">
            <AuthPanel onSyncComplete={refreshProgress} />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onPracticeClick}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm shadow-stone-300/30 transition hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
              >
                Practice
              </button>
              <button
                type="button"
                onClick={onExamClick}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-stone-400/40 transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
              >
                Mock exam
              </button>
            </div>
          </div>
        </header>

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
