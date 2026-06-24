import type { ExamSession } from "../domain/exam";
import { ANONYMOUS_OWNER_ID } from "../domain/practiceResume";
import { db } from "./localDb";

export async function saveExamSession(
  session: ExamSession,
  ownerId = ANONYMOUS_OWNER_ID,
): Promise<void> {
  await db.ownerExamSessions.put({
    ...session,
    ownerId,
    key: `${ownerId}:${session.id}`,
  });
}

export async function getExamSessionById(
  id: string,
  ownerId = ANONYMOUS_OWNER_ID,
): Promise<ExamSession | undefined> {
  return db.ownerExamSessions.get(`${ownerId}:${id}`);
}

export async function getAllExamSessions(
  ownerId = ANONYMOUS_OWNER_ID,
): Promise<ExamSession[]> {
  return db.ownerExamSessions
    .where("ownerId")
    .equals(ownerId)
    .sortBy("startedAt")
    .then((sessions) => sessions.reverse());
}

export async function clearAllExamSessions(
  ownerId = ANONYMOUS_OWNER_ID,
): Promise<void> {
  await db.ownerExamSessions.where("ownerId").equals(ownerId).delete();
}

export async function hasExamSessions(ownerId: string): Promise<boolean> {
  return (
    (await db.ownerExamSessions.where("ownerId").equals(ownerId).count()) > 0
  );
}

export async function copyExamSessions(
  fromOwnerId: string,
  toOwnerId: string,
): Promise<void> {
  const sessions = await getAllExamSessions(fromOwnerId);
  for (const session of sessions) {
    const existing = await getExamSessionById(session.id, toOwnerId);
    if (!existing) {
      await saveExamSession(session, toOwnerId);
    }
  }
}
