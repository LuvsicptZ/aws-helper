import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PracticePage } from "../pages/PracticePage";

describe("practice page layout", () => {
  it("does not duplicate practice navigation above the question content", () => {
    const markup = renderToStaticMarkup(
      <PracticePage initialMode="sequential" />,
    );

    expect(markup).not.toContain("sm:grid-cols-5");
    expect(markup).not.toContain(">Random</button>");
  });

  it("does not repeat obvious practice context above the question", () => {
    const markup = renderToStaticMarkup(
      <PracticePage initialMode="sequential" />,
    );

    expect(markup).not.toContain("Practice session");
    expect(markup).not.toContain(
      "Answer directly from the options. Feedback appears after selection.",
    );
    expect(markup).not.toContain('class="flex justify-end"');
    expect(markup).not.toContain("Session Context");
    expect(markup).toContain("Question 1 of 1019");
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain("xl:grid-cols-[minmax(0,1fr)_280px]");
  });

  it("renders the dedicated Figma mobile practice composition", () => {
    const markup = renderToStaticMarkup(
      <PracticePage initialMode="sequential" />,
    );

    expect(markup).toContain("data-mobile-practice-header");
    expect(markup).toContain("data-mobile-question-card");
    expect(markup).toContain("Question 1 / 1019");
    expect(markup).toContain("data-mobile-question-navigation");
    expect(markup).toContain("md:hidden");
    expect(markup).toContain('src="/aws-mastery-mark.svg"');
  });
});
