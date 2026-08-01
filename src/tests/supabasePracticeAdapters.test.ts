import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyProgress } from "../domain/progress";
import { createEmptyPracticeResume } from "../domain/practiceResume";
import { syncProgressWithSupabase } from "../sync/supabaseProgressSync";
import { syncPracticeResumeWithSupabase } from "../sync/supabasePracticeResumeSync";

const repositories = vi.hoisted(() => ({
  getAllProgress: vi.fn(),
  saveProgress: vi.fn(),
  getPracticeResume: vi.fn(),
  savePracticeResume: vi.fn(),
}));

vi.mock("../db/progressRepository", () => ({
  getAllProgress: repositories.getAllProgress,
  saveProgress: repositories.saveProgress,
}));

vi.mock("../db/practiceResumeRepository", () => ({
  getPracticeResume: repositories.getPracticeResume,
  savePracticeResume: repositories.savePracticeResume,
}));

describe("generation-aware Supabase practice adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositories.getAllProgress.mockResolvedValue([createEmptyProgress(1)]);
    repositories.saveProgress.mockResolvedValue(undefined);
    repositories.getPracticeResume.mockResolvedValue(
      createEmptyPracticeResume("user-1"),
    );
    repositories.savePracticeResume.mockResolvedValue(undefined);
  });

  it("tags question progress upserts with the current generation", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        upsert,
      })),
    } as unknown as SupabaseClient;

    await syncProgressWithSupabase(client, "user-1", 7);

    expect(upsert.mock.calls[0][0][0]).toMatchObject({
      user_id: "user-1",
      question_id: 1,
      reset_generation: 7,
    });
  });

  it("tags practice resume upserts with the current generation", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
        upsert,
      })),
    } as unknown as SupabaseClient;

    await syncPracticeResumeWithSupabase(client, "user-1", 7);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        reset_generation: 7,
      }),
      { onConflict: "user_id" },
    );
  });
});
