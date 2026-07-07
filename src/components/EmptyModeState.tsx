import { SearchX, ArrowLeft } from "lucide-react";
import type { PracticeMode } from "../domain/practiceMode";
import { practiceModeLabels } from "../domain/practiceMode";

const emptyMessages: Record<PracticeMode, string> = {
  sequential: "Question bank is empty.",
  incorrect: "No incorrect questions yet.",
  favorite: "No bookmarked questions yet.",
};

type EmptyModeStateProps = {
  mode: PracticeMode;
  onBack?: () => void;
};

export function EmptyModeState({ mode, onBack }: EmptyModeStateProps) {
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/30 p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
        <SearchX size={22} />
      </div>
      <p className="mt-4 text-base font-semibold text-gray-950 dark:text-white">
        {emptyMessages[mode]}
      </p>
      <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
        Current mode: {practiceModeLabels[mode]}
      </p>
      {onBack && (
        <button
          onClick={onBack}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
          type="button"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>
      )}
    </section>
  );
}
