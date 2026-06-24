type AnonymousProgressPromptProps = {
  onMerge: () => void;
  onKeepSeparate: () => void;
};

export function AnonymousProgressPrompt({
  onMerge,
  onKeepSeparate,
}: AnonymousProgressPromptProps) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
      <h3 className="font-semibold">Keep your signed-out practice progress?</h3>
      <p className="mt-1 text-sm leading-6 text-amber-900">
        This browser has practice progress created before you signed in. Choose
        whether it belongs to this account.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onMerge}
          className="min-h-11 rounded-xl bg-[#0B1120] px-4 text-sm font-semibold text-white"
        >
          Merge into my account
        </button>
        <button
          type="button"
          onClick={onKeepSeparate}
          className="min-h-11 rounded-xl border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-950"
        >
          Keep separate
        </button>
      </div>
    </section>
  );
}
