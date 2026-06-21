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
    <section className="rounded-md border border-stone-300/80 bg-[#fffdf8] p-5 shadow-sm shadow-stone-300/30 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        Question {currentIndex + 1} of {totalQuestions}
      </p>
      <h2 className="mt-4 max-w-4xl break-words text-[1.02rem] font-medium leading-8 text-slate-950 [overflow-wrap:anywhere] sm:text-lg sm:leading-8">
        {question.stem}
      </h2>
    </section>
  );
}
