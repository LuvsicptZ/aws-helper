import type { ChoiceKey } from "../domain/question";
import { normalizeAnswer } from "../domain/question";

type AnswerOptionsProps = {
  options: Partial<Record<ChoiceKey, string>>;
  selected: ChoiceKey[];
  disabled: boolean;
  isMultiAnswer: boolean;
  result?: "correct" | "incorrect";
  correctAnswer: ChoiceKey | ChoiceKey[];
  onChange: (selected: ChoiceKey[]) => void;
};

const choiceOrder: ChoiceKey[] = ["A", "B", "C", "D", "E", "F"];

export function AnswerOptions({
  options,
  selected,
  disabled,
  isMultiAnswer,
  result,
  correctAnswer,
  onChange,
}: AnswerOptionsProps) {
  const correctChoices = normalizeAnswer(correctAnswer);

  function toggleChoice(choice: ChoiceKey) {
    if (disabled) return;

    if (isMultiAnswer) {
      onChange(
        selected.includes(choice)
          ? selected.filter((item) => item !== choice)
          : [...selected, choice],
      );
      return;
    }

    onChange([choice]);
  }

  return (
    <div className="space-y-3">
      {choiceOrder
        .filter((choice) => options[choice] !== undefined)
        .map((choice) => {
          const isSelected = selected.includes(choice);
          const isCorrect = correctChoices.includes(choice);
          const showResult = Boolean(result);
          const isWrongSelection = showResult && isSelected && !isCorrect;

          const optionClass = showResult
            ? isCorrect
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : isWrongSelection
                ? "border-red-200 bg-red-50 text-red-950"
                : "border-gray-200 bg-white text-gray-400"
            : isSelected
              ? "border-[#0B1120] bg-gray-50 ring-2 ring-gray-200"
              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50";

          return (
            <button
              key={choice}
              type="button"
              disabled={disabled}
              onClick={() => toggleChoice(choice)}
              aria-label={`Choice ${choice}`}
              className={[
                "group flex w-full min-w-0 gap-3 rounded-xl border p-4 text-left shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120]",
                optionClass,
                disabled ? "cursor-default" : "hover:-translate-y-0.5",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
                  showResult && isCorrect
                    ? "bg-emerald-500 text-white"
                    : showResult && isWrongSelection
                      ? "bg-red-500 text-white"
                      : "bg-gray-100 text-gray-900",
                ].join(" ")}
              >
                {choice}
              </span>
              <span
                className={[
                  "min-w-0 break-words text-sm leading-6 [overflow-wrap:anywhere]",
                  showResult && isCorrect
                    ? "text-emerald-950"
                    : showResult && isWrongSelection
                      ? "text-red-950"
                      : showResult
                        ? "text-gray-400"
                        : "text-gray-800",
                ].join(" ")}
              >
                {options[choice]}
              </span>
            </button>
          );
        })}
    </div>
  );
}
