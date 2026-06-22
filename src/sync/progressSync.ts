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
  if (local.noteUpdatedAt || remote.noteUpdatedAt) {
    return pickByTimestamp(
      local.note,
      local.noteUpdatedAt,
      remote.note,
      remote.noteUpdatedAt,
    );
  }

  if (!local.note) return remote.note;
  if (!remote.note) return local.note;
  return isRemoteNewer(local, remote) ? remote.note : local.note;
}

function pickByTimestamp<T>(
  localValue: T,
  localUpdatedAt: string | undefined,
  remoteValue: T,
  remoteUpdatedAt: string | undefined,
): T {
  if (!localUpdatedAt && !remoteUpdatedAt) {
    return localValue;
  }

  if (!localUpdatedAt) {
    return remoteValue;
  }

  if (!remoteUpdatedAt) {
    return localValue;
  }

  return new Date(remoteUpdatedAt).getTime() > new Date(localUpdatedAt).getTime()
    ? remoteValue
    : localValue;
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
    bookmarked:
      local.bookmarkedUpdatedAt || remote.bookmarkedUpdatedAt
        ? pickByTimestamp(
            local.bookmarked,
            local.bookmarkedUpdatedAt,
            remote.bookmarked,
            remote.bookmarkedUpdatedAt,
          )
        : local.bookmarked === true || remote.bookmarked === true,
    markedGuessed:
      local.markedGuessedUpdatedAt || remote.markedGuessedUpdatedAt
        ? pickByTimestamp(
            local.markedGuessed,
            local.markedGuessedUpdatedAt,
            remote.markedGuessed,
            remote.markedGuessedUpdatedAt,
          )
        : local.markedGuessed === true || remote.markedGuessed === true,
    note: pickNote(local, remote),
    bookmarkedUpdatedAt: pickByTimestamp(
      local.bookmarkedUpdatedAt,
      local.bookmarkedUpdatedAt,
      remote.bookmarkedUpdatedAt,
      remote.bookmarkedUpdatedAt,
    ),
    markedGuessedUpdatedAt: pickByTimestamp(
      local.markedGuessedUpdatedAt,
      local.markedGuessedUpdatedAt,
      remote.markedGuessedUpdatedAt,
      remote.markedGuessedUpdatedAt,
    ),
    noteUpdatedAt: pickByTimestamp(
      local.noteUpdatedAt,
      local.noteUpdatedAt,
      remote.noteUpdatedAt,
      remote.noteUpdatedAt,
    ),
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
