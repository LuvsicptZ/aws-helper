import type { ChoiceKey } from "../domain/question";
import { normalizeAnswer, stripChoicePrefix } from "../domain/question";

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
    <div className="space-y-3.5">
      {choiceOrder
        .filter((choice) => options[choice] !== undefined)
        .map((choice) => {
          const isSelected = selected.includes(choice);
          const isCorrect = correctChoices.includes(choice);
          const showResult = Boolean(result);
          const isWrongSelection = showResult && isSelected && !isCorrect;

          const optionClass = showResult
            ? isCorrect
              ? "border-emerald-300 bg-emerald-50 text-emerald-950"
              : isWrongSelection
                ? "border-red-300 bg-red-50 text-red-950"
                : "border-gray-200 bg-white text-gray-400 opacity-70"
            : isSelected
              ? "border-[#111827] bg-[#f7f4ef] ring-2 ring-[#ded7cc]"
              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-[#fbfaf8]";

          return (
            <button
              key={choice}
              type="button"
              disabled={disabled}
              onClick={() => toggleChoice(choice)}
              aria-label={`Choice ${choice}`}
              className={[
                "group flex w-full min-w-0 gap-4 rounded-2xl border p-4 text-left transition-[background-color,border-color,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120] sm:p-5",
                optionClass,
                disabled ? "cursor-default" : "cursor-pointer hover:-translate-y-0.5",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
                  showResult && isCorrect
                    ? "bg-emerald-500 text-white"
                    : showResult && isWrongSelection
                      ? "bg-red-500 text-white"
                      : isSelected
                        ? "bg-[#0B1120] text-white"
                        : "bg-gray-100 text-gray-900",
                ].join(" ")}
              >
                {choice}
              </span>
              <span
                className={[
                  "min-w-0 break-words text-base leading-7 [overflow-wrap:anywhere]",
                  showResult && isCorrect
                    ? "text-emerald-950"
                    : showResult && isWrongSelection
                      ? "text-red-950"
                      : showResult
                        ? "text-gray-400"
                        : "text-gray-800",
                ].join(" ")}
              >
                {stripChoicePrefix(choice, options[choice] ?? "")}
              </span>
            </button>
          );
        })}
    </div>
  );
}
