import type { ExamSession } from "../domain/exam";
import { db } from "./localDb";

export async function saveExamSession(session: ExamSession): Promise<void> {
  await db.examSessions.put(session);
}

export async function getExamSessionById(id: string): Promise<ExamSession | undefined> {
  return db.examSessions.get(id);
}

export async function getAllExamSessions(): Promise<ExamSession[]> {
  return db.examSessions.orderBy("startedAt").reverse().toArray();
}

export async function clearAllExamSessions(): Promise<void> {
  await db.examSessions.clear();
}