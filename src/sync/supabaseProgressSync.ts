import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChoiceKey } from "../domain/question";
import type { QuestionProgress } from "../domain/progress";
import { getAllProgress, saveProgress } from "../db/progressRepository";
import { syncProgress, type ProgressSyncResult } from "./progressSync";

const PROGRESS_TABLE = "question_progress";

type RemoteProgressRow = {
  user_id: string;
  question_id: number;
  attempts: number;
  correct_attempts: number;
  last_selected: ChoiceKey[];
  last_result: "correct" | "incorrect" | null;
  marked_guessed: boolean;
  bookmarked: boolean;
  note: string;
  updated_at: string;
  synced_at: string | null;
};

function fromRemoteRow(row: RemoteProgressRow): QuestionProgress {
  return {
    questionId: row.question_id,
    attempts: row.attempts,
    correctAttempts: row.correct_attempts,
    lastSelected: row.last_selected,
    lastResult: row.last_result ?? undefined,
    markedGuessed: row.marked_guessed,
    bookmarked: row.bookmarked,
    note: row.note,
    updatedAt: row.updated_at,
    syncedAt: row.synced_at ?? undefined,
  };
}

function toRemoteRow(userId: string, progress: QuestionProgress): RemoteProgressRow {
  return {
    user_id: userId,
    question_id: progress.questionId,
    attempts: progress.attempts,
    correct_attempts: progress.correctAttempts,
    last_selected: progress.lastSelected,
    last_result: progress.lastResult ?? null,
    marked_guessed: progress.markedGuessed,
    bookmarked: progress.bookmarked,
    note: progress.note,
    updated_at: progress.updatedAt,
    synced_at: progress.syncedAt ?? null,
  };
}

export async function syncProgressWithSupabase(
  supabaseClient: SupabaseClient,
  userId: string,
): Promise<ProgressSyncResult> {
  const localProgress = await getAllProgress();
  const { data, error } = await supabaseClient
    .from(PROGRESS_TABLE)
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const remoteProgress = (data ?? []).map((row) =>
    fromRemoteRow(row as RemoteProgressRow),
  );

  return syncProgress({
    localProgress,
    remoteProgress,
    saveLocalProgress: async (progressList) => {
      for (const progress of progressList) {
        await saveProgress(progress);
      }
    },
    saveRemoteProgress: async (progressList) => {
      if (progressList.length === 0) return;

      const { error } = await supabaseClient
        .from(PROGRESS_TABLE)
        .upsert(
          progressList.map((progress) => toRemoteRow(userId, progress)),
          { onConflict: "user_id,question_id" },
        );

      if (error) {
        throw error;
      }
    },
  });
}
