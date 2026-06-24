import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExamSession } from "../domain/exam";
import type { ChoiceKey } from "../domain/question";
import { getAllExamSessions, saveExamSession } from "../db/examRepository";
import { syncExamSessions, type ExamSyncResult } from "./examSync";

const EXAM_TABLE = "exam_sessions";

type RemoteExamRow = {
  user_id: string;
  id: string;
  question_ids: number[];
  started_at: string;
  submitted_at: string | null;
  duration_seconds: number;
  answers: Record<number, ChoiceKey[]>;
  score: number | null;
};

function fromRemoteRow(row: RemoteExamRow): ExamSession {
  return {
    id: row.id,
    questionIds: row.question_ids,
    startedAt: row.started_at,
    submittedAt: row.submitted_at ?? undefined,
    durationSeconds: row.duration_seconds,
    answers: row.answers,
    score: row.score ?? undefined,
  };
}

function toRemoteRow(userId: string, session: ExamSession): RemoteExamRow {
  return {
    user_id: userId,
    id: session.id,
    question_ids: session.questionIds,
    started_at: session.startedAt,
    submitted_at: session.submittedAt ?? null,
    duration_seconds: session.durationSeconds,
    answers: session.answers,
    score: session.score ?? null,
  };
}

export async function syncExamSessionsWithSupabase(
  supabaseClient: SupabaseClient,
  userId: string,
): Promise<ExamSyncResult> {
  const localSessions = await getAllExamSessions(userId);
  const { data, error } = await supabaseClient
    .from(EXAM_TABLE)
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const remoteSessions = (data ?? []).map((row) =>
    fromRemoteRow(row as RemoteExamRow),
  );

  return syncExamSessions({
    localSessions,
    remoteSessions,
    saveLocalSessions: async (sessions) => {
      for (const session of sessions) {
        await saveExamSession(session, userId);
      }
    },
    saveRemoteSessions: async (sessions) => {
      if (sessions.length === 0) return;

      const { error } = await supabaseClient
        .from(EXAM_TABLE)
        .upsert(
          sessions.map((session) => toRemoteRow(userId, session)),
          { onConflict: "user_id,id" },
        );

      if (error) {
        throw error;
      }
    },
  });
}
