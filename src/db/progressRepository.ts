import type { QuestionProgress } from "../domain/progress";
import { db } from "./localDb";

export async function saveProgress(progress: QuestionProgress): Promise<void> {
  await db.progress.put(progress);
}

export async function getProgressByQuestionId(
  questionId: number,
): Promise<QuestionProgress | undefined> {
  return db.progress.get(questionId);
}

export async function getAllProgress(): Promise<QuestionProgress[]> {
  return db.progress.toArray();
}

export async function clearAllProgress(): Promise<void> {
  await db.progress.clear();
}