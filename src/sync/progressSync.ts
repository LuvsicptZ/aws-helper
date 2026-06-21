import type { QuestionProgress } from "../domain/progress";

export type ProgressSyncResult = {
  merged: number;
  uploaded: number;
  downloaded: number;
};

type SyncProgressInput = {
  localProgress: QuestionProgress[];
  remoteProgress: QuestionProgress[];
  saveLocalProgress: (progressList: QuestionProgress[]) => Promise<void>;
  saveRemoteProgress: (progressList: QuestionProgress[]) => Promise<void>;
  now?: Date;
};

function isRemoteNewer(local: QuestionProgress, remote: QuestionProgress): boolean {
  return new Date(remote.updatedAt).getTime() > new Date(local.updatedAt).getTime();
}

function pickNote(local: QuestionProgress, remote: QuestionProgress): string {
  if (!local.note) return remote.note;
  if (!remote.note) return local.note;

  return isRemoteNewer(local, remote) ? remote.note : local.note;
}

export function mergeProgressRecords(
  local: QuestionProgress,
  remote: QuestionProgress,
): QuestionProgress {
  const newer = isRemoteNewer(local, remote) ? remote : local;

  return {
    ...newer,
    questionId: local.questionId,
    attempts: Math.max(local.attempts, remote.attempts),
    correctAttempts: Math.max(local.correctAttempts, remote.correctAttempts),
    bookmarked: local.bookmarked === true || remote.bookmarked === true,
    markedGuessed: local.markedGuessed === true || remote.markedGuessed === true,
    note: pickNote(local, remote),
    updatedAt:
      new Date(local.updatedAt).getTime() > new Date(remote.updatedAt).getTime()
        ? local.updatedAt
        : remote.updatedAt,
  };
}

export async function syncProgress({
  localProgress,
  remoteProgress,
  saveLocalProgress,
  saveRemoteProgress,
  now = new Date(),
}: SyncProgressInput): Promise<ProgressSyncResult> {
  const localByQuestionId = new Map(
    localProgress.map((progress) => [progress.questionId, progress]),
  );
  const remoteByQuestionId = new Map(
    remoteProgress.map((progress) => [progress.questionId, progress]),
  );
  const questionIds = new Set([
    ...localByQuestionId.keys(),
    ...remoteByQuestionId.keys(),
  ]);
  const syncedAt = now.toISOString();
  const mergedProgress: QuestionProgress[] = [];
  let uploaded = 0;
  let downloaded = 0;

  for (const questionId of questionIds) {
    const local = localByQuestionId.get(questionId);
    const remote = remoteByQuestionId.get(questionId);

    if (local && remote) {
      mergedProgress.push({
        ...mergeProgressRecords(local, remote),
        syncedAt,
      });
      continue;
    }

    if (local) {
      uploaded += 1;
      mergedProgress.push({
        ...local,
        syncedAt,
      });
      continue;
    }

    if (remote) {
      downloaded += 1;
      mergedProgress.push({
        ...remote,
        syncedAt,
      });
    }
  }

  await saveLocalProgress(mergedProgress);
  await saveRemoteProgress(mergedProgress);

  return {
    merged: mergedProgress.length,
    uploaded,
    downloaded,
  };
}
