import type { PracticeMode } from "../domain/practiceMode";
import { practiceModeLabels } from "../domain/practiceMode";

const practiceModes: PracticeMode[] = [
  "sequential",
  "random",
  "incorrect",
  "guessed",
  "favorite",
];

type PracticeModeTabsProps = {
  mode: PracticeMode;
  onModeChange: (mode: PracticeMode) => void;
};

export function PracticeModeTabs({ mode, onModeChange }: PracticeModeTabsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-md border border-stone-300/70 bg-stone-100/70 p-2 sm:grid-cols-5">
      {practiceModes.map((item) => {
        const isActive = item === mode;

        return (
          <button
            key={item}
            type="button"
            onClick={() => onModeChange(item)}
            className={[
              "min-h-10 rounded-md px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950",
              isActive
                ? "bg-slate-950 text-white shadow-sm shadow-stone-400/40"
                : "bg-white text-slate-700 hover:bg-stone-50",
            ].join(" ")}
          >
            {practiceModeLabels[item]}
          </button>
        );
      })}
    </div>
  );
}
