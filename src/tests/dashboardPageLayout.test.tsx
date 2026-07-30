import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DashboardPage } from "../pages/DashboardPage";
import type { PracticeResume } from "../domain/practiceResume";

const practiceResume: PracticeResume = {
  ownerId: "anonymous",
  lastMode: "sequential",
  positions: {
    sequential: {
      questionId: 42,
      index: 41,
      updatedAt: "2026-06-29T00:00:00.000Z",
    },
    incorrect: {
      questionId: 3,
      index: 2,
      updatedAt: "2026-06-29T00:00:00.000Z",
    },
    favorite: {
      questionId: 5,
      index: 4,
      updatedAt: "2026-06-29T00:00:00.000Z",
    },
  },
};

describe("dashboard page layout", () => {
  it("renders the minimal editorial dashboard layout", () => {
    const markup = renderToStaticMarkup(
      <DashboardPage
        onNavigate={vi.fn()}
        onPracticeClick={vi.fn()}
        onExamClick={vi.fn()}
        practiceResume={practiceResume}
      />,
    );

    expect(markup).toContain("minimal-dashboard");
    expect(markup).toContain("ui-product-surface");
    expect(markup).toContain("Question 42");
    expect(markup).toContain("Continue where you left off");
    expect(markup).toContain("minimal-hero-container");
    expect(markup).toContain("minimal-progress-bar-container");
    expect(markup).toContain("minimal-progress-thumb");
    expect(markup).not.toContain("minimal-watermark");
    expect(markup).not.toContain("042");
    expect(markup).not.toContain("data-dashboard-prototype");
    expect(markup).not.toContain("At a glance");
    expect(markup).not.toContain("data-dashboard-resume-card");
    expect(markup).not.toContain("Today's Plan");
    expect(markup).not.toContain("Start Mock Exam");
    expect(markup).not.toContain("Customize your plan");
  });

  it("renders mock exam and review rows correctly", () => {
    const markup = renderToStaticMarkup(
      <DashboardPage
        onNavigate={vi.fn()}
        onPracticeClick={vi.fn()}
        onExamClick={vi.fn()}
        practiceResume={practiceResume}
      />,
    );

    expect(markup).toContain("Mock exam");
    expect(markup).toContain("Review incorrect");
    expect(markup).toContain("Review bookmarked");
    expect(markup).toContain("65 questions · 130 minutes");
    expect(markup).not.toContain("data-dashboard-quick-modes");
    expect(markup).not.toContain("Switch practice mode");
  });
});
