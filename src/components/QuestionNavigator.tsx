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
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-2 sm:gap-3">
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentIndex === 0}
        className="inline-flex min-h-12 min-w-0 items-center justify-center gap-1 rounded-xl px-2 py-2 text-sm font-medium text-gray-600 transition hover:bg-white hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120] disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-11 sm:gap-2 sm:px-4"
      >
        <ChevronLeft size={17} />
        <span className="truncate">Previous</span>
      </button>

      <span className="whitespace-nowrap rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm">
        Question {currentIndex + 1}
      </span>

      <button
        type="button"
        onClick={onNext}
        disabled={currentIndex === totalQuestions - 1}
        className="inline-flex min-h-12 min-w-0 items-center justify-center gap-1 rounded-xl px-2 py-2 text-sm font-medium text-gray-600 transition hover:bg-white hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120] disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-11 sm:gap-2 sm:px-4"
      >
        <span className="truncate">Next</span>
        <ChevronRight size={17} />
      </button>
    </div>
  );
}
