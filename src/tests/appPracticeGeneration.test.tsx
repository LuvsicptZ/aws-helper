// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { AuthContext } from "../auth/authContext";
import {
  createEmptyPracticeResume,
  updatePracticePosition,
} from "../domain/practiceResume";

const mocks = vi.hoisted(() => ({
  getPracticeResume: vi.fn(),
  savePracticeResume: vi.fn(),
  syncPracticeResumeData: vi.fn(),
}));

vi.mock("../auth/supabaseClient", () => ({ supabaseClient: {} }));

vi.mock("../db/practiceResumeRepository", () => ({
  getPracticeResume: mocks.getPracticeResume,
  savePracticeResume: mocks.savePracticeResume,
  deletePracticeResume: vi.fn(),
  hasPracticeResume: vi.fn().mockResolvedValue(false),
}));

vi.mock("../db/progressRepository", () => ({
  clearAllProgress: vi.fn(),
  hasProgress: vi.fn().mockResolvedValue(false),
}));

vi.mock("../db/examRepository", () => ({
  clearAllExamSessions: vi.fn(),
  copyExamSessions: vi.fn(),
  hasExamSessions: vi.fn().mockResolvedValue(false),
}));

vi.mock("../sync/supabasePracticeCoordinator", () => ({
  mergeAnonymousPracticeDataWithSupabase: vi.fn(),
  resetPracticeData: vi.fn(),
  syncPracticeResumeData: mocks.syncPracticeResumeData,
  syncQuestionProgress: vi.fn(),
}));

vi.mock("../sync/supabaseExamSync", () => ({
  syncExamSessionsWithSupabase: vi.fn(),
}));

vi.mock("../pages/DashboardPage", () => ({
  DashboardPage: ({ practiceResume }: { practiceResume: { resetGeneration?: number; positions: { sequential: { questionId?: number } } } }) => (
    <div>{`generation:${practiceResume.resetGeneration};question:${practiceResume.positions.sequential.questionId ?? "none"}`}</div>
  ),
}));

const session = {
  user: { id: "user-1", email: "learner@example.com" },
} as Session;

describe("App practice generation recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
    const staleResume = {
      ...updatePracticePosition(
        createEmptyPracticeResume("user-1"),
        "sequential",
        { questionId: 42, index: 41 },
      ),
      resetGeneration: 0,
    };
    const resetResume = {
      ...createEmptyPracticeResume("user-1"),
      resetGeneration: 1,
    };
    mocks.getPracticeResume
      .mockResolvedValueOnce(staleResume)
      .mockResolvedValue(resetResume);
    mocks.savePracticeResume.mockResolvedValue(undefined);
    mocks.syncPracticeResumeData.mockRejectedValue(
      new Error("resume upsert failed after generation reset"),
    );
  });

  afterEach(() => cleanup());

  it("refreshes React state after a newer generation is applied but sync fails", async () => {
    render(
      <AuthContext.Provider
        value={{
          session,
          isLoading: false,
          isPasswordRecovery: false,
          completePasswordRecovery: () => {},
        }}
      >
        <App />
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByText("generation:1;question:none")).not.toBeNull();
    });
    expect(mocks.getPracticeResume).toHaveBeenCalledTimes(2);
  });
});
