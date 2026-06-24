import type { QuestionProgress } from "../domain/progress";
import { db } from "./localDb";
import { ANONYMOUS_OWNER_ID } from "../domain/practiceResume";
import { mergeProgressRecords } from "../sync/progressSync";

export async function saveProgress(
  progress: QuestionProgress,
  ownerId = ANONYMOUS_OWNER_ID,
): Promise<void> {
  await db.ownerProgress.put({
    ...progress,
    key: `${ownerId}:${progress.questionId}`,
    ownerId,
  });
}

export async function getProgressByQuestionId(
  questionId: number,
  ownerId = ANONYMOUS_OWNER_ID,
): Promise<QuestionProgress | undefined> {
  return db.ownerProgress.get(`${ownerId}:${questionId}`);
}

export async function getAllProgress(
  ownerId = ANONYMOUS_OWNER_ID,
): Promise<QuestionProgress[]> {
  return db.ownerProgress.where("ownerId").equals(ownerId).toArray();
}

export async function clearAllProgress(
  ownerId = ANONYMOUS_OWNER_ID,
): Promise<void> {
  await db.ownerProgress.where("ownerId").equals(ownerId).delete();
}

export async function hasProgress(ownerId: string): Promise<boolean> {
  return (await db.ownerProgress.where("ownerId").equals(ownerId).count()) > 0;
}

export async function copyProgress(
  fromOwnerId: string,
  toOwnerId: string,
): Promise<void> {
  const records = await getAllProgress(fromOwnerId);
  for (const progress of records) {
    const existing = await getProgressByQuestionId(
      progress.questionId,
      toOwnerId,
    );
    await saveProgress(
      existing ? mergeProgressRecords(existing, progress) : progress,
      toOwnerId,
    );
  }
}
