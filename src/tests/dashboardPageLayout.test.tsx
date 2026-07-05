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
  it("renders the prototype-inspired dashboard card layout", () => {
    const markup = renderToStaticMarkup(
      <DashboardPage
        onNavigate={vi.fn()}
        onPracticeClick={vi.fn()}
        onExamClick={vi.fn()}
        practiceResume={practiceResume}
      />,
    );

    expect(markup).toContain("data-dashboard-prototype");
    expect(markup).toContain("Question 42");
    expect(markup).toContain("Continue Practice");
    expect(markup).toContain("data-dashboard-resume-action");
    expect(markup).toContain("data-dashboard-secondary-actions");
    expect(markup).toContain("data-dashboard-progress-strip");
    expect(markup).not.toContain("Last synced just now");
    expect(markup).not.toContain("At a glance");
    expect(markup).not.toContain("data-dashboard-resume-card");
    expect(markup).not.toContain("Today's Plan");
    expect(markup).not.toContain("Start Mock Exam");
    expect(markup).not.toContain("Study queue");
    expect(markup).not.toContain("Customize your plan");
  });

  it("keeps review focused and removes the old dashboard footer actions", () => {
    const markup = renderToStaticMarkup(
      <DashboardPage
        onNavigate={vi.fn()}
        onPracticeClick={vi.fn()}
        onExamClick={vi.fn()}
        practiceResume={practiceResume}
      />,
    );

    expect(markup).toContain("Review Incorrect");
    expect(markup).not.toContain("Review bookmarked");
    expect(markup).not.toContain("Latest:");
    expect(markup).not.toContain("data-dashboard-quick-modes");
    expect(markup).not.toContain("Switch practice mode");
  });

  it("renders the new Review Bookmarked card and Question Map", () => {
    const markup = renderToStaticMarkup(
      <DashboardPage
        onNavigate={vi.fn()}
        onPracticeClick={vi.fn()}
        onExamClick={vi.fn()}
        practiceResume={practiceResume}
      />,
    );

    expect(markup).toContain("Review Bookmarked");
    expect(markup).toContain("data-dashboard-question-map");
    expect(markup).toContain("Question Navigation Map");
  });
});
