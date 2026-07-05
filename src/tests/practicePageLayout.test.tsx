import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PracticePage } from "../pages/PracticePage";

describe("practice page layout", () => {
  it("does not duplicate practice navigation above the question content", () => {
    const markup = renderToStaticMarkup(
      <PracticePage initialMode="sequential" />,
    );

    expect(markup).not.toContain("sm:grid-cols-5");
  });

  it("does not repeat dashboard-style context above the question", () => {
    const markup = renderToStaticMarkup(
      <PracticePage initialMode="sequential" />,
    );

    expect(markup).not.toContain(
      "Answer directly from the options. Feedback appears after selection.",
    );
    expect(markup).not.toContain('class="flex justify-end"');
    expect(markup).not.toContain("Session Context");
    expect(markup).not.toContain("Question 1 / 1019");
    expect(markup).not.toContain("Accuracy 0%");
    expect(markup).not.toContain("ZenFocus");
    expect(markup).not.toContain("Current Flow</p>");
    expect(markup).toContain("data-focused-practice-layout");
  });

  it("renders a Figma-style ZenFocus shell without the app sidebar", () => {
    const markup = renderToStaticMarkup(
      <PracticePage initialMode="sequential" />,
    );

    expect(markup).toContain("zen-practice-page");
    expect(markup).toContain("zen-practice-sidebar");
    expect(markup).toContain("zen-practice-main");
    expect(markup).toContain("zen-practice-progress");
    expect(markup).toContain("Dashboard");
    expect(markup).not.toContain("Current flow");
    expect(markup).not.toContain("app-shell-sidebar");
    expect(markup).not.toContain("Focus practice");
  });

  it("uses the 800px focused question canvas with minimalist option states", () => {
    const markup = renderToStaticMarkup(
      <PracticePage initialMode="sequential" />,
    );

    expect(markup).toContain("data-focused-practice-layout");
    expect(markup).toContain("zen-question-block");
    expect(markup).toContain("zen-practice-breadcrumb");
    expect(markup).toContain("Question 1 of 1019");
    expect(markup).toContain("zen-options-list");
    expect(markup).toContain("zen-option-marker");
    expect(markup).toContain("Submit Answer");
    expect(markup).not.toContain("Accuracy");
    expect(markup).not.toContain("Remaining");
    expect(markup).not.toContain("data-desktop-question-card");
    expect(markup).not.toContain("data-compact-practice-summary");
    expect(markup).not.toContain("Question tools");
    expect(markup).not.toContain("xl:grid-cols-[minmax(0,1fr)_280px]");
  });

  it("renders the bookmark button, study notes textarea, and sidebar navigator", () => {
    const markup = renderToStaticMarkup(
      <PracticePage initialMode="sequential" />,
    );

    expect(markup).toContain("Bookmark");
    expect(markup).toContain("Study Notes");
    expect(markup).toContain("zen-practice-notes-textarea");
    expect(markup).toContain("Question Navigator");
  });
});
