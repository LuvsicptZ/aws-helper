import { ChevronLeft, ChevronRight } from "lucide-react";

type QuestionNavigatorProps = {
  currentIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
};

export function QuestionNavigator({
  currentIndex,
  totalQuestions,
  onPrevious,
  onNext,
}: QuestionNavigatorProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-stone-300/70 bg-stone-100/70 p-2">
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentIndex === 0}
        className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-not-allowed disabled:opacity-35 sm:px-4"
      >
        <ChevronLeft size={17} />
        <span>Previous</span>
      </button>

      <span className="rounded bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm shadow-stone-300/40">
        Question {currentIndex + 1}
      </span>

      <button
        type="button"
        onClick={onNext}
        disabled={currentIndex === totalQuestions - 1}
        className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-not-allowed disabled:opacity-35 sm:px-4"
      >
        <span>Next</span>
        <ChevronRight size={17} />
      </button>
    </div>
  );
}
