import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetPracticeData,
  syncQuestionProgress,
} from "../sync/supabasePracticeCoordinator";

const mocks = vi.hoisted(() => ({
  applyLocalPracticeReset: vi.fn(),
  getAppliedPracticeGeneration: vi.fn(),
  syncProgressWithSupabase: vi.fn(),
}));

vi.mock("../db/practiceProgressStateRepository", () => ({
  applyLocalPracticeReset: mocks.applyLocalPracticeReset,
  getAppliedPracticeGeneration: mocks.getAppliedPracticeGeneration,
}));

vi.mock("../sync/supabaseProgressSync", () => ({
  syncProgressWithSupabase: mocks.syncProgressWithSupabase,
}));

vi.mock("../sync/supabasePracticeResumeSync", () => ({
  syncPracticeResumeWithSupabase: vi.fn(),
}));

function resetClient(result: unknown): SupabaseClient {
  return {
    rpc: vi.fn().mockResolvedValue(result),
  } as unknown as SupabaseClient;
}

describe("practice reset coordinator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applyLocalPracticeReset.mockResolvedValue(undefined);
    mocks.getAppliedPracticeGeneration.mockResolvedValue(0);
    mocks.syncProgressWithSupabase.mockResolvedValue({ merged: 0 });
  });

  it("does not clear local data when the RPC fails", async () => {
    const error = new Error("database unavailable");

    await expect(
      resetPracticeData(resetClient({ data: null, error }), "user-1"),
    ).rejects.toBe(error);
    expect(mocks.applyLocalPracticeReset).not.toHaveBeenCalled();
  });

  it.each([null, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "2"])(
    "rejects invalid RPC generation %s without clearing local data",
    async (data) => {
      await expect(
        resetPracticeData(resetClient({ data, error: null }), "user-1"),
      ).rejects.toThrow("Invalid practice generation");
      expect(mocks.applyLocalPracticeReset).not.toHaveBeenCalled();
    },
  );

  it("applies exactly the generation returned by the RPC", async () => {
    await expect(
      resetPracticeData(resetClient({ data: 4, error: null }), "user-1"),
    ).resolves.toBe(4);
    expect(mocks.applyLocalPracticeReset).toHaveBeenCalledWith("user-1", 4);
  });

  it("serializes reset and sync for the same owner", async () => {
    let resolveReset!: (value: unknown) => void;
    const rpcResult = new Promise((resolve) => {
      resolveReset = resolve;
    });
    const client = {
      rpc: vi.fn(() => rpcResult),
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { generation: 4 },
              error: null,
            }),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    const reset = resetPracticeData(client, "user-1");
    const sync = syncQuestionProgress(client, "user-1");
    await Promise.resolve();
    expect(mocks.syncProgressWithSupabase).not.toHaveBeenCalled();

    resolveReset({ data: 4, error: null });
    await Promise.all([reset, sync]);
    expect(mocks.syncProgressWithSupabase).toHaveBeenCalledTimes(1);
  });
});
