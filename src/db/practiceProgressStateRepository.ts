import {
  ANONYMOUS_OWNER_ID,
  createEmptyPracticeResume,
  mergePracticeResume,
} from "../domain/practiceResume";
import {
  parsePracticeGeneration,
  StalePracticeGenerationError,
} from "../domain/practiceGeneration";
import { db } from "./localDb";
import { mergeProgressRecords } from "../sync/progressSync";

export async function getAppliedPracticeGeneration(
  ownerId: string,
): Promise<number> {
  return parsePracticeGeneration(
    (await db.practiceProgressState.get(ownerId))?.generation ?? 0,
  );
}

export async function applyLocalPracticeReset(
  ownerId: string,
  generationValue: number,
): Promise<void> {
  const generation = parsePracticeGeneration(generationValue);

  await db.transaction(
    "rw",
    db.ownerProgress,
    db.practiceResume,
    db.practiceProgressState,
    async () => {
      const currentGeneration = parsePracticeGeneration(
        (await db.practiceProgressState.get(ownerId))?.generation ?? 0,
      );
      if (generation <= currentGeneration) return;

      await db.ownerProgress.where("ownerId").equals(ownerId).delete();
      await db.practiceResume.put({
        ...createEmptyPracticeResume(ownerId),
        resetGeneration: generation,
      });
      await db.practiceProgressState.put({ ownerId, generation });
    },
  );
}

export async function mergeAnonymousPracticeData(
  ownerId: string,
  generationValue: number,
) {
  const generation = parsePracticeGeneration(generationValue);

  return db.transaction(
    "rw",
    db.ownerProgress,
    db.practiceResume,
    db.practiceProgressState,
    async () => {
      const currentGeneration = parsePracticeGeneration(
        (await db.practiceProgressState.get(ownerId))?.generation ?? 0,
      );
      if (generation !== currentGeneration) {
        throw new StalePracticeGenerationError();
      }

      const anonymousProgress = await db.ownerProgress
        .where("ownerId")
        .equals(ANONYMOUS_OWNER_ID)
        .toArray();
      for (const progress of anonymousProgress) {
        const key = `${ownerId}:${progress.questionId}`;
        const existing = await db.ownerProgress.get(key);
        const merged = existing
          ? mergeProgressRecords(existing, progress)
          : progress;
        await db.ownerProgress.put({
          ...merged,
          key,
          ownerId,
          resetGeneration: generation,
        });
      }

      const accountResume =
        (await db.practiceResume.get(ownerId)) ??
        createEmptyPracticeResume(ownerId);
      const anonymousResume = await db.practiceResume.get(ANONYMOUS_OWNER_ID);
      const mergedResume = anonymousResume
        ? mergePracticeResume(accountResume, {
            ...anonymousResume,
            ownerId,
          })
        : accountResume;
      const storedResume = {
        ...mergedResume,
        ownerId,
        resetGeneration: generation,
      };
      await db.practiceResume.put(storedResume);

      await db.ownerProgress
        .where("ownerId")
        .equals(ANONYMOUS_OWNER_ID)
        .delete();
      await db.practiceResume.delete(ANONYMOUS_OWNER_ID);

      return storedResume;
    },
  );
}
