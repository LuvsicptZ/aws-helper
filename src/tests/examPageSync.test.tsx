// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExamPage } from "../pages/ExamPage";

const mocks = vi.hoisted(() => ({
  saveExamSession: vi.fn(),
  syncExamSessionsWithSupabase: vi.fn(),
  supabaseClient: {},
}));

vi.mock("../db/examRepository", () => ({
  saveExamSession: mocks.saveExamSession,
}));

vi.mock("../auth/supabaseClient", () => ({
  supabaseClient: mocks.supabaseClient,
}));

vi.mock("../sync/supabaseExamSync", () => ({
  syncExamSessionsWithSupabase: mocks.syncExamSessionsWithSupabase,
}));

describe("exam page cloud sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveExamSession.mockResolvedValue(undefined);
    mocks.syncExamSessionsWithSupabase.mockResolvedValue({ merged: 1 });
    window.confirm = vi.fn(() => true);
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("syncs an authenticated exam after saving it locally", async () => {
    render(<ExamPage ownerId="user-1" onDashboardClick={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("button", { name: /submit exam/i }),
    );

    await waitFor(() => {
      expect(mocks.saveExamSession).toHaveBeenCalledTimes(1);
      expect(mocks.syncExamSessionsWithSupabase).toHaveBeenCalledWith(
        mocks.supabaseClient,
        "user-1",
      );
    });
    expect(
      mocks.saveExamSession.mock.invocationCallOrder[0],
    ).toBeLessThan(
      mocks.syncExamSessionsWithSupabase.mock.invocationCallOrder[0],
    );
  });

  it("keeps anonymous exams local", async () => {
    render(<ExamPage ownerId="anonymous" onDashboardClick={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("button", { name: /submit exam/i }),
    );

    await waitFor(() => {
      expect(mocks.saveExamSession).toHaveBeenCalledTimes(1);
    });
    expect(mocks.syncExamSessionsWithSupabase).not.toHaveBeenCalled();
  });
});
