type AnonymousProgressPromptProps = {
  onMerge: () => void;
  onKeepSeparate: () => void;
};

export function AnonymousProgressPrompt({
  onMerge,
  onKeepSeparate,
}: AnonymousProgressPromptProps) {
  return (
    <section className="progress-prompt ui-product-surface">
      <h3>Keep your signed-out practice progress?</h3>
      <p>
        This browser has practice progress created before you signed in. Choose
        whether it belongs to this account.
      </p>
      <div className="dialog-actions">
        <button
          type="button"
          onClick={onMerge}
          className="ui-button ui-button--primary"
        >
          Merge into my account
        </button>
        <button
          type="button"
          onClick={onKeepSeparate}
          className="ui-button ui-button--secondary"
        >
          Keep separate
        </button>
      </div>
    </section>
  );
}
