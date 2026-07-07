import type { PracticeMode } from "../domain/practiceMode";

const emptyMessages: Record<PracticeMode, string> = {
  sequential: "Question bank is empty.",
  incorrect: "No incorrect questions yet.",
  favorite: "No bookmarked questions yet.",
};

type EmptyModeStateProps = {
  mode: PracticeMode;
};

export function EmptyModeState({ mode }: EmptyModeStateProps) {
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/30 p-8 text-center shadow-sm">
      <p className="text-base font-semibold text-gray-950 dark:text-white">
        {emptyMessages[mode]}
      </p>
    </section>
  );
}
