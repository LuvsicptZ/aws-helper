import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createEmptyPracticeResume,
  type PracticeResume,
} from "../domain/practiceResume";
import {
  getPracticeResume,
  savePracticeResume,
} from "../db/practiceResumeRepository";
import { syncPracticeResume } from "./practiceResumeSync";

const PRACTICE_RESUME_TABLE = "practice_resume";

type RemotePracticeResumeRow = {
  user_id: string;
  last_mode: PracticeResume["lastMode"];
  positions: PracticeResume["positions"];
};

export async function syncPracticeResumeWithSupabase(
  supabaseClient: SupabaseClient,
  userId: string,
): Promise<PracticeResume> {
  const localResume =
    (await getPracticeResume(userId)) ?? createEmptyPracticeResume(userId);
  const { data, error } = await supabaseClient
    .from(PRACTICE_RESUME_TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  const remoteRow = data as RemotePracticeResumeRow | null;
  const remoteResume = remoteRow
    ? {
        ownerId: userId,
        lastMode: remoteRow.last_mode,
        positions: remoteRow.positions,
      }
    : undefined;

  return syncPracticeResume({
    localResume,
    remoteResume,
    saveLocalResume: savePracticeResume,
    saveRemoteResume: async (resume) => {
      const { error: saveError } = await supabaseClient
        .from(PRACTICE_RESUME_TABLE)
        .upsert(
          {
            user_id: userId,
            last_mode: resume.lastMode,
            positions: resume.positions,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (saveError) throw saveError;
    },
  });
}
