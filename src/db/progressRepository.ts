import type { QuestionProgress } from "../domain/progress";
import { db } from "./localDb";
import { ANONYMOUS_OWNER_ID } from "../domain/practiceResume";
import { createEmptyProgress } from "../domain/progress";
import {
  parsePracticeGeneration,
  StalePracticeGenerationError,
} from "../domain/practiceGeneration";

async function currentGeneration(ownerId: string): Promise<number> {
  return parsePracticeGeneration(
    (await db.practiceProgressState.get(ownerId))?.generation ?? 0,
  );
}

export async function saveProgress(
  progress: QuestionProgress,
  ownerId = ANONYMOUS_OWNER_ID,
  expectedGenerationValue = progress.resetGeneration ?? 0,
): Promise<void> {
  const expectedGeneration = parsePracticeGeneration(expectedGenerationValue);
  await db.transaction(
    "rw",
    db.ownerProgress,
    db.practiceProgressState,
    async () => {
      const generation = await currentGeneration(ownerId);
      if (generation !== expectedGeneration) {
        throw new StalePracticeGenerationError();
      }
      await db.ownerProgress.put({
        ...progress,
        resetGeneration: generation,
        key: `${ownerId}:${progress.questionId}`,
        ownerId,
      });
    },
  );
}

export async function getProgressByQuestionId(
  questionId: number,
  ownerId = ANONYMOUS_OWNER_ID,
  expectedGenerationValue?: number,
): Promise<QuestionProgress | undefined> {
  return db.transaction(
    "r",
    db.ownerProgress,
    db.practiceProgressState,
    async () => {
      const generation = await currentGeneration(ownerId);
      if (
        expectedGenerationValue !== undefined &&
        parsePracticeGeneration(expectedGenerationValue) !== generation
      ) {
        throw new StalePracticeGenerationError();
      }
      const progress = await db.ownerProgress.get(`${ownerId}:${questionId}`);
      return (progress?.resetGeneration ?? 0) === generation
        ? progress
        : undefined;
    },
  );
}

export async function getAllProgress(
  ownerId = ANONYMOUS_OWNER_ID,
  expectedGenerationValue?: number,
): Promise<QuestionProgress[]> {
  return db.transaction(
    "r",
    db.ownerProgress,
    db.practiceProgressState,
    async () => {
      const generation = await currentGeneration(ownerId);
      if (
        expectedGenerationValue !== undefined &&
        parsePracticeGeneration(expectedGenerationValue) !== generation
      ) {
        throw new StalePracticeGenerationError();
      }
      const records = await db.ownerProgress
        .where("ownerId")
        .equals(ownerId)
        .toArray();
      return records.filter(
        (progress) => (progress.resetGeneration ?? 0) === generation,
      );
    },
  );
}

export async function getProgressForUpdate(
  questionId: number,
  ownerId = ANONYMOUS_OWNER_ID,
): Promise<QuestionProgress> {
  return db.transaction(
    "r",
    db.ownerProgress,
    db.practiceProgressState,
    async () => {
      const generation = await currentGeneration(ownerId);
      const progress = await db.ownerProgress.get(`${ownerId}:${questionId}`);
      if (progress && (progress.resetGeneration ?? 0) === generation) {
        return progress;
      }
      return createEmptyProgress(questionId, generation);
    },
  );
}

export async function clearAllProgress(
  ownerId = ANONYMOUS_OWNER_ID,
): Promise<void> {
  await db.ownerProgress.where("ownerId").equals(ownerId).delete();
}

export async function hasProgress(ownerId: string): Promise<boolean> {
  return (await db.ownerProgress.where("ownerId").equals(ownerId).count()) > 0;
}
