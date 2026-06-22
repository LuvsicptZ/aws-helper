import { SearchX } from "lucide-react";
import type { PracticeMode } from "../domain/practiceMode";
import { practiceModeLabels } from "../domain/practiceMode";

const emptyMessages: Record<PracticeMode, string> = {
  sequential: "Question bank is empty.",
  random: "Question bank is empty.",
  incorrect: "No incorrect questions yet.",
  guessed: "No guessed questions yet.",
  favorite: "No bookmarked questions yet.",
};

type EmptyModeStateProps = {
  mode: PracticeMode;
};

export function EmptyModeState({ mode }: EmptyModeStateProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
        <SearchX size={22} />
      </div>
      <p className="mt-4 text-base font-semibold text-gray-950">
        {emptyMessages[mode]}
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Current mode: {practiceModeLabels[mode]}
      </p>
    </section>
  );
}
