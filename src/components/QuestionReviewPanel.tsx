import { useState } from "react";
import { Bookmark, HelpCircle, StickyNote } from "lucide-react";

type QuestionReviewPanelProps = {
  bookmarked: boolean;
  markedGuessed: boolean;
  note: string;
  disabled?: boolean;
  onBookmarkedChange: (bookmarked: boolean) => void;
  onMarkedGuessedChange: (markedGuessed: boolean) => void;
  onNoteChange: (note: string) => void;
};

export function QuestionReviewPanel({
  bookmarked,
  markedGuessed,
  note,
  disabled = false,
  onBookmarkedChange,
  onMarkedGuessedChange,
  onNoteChange,
}: QuestionReviewPanelProps) {
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const shouldShowNote = isNoteOpen || note.trim().length > 0;

  return (
    <section className="rounded-md border border-stone-300/80 bg-[#fffdf8] p-4 shadow-sm shadow-stone-300/30 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onBookmarkedChange(!bookmarked)}
            className={[
              "inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-wait disabled:opacity-70",
              bookmarked
                ? "border-amber-400 bg-amber-50 text-amber-950"
                : "border-stone-200 bg-white text-slate-700 hover:border-slate-400",
            ].join(" ")}
            aria-pressed={bookmarked}
          >
            <Bookmark size={17} fill={bookmarked ? "currentColor" : "none"} />
            Bookmark
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => onMarkedGuessedChange(!markedGuessed)}
            className={[
              "inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-wait disabled:opacity-70",
              markedGuessed
                ? "border-sky-400 bg-sky-50 text-sky-950"
                : "border-stone-200 bg-white text-slate-700 hover:border-slate-400",
            ].join(" ")}
            aria-pressed={markedGuessed}
          >
            <HelpCircle size={17} />
            Mark guessed
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsNoteOpen((isOpen) => !isOpen)}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-wait disabled:opacity-70"
            aria-expanded={shouldShowNote}
          >
            <StickyNote size={17} />
            {note.trim().length > 0 ? "Edit note" : "Add note"}
          </button>
        </div>
      </div>

      {shouldShowNote ? (
        <label className="mt-4 block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Note
          </span>
          <textarea
            value={note}
            disabled={disabled}
            onChange={(event) => onNoteChange(event.target.value)}
            rows={4}
            className="mt-2 min-h-28 w-full resize-y rounded-md border border-stone-200 bg-white px-3 py-3 text-sm leading-6 text-slate-900 shadow-inner shadow-stone-100 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-wait disabled:opacity-70"
            placeholder="Write your note for this question..."
          />
        </label>
      ) : null}
    </section>
  );
}
