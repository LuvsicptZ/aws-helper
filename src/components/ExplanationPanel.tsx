import { CheckCircle2, XCircle } from "lucide-react";
import type { ChoiceKey } from "../domain/question";
import { normalizeAnswer } from "../domain/question";

type ExplanationPanelProps = {
  result: "correct" | "incorrect";
  correctAnswer: ChoiceKey | ChoiceKey[];
  explanation: string;
};

export function ExplanationPanel({
  result,
  correctAnswer,
  explanation,
}: ExplanationPanelProps) {
  const isCorrect = result === "correct";
  const answers = normalizeAnswer(correctAnswer).join(", ");

  return (
    <section
      className={[
        "rounded-2xl border p-5 shadow-sm sm:p-6",
        isCorrect
          ? "border-emerald-200 bg-emerald-50/80"
          : "border-red-200 bg-red-50/80",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            isCorrect ? "bg-emerald-500 text-white" : "bg-red-500 text-white",
          ].join(" ")}
        >
          {isCorrect ? <CheckCircle2 size={19} /> : <XCircle size={19} />}
        </span>

        <div className="min-w-0">
          <p
            className={[
              "text-base font-semibold",
              isCorrect ? "text-emerald-950" : "text-red-950",
            ].join(" ")}
          >
            {isCorrect ? "Correct" : "Incorrect"}
          </p>
          <p className="mt-1 text-sm text-gray-700">
            Correct answer: <span className="font-semibold text-gray-950">{answers}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-current/10 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Explanation
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-800 [overflow-wrap:anywhere]">
          {explanation}
        </p>
      </div>
    </section>
  );
}
