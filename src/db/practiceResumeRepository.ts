import type { PracticeResume } from "../domain/practiceResume";
import { db } from "./localDb";
import {
  parsePracticeGeneration,
  StalePracticeGenerationError,
} from "../domain/practiceGeneration";

export async function savePracticeResume(
  resume: PracticeResume,
  expectedGenerationValue = resume.resetGeneration ?? 0,
): Promise<void> {
  const expectedGeneration = parsePracticeGeneration(expectedGenerationValue);
  await db.transaction(
    "rw",
    db.practiceResume,
    db.practiceProgressState,
    async () => {
      const generation = parsePracticeGeneration(
        (await db.practiceProgressState.get(resume.ownerId))?.generation ?? 0,
      );
      if (generation !== expectedGeneration) {
        throw new StalePracticeGenerationError();
      }
      await db.practiceResume.put({
        ...resume,
        resetGeneration: generation,
      });
    },
  );
}

export async function getPracticeResume(
  ownerId: string,
  expectedGenerationValue?: number,
): Promise<PracticeResume | undefined> {
  return db.transaction(
    "r",
    db.practiceResume,
    db.practiceProgressState,
    async () => {
      const generation = parsePracticeGeneration(
        (await db.practiceProgressState.get(ownerId))?.generation ?? 0,
      );
      if (
        expectedGenerationValue !== undefined &&
        parsePracticeGeneration(expectedGenerationValue) !== generation
      ) {
        throw new StalePracticeGenerationError();
      }
      const resume = await db.practiceResume.get(ownerId);
      return (resume?.resetGeneration ?? 0) === generation
        ? resume
        : undefined;
    },
  );
}

export async function hasPracticeResume(ownerId: string): Promise<boolean> {
  return (await db.practiceResume.get(ownerId)) !== undefined;
}

export async function deletePracticeResume(ownerId: string): Promise<void> {
  await db.practiceResume.delete(ownerId);
}
