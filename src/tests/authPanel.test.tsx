import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SignedInAuthPanel } from "../components/AuthPanel";

describe("signed-in auth panel", () => {
  it("groups account actions and exposes sync errors accessibly", () => {
    const markup = renderToStaticMarkup(
      <SignedInAuthPanel
        email="ryan197427@outlook.com"
        isSubmitting={false}
        isSyncing={false}
        onSignOut={() => undefined}
        onSync={() => undefined}
        status={{
          tone: "error",
          message: "Sync failed. Your local progress is safe.",
        }}
      />,
    );

    expect(markup).toContain('aria-label="Account actions"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Sync failed. Your local progress is safe.");
    expect(markup).toContain('aria-label="Sync progress"');
    expect(markup).toContain('aria-label="Sign out"');
  });
});
