import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  syncAllPracticeData,
  syncQuestionProgress,
} from "../sync/supabasePracticeCoordinator";

const mocks = vi.hoisted(() => ({
  applyLocalPracticeReset: vi.fn(),
  getAppliedPracticeGeneration: vi.fn(),
  syncPracticeResumeWithSupabase: vi.fn(),
  syncProgressWithSupabase: vi.fn(),
}));

vi.mock("../db/practiceProgressStateRepository", () => ({
  applyLocalPracticeReset: mocks.applyLocalPracticeReset,
  getAppliedPracticeGeneration: mocks.getAppliedPracticeGeneration,
}));

vi.mock("../sync/supabasePracticeResumeSync", () => ({
  syncPracticeResumeWithSupabase: mocks.syncPracticeResumeWithSupabase,
}));

vi.mock("../sync/supabaseProgressSync", () => ({
  syncProgressWithSupabase: mocks.syncProgressWithSupabase,
}));

function clientWithGeneration(generation: unknown): SupabaseClient {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: generation === undefined ? null : { generation },
            error: null,
          }),
        })),
      })),
    })),
  } as unknown as SupabaseClient;
}

describe("Supabase practice coordinator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAppliedPracticeGeneration.mockResolvedValue(2);
    mocks.applyLocalPracticeReset.mockResolvedValue(undefined);
    mocks.syncPracticeResumeWithSupabase.mockResolvedValue({ ownerId: "user-1" });
    mocks.syncProgressWithSupabase.mockResolvedValue({ merged: 0 });
  });

  it("applies a newer generation before syncing practice data", async () => {
    await syncAllPracticeData(clientWithGeneration(3), "user-1");

    expect(mocks.applyLocalPracticeReset).toHaveBeenCalledWith("user-1", 3);
    expect(mocks.syncPracticeResumeWithSupabase).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      3,
    );
    expect(mocks.syncProgressWithSupabase).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      3,
    );
    expect(
      mocks.applyLocalPracticeReset.mock.invocationCallOrder[0],
    ).toBeLessThan(
      mocks.syncPracticeResumeWithSupabase.mock.invocationCallOrder[0],
    );
  });

  it("does not clear local data for an equal generation", async () => {
    await syncQuestionProgress(clientWithGeneration(2), "user-1");

    expect(mocks.applyLocalPracticeReset).not.toHaveBeenCalled();
    expect(mocks.syncProgressWithSupabase).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      2,
    );
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "3"])(
    "rejects invalid remote generation %s",
    async (generation) => {
      await expect(
        syncQuestionProgress(clientWithGeneration(generation), "user-1"),
      ).rejects.toThrow("Invalid practice generation");
      expect(mocks.syncProgressWithSupabase).not.toHaveBeenCalled();
    },
  );

  it("does not let an older cloud generation overwrite local state", async () => {
    await expect(
      syncQuestionProgress(clientWithGeneration(1), "user-1"),
    ).rejects.toThrow("Remote practice generation is older than local state");
    expect(mocks.syncProgressWithSupabase).not.toHaveBeenCalled();
  });
});
