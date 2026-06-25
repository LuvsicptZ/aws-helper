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
  const progressPercent =
    totalQuestions === 0 ? 0 : ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <>
      <div
        className="-mx-4 -mt-4 border-b border-gray-200 bg-white md:hidden"
        data-mobile-question-navigation
      >
        <div className="border-b border-gray-200 px-4 pb-4 pt-3">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-900">
            <span>
              Question {currentIndex + 1} / {totalQuestions}
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div
            aria-label={`Question ${currentIndex + 1} of ${totalQuestions}`}
            aria-valuemax={totalQuestions}
            aria-valuemin={0}
            aria-valuenow={totalQuestions === 0 ? 0 : currentIndex + 1}
            className="h-2 overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-[#0B1120] transition-[width] duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex min-h-14 items-center justify-between px-4">
          <button
            type="button"
            onClick={onPrevious}
            disabled={currentIndex === 0}
            className="inline-flex min-h-11 cursor-pointer items-center gap-1 text-sm font-medium text-gray-700 transition-colors hover:text-gray-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft size={17} />
            Previous
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={currentIndex === totalQuestions - 1}
            className="inline-flex min-h-11 cursor-pointer items-center gap-1 text-sm font-medium text-gray-700 transition-colors hover:text-gray-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120] disabled:cursor-not-allowed disabled:opacity-35"
          >
            Next
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="hidden rounded-2xl border border-gray-200 bg-gray-50 p-2 shadow-sm md:block">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onPrevious}
            disabled={currentIndex === 0}
            className="inline-flex min-h-12 min-w-0 cursor-pointer items-center justify-center gap-1 rounded-xl px-2 py-2 text-sm font-medium text-gray-600 transition-colors duration-200 hover:bg-white hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120] disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-11 sm:gap-2 sm:px-4"
          >
            <ChevronLeft size={17} />
            <span className="truncate">Previous</span>
          </button>

          <span className="whitespace-nowrap rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm">
            Question {currentIndex + 1} of {totalQuestions}
          </span>

          <button
            type="button"
            onClick={onNext}
            disabled={currentIndex === totalQuestions - 1}
            className="inline-flex min-h-12 min-w-0 cursor-pointer items-center justify-center gap-1 rounded-xl px-2 py-2 text-sm font-medium text-gray-600 transition-colors duration-200 hover:bg-white hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120] disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-11 sm:gap-2 sm:px-4"
          >
            <span className="truncate">Next</span>
            <ChevronRight size={17} />
          </button>
        </div>

        <div
          aria-label={`Question ${currentIndex + 1} of ${totalQuestions}`}
          aria-valuemax={totalQuestions}
          aria-valuemin={0}
          aria-valuenow={totalQuestions === 0 ? 0 : currentIndex + 1}
          className="mx-2 mb-1 mt-1 h-1 overflow-hidden rounded-full bg-gray-200"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-[#0B1120] transition-[width] duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </>
  );
}
