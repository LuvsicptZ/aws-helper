import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyLocalPracticeReset,
  getAppliedPracticeGeneration,
} from "../db/practiceProgressStateRepository";
import { parsePracticeGeneration } from "../domain/practiceGeneration";
import { runPracticeOperation } from "./practiceOperationQueue";
import { syncPracticeResumeWithSupabase } from "./supabasePracticeResumeSync";
import { syncProgressWithSupabase } from "./supabaseProgressSync";

async function preparePracticeGeneration(
  client: SupabaseClient,
  ownerId: string,
): Promise<number> {
  const { data, error } = await client
    .from("practice_progress_state")
    .select("generation")
    .eq("user_id", ownerId)
    .maybeSingle();

  if (error) throw error;

  const generation = parsePracticeGeneration(data?.generation ?? 0);
  const localGeneration = await getAppliedPracticeGeneration(ownerId);

  if (generation < localGeneration) {
    throw new Error("Remote practice generation is older than local state");
  }

  if (generation > localGeneration) {
    await applyLocalPracticeReset(ownerId, generation);
  }

  return generation;
}

export async function syncAllPracticeData(
  client: SupabaseClient,
  ownerId: string,
) {
  return runPracticeOperation(ownerId, async () => {
    const generation = await preparePracticeGeneration(client, ownerId);
    const resume = await syncPracticeResumeWithSupabase(
      client,
      ownerId,
      generation,
    );
    const progress = await syncProgressWithSupabase(
      client,
      ownerId,
      generation,
    );
    return { generation, resume, progress };
  });
}

export async function syncQuestionProgress(
  client: SupabaseClient,
  ownerId: string,
) {
  return runPracticeOperation(ownerId, async () => {
    const generation = await preparePracticeGeneration(client, ownerId);
    return syncProgressWithSupabase(client, ownerId, generation);
  });
}

export async function syncPracticeResumeData(
  client: SupabaseClient,
  ownerId: string,
) {
  return runPracticeOperation(ownerId, async () => {
    const generation = await preparePracticeGeneration(client, ownerId);
    return syncPracticeResumeWithSupabase(client, ownerId, generation);
  });
}

export async function resetPracticeData(
  client: SupabaseClient,
  ownerId: string,
): Promise<number> {
  return runPracticeOperation(ownerId, async () => {
    const { data, error } = await client.rpc("reset_practice_progress");
    if (error) throw error;

    const generation = parsePracticeGeneration(data);
    await applyLocalPracticeReset(ownerId, generation);
    return generation;
  });
}
