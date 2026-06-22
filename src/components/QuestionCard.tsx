import type { Question } from "../domain/question";

type QuestionCardProps = {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
};

export function QuestionCard({
  question,
  currentIndex,
  totalQuestions,
}: QuestionCardProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Question {currentIndex + 1} of {totalQuestions}
      </p>
      <h2 className="mt-4 max-w-4xl break-words text-[1.02rem] font-medium leading-8 text-gray-900 [overflow-wrap:anywhere] sm:text-lg sm:leading-8">
        {question.stem}
      </h2>
    </section>
  );
}
