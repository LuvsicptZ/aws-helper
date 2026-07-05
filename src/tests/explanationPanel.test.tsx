import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExplanationPanel } from "../components/ExplanationPanel";

describe("explanation panel", () => {
  it("centers the post-answer flow on moving to the next question", () => {
    const markup = renderToStaticMarkup(
      <ExplanationPanel
        result="incorrect"
        correctAnswer="D"
        explanation="Use S3 Transfer Acceleration for this scenario."
        onNext={() => undefined}
      />,
    );

    expect(markup).toContain("data-answer-feedback-panel");
    expect(markup).toContain("Why this matters");
    expect(markup).toContain("Next question");
  });
});
