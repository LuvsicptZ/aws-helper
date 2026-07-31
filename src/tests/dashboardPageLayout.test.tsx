// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "../pages/DashboardPage";
import type { PracticeResume } from "../domain/practiceResume";

const repositoryMocks = vi.hoisted(() => ({
  getAllExamSessions: vi.fn(),
  getAllProgress: vi.fn(),
}));

vi.mock("../db/examRepository", () => ({
  getAllExamSessions: repositoryMocks.getAllExamSessions,
}));

vi.mock("../db/progressRepository", () => ({
  getAllProgress: repositoryMocks.getAllProgress,
}));

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
  beforeEach(() => {
    repositoryMocks.getAllExamSessions.mockResolvedValue([]);
    repositoryMocks.getAllProgress.mockResolvedValue([]);
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

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

  it("separates mobile simulator attempt content from its action", async () => {
    repositoryMocks.getAllExamSessions.mockResolvedValue([
      {
        id: "submitted-exam",
        questionIds: [1, 2],
        startedAt: "2026-07-06T01:50:00.000Z",
        submittedAt: "2026-07-06T02:10:00.000Z",
        durationSeconds: 7800,
        answers: {},
        score: 0,
      },
    ]);

    render(
      <DashboardPage
        onNavigate={vi.fn()}
        onPracticeClick={vi.fn()}
        onExamClick={vi.fn()}
        practiceResume={practiceResume}
      />,
    );

    const title = await screen.findByText("Mock Exam Simulator");
    const row = title.closest(".minimal-attempt-row");
    expect(row).not.toBeNull();

    const attemptRow = row as HTMLElement;
    expect(
      attemptRow.querySelector(".minimal-attempt-summary"),
    ).not.toBeNull();
    expect(
      attemptRow.querySelector(".minimal-attempt-result"),
    ).not.toBeNull();
    expect(
      within(attemptRow)
        .getByRole("button", { name: "Open" })
        .classList.contains("minimal-attempt-action"),
    ).toBe(true);
  });
});
