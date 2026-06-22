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
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-2 sm:grid-cols-5">
      {practiceModes.map((item) => {
        const isActive = item === mode;

        return (
          <button
            key={item}
            type="button"
            onClick={() => onModeChange(item)}
            className={[
              "min-h-10 rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120]",
              isActive
                ? "bg-[#0B1120] text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900",
            ].join(" ")}
          >
            {practiceModeLabels[item]}
          </button>
        );
      })}
    </div>
  );
}
