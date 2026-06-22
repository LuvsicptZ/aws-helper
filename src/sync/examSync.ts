import type { ExamSession } from "../domain/exam";

export type ExamSyncResult = {
  merged: number;
  uploaded: number;
  downloaded: number;
};

type SyncExamSessionsInput = {
  localSessions: ExamSession[];
  remoteSessions: ExamSession[];
  saveLocalSessions: (sessions: ExamSession[]) => Promise<void>;
  saveRemoteSessions: (sessions: ExamSession[]) => Promise<void>;
};

function sessionTime(session: ExamSession): number {
  return new Date(session.submittedAt ?? session.startedAt).getTime();
}

function mergeExamSession(local: ExamSession, remote: ExamSession): ExamSession {
  return sessionTime(remote) > sessionTime(local) ? remote : local;
}

export async function syncExamSessions({
  localSessions,
  remoteSessions,
  saveLocalSessions,
  saveRemoteSessions,
}: SyncExamSessionsInput): Promise<ExamSyncResult> {
  const localById = new Map(localSessions.map((session) => [session.id, session]));
  const remoteById = new Map(remoteSessions.map((session) => [session.id, session]));
  const sessionIds = new Set([...localById.keys(), ...remoteById.keys()]);
  const mergedSessions: ExamSession[] = [];
  let uploaded = 0;
  let downloaded = 0;

  for (const sessionId of sessionIds) {
    const local = localById.get(sessionId);
    const remote = remoteById.get(sessionId);

    if (local && remote) {
      mergedSessions.push(mergeExamSession(local, remote));
      continue;
    }

    if (local) {
      uploaded += 1;
      mergedSessions.push(local);
      continue;
    }

    if (remote) {
      downloaded += 1;
      mergedSessions.push(remote);
    }
  }

  await saveLocalSessions(mergedSessions);
  await saveRemoteSessions(mergedSessions);

  return {
    merged: mergedSessions.length,
    uploaded,
    downloaded,
  };
}
