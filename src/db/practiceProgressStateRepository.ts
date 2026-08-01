import { createEmptyPracticeResume } from "../domain/practiceResume";
import { parsePracticeGeneration } from "../domain/practiceGeneration";
import { db } from "./localDb";

export async function getAppliedPracticeGeneration(
  ownerId: string,
): Promise<number> {
  return (await db.practiceProgressState.get(ownerId))?.generation ?? 0;
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
      const currentGeneration =
        (await db.practiceProgressState.get(ownerId))?.generation ?? 0;
      if (generation <= currentGeneration) return;

      await db.ownerProgress.where("ownerId").equals(ownerId).delete();
      await db.practiceResume.put(createEmptyPracticeResume(ownerId));
      await db.practiceProgressState.put({ ownerId, generation });
    },
  );
}
