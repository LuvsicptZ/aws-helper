import { SearchX } from "lucide-react";
import type { PracticeMode } from "../domain/practiceMode";
import { practiceModeLabels } from "../domain/practiceMode";

const emptyMessages: Record<PracticeMode, string> = {
  sequential: "题库暂时为空",
  random: "题库暂时为空",
  incorrect: "还没有错题",
  guessed: "还没有标记蒙对的题",
  favorite: "还没有收藏题目",
};

type EmptyModeStateProps = {
  mode: PracticeMode;
};

export function EmptyModeState({ mode }: EmptyModeStateProps) {
  return (
    <section className="rounded-md border border-stone-300/80 bg-[#fffdf8] p-8 text-center shadow-sm shadow-stone-300/30">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-stone-100 text-slate-600">
        <SearchX size={22} />
      </div>
      <p className="mt-4 text-base font-semibold text-slate-950">
        {emptyMessages[mode]}
      </p>
      <p className="mt-2 text-sm text-slate-500">
        当前模式：{practiceModeLabels[mode]}
      </p>
    </section>
  );
}
