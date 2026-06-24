import type { PracticeResume } from "../domain/practiceResume";
import { db } from "./localDb";

export async function savePracticeResume(
  resume: PracticeResume,
): Promise<void> {
  await db.practiceResume.put(resume);
}

export async function getPracticeResume(
  ownerId: string,
): Promise<PracticeResume | undefined> {
  return db.practiceResume.get(ownerId);
}

export async function hasPracticeResume(ownerId: string): Promise<boolean> {
  return (await db.practiceResume.get(ownerId)) !== undefined;
}

export async function deletePracticeResume(ownerId: string): Promise<void> {
  await db.practiceResume.delete(ownerId);
}
