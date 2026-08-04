// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PracticePage } from "../pages/PracticePage";
import { createEmptyProgress } from "../domain/progress";

const repositoryMocks = vi.hoisted(() => ({
  getAllProgress: vi.fn(),
  getProgressForUpdate: vi.fn(),
  saveProgress: vi.fn(),
}));

vi.mock("../db/progressRepository", () => repositoryMocks);

describe("practice page layout", () => {
  beforeEach(() => {
    repositoryMocks.getAllProgress.mockResolvedValue([]);
    repositoryMocks.getProgressForUpdate.mockResolvedValue(createEmptyProgress(1));
    repositoryMocks.saveProgress.mockResolvedValue(undefined);
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

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
    expect(markup).toContain("ui-product-surface");
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

  it("keeps Next Question available and resets scroll for mobile navigation", async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(max-width: 1023px)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    render(<PracticePage initialMode="sequential" />);

    const scrollContainer = document.querySelector(".app-shell-main");
    expect(scrollContainer).not.toBeNull();
    if (!(scrollContainer instanceof HTMLElement)) return;
    scrollContainer.scrollTop = 500;

    fireEvent.click(screen.getByRole("button", { name: "Next Question" }));

    expect(screen.getAllByText("Question 2 of 1019").length).toBeGreaterThan(0);
    await waitFor(() => expect(scrollContainer.scrollTop).toBe(0));
  });

  it("labels every icon-only mobile header control", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(max-width: 1023px)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    render(<PracticePage initialMode="sequential" />);

    expect(screen.getByRole("button", { name: "Back to dashboard" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Bookmark question" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Open question navigator" })).not.toBeNull();
  });

  it("renders E and F choices and requires every multi-select answer", () => {
    render(
      <PracticePage
        initialMode="sequential"
        resumePositions={{
          sequential: { index: 895 },
          incorrect: { index: 0 },
          favorite: { index: 0 },
        }}
      />,
    );

    const choices = Array.from(document.querySelectorAll(".zen-option-marker"))
      .map((choice) => choice.textContent);
    expect(choices).toEqual(["A", "B", "C", "D", "E"]);

    const submit = screen.getByRole("button", { name: "Submit Answer" });
    fireEvent.click(document.querySelectorAll(".zen-option")[1]);
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(document.querySelectorAll(".zen-option")[4]);
    expect((submit as HTMLButtonElement).disabled).toBe(false);
  });

  it("saves a focused note only once when Save Note is clicked", async () => {
    render(<PracticePage initialMode="sequential" />);
    const notes = screen.getByPlaceholderText(/Write your study notes here/);

    fireEvent.focus(notes);
    fireEvent.change(notes, { target: { value: "One save" } });
    fireEvent.blur(notes);
    fireEvent.click(screen.getByRole("button", { name: "Save Note" }));

    await waitFor(() => expect(repositoryMocks.saveProgress).toHaveBeenCalledTimes(1));
  });

  it("removes optimistic grading and reports an answer save failure", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    repositoryMocks.saveProgress.mockRejectedValueOnce(new Error("disk full"));
    render(<PracticePage initialMode="sequential" />);

    fireEvent.click(document.querySelectorAll(".zen-option")[0]);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "We couldn't save your answer. Please try again.",
    );
    await waitFor(() => {
      expect(screen.queryByText(/Correct answer:/)).toBeNull();
    });
    consoleError.mockRestore();
  });

  it("reloads allProgress when progressRefreshToken changes", async () => {
    const { rerender } = render(<PracticePage initialMode="sequential" progressRefreshToken={0} />);
    expect(repositoryMocks.getAllProgress).toHaveBeenCalledTimes(1);

    rerender(<PracticePage initialMode="sequential" progressRefreshToken={1} />);
    expect(repositoryMocks.getAllProgress).toHaveBeenCalledTimes(2);
  });
});
