import Dexie, { type Table } from "dexie";
import type { QuestionProgress } from "../domain/progress";
import type { ExamSession } from "../domain/exam";
import type { PracticeResume } from "../domain/practiceResume";

export type StoredQuestionProgress = QuestionProgress & {
  key: string;
  ownerId: string;
};

export type StoredExamSession = ExamSession & {
  key: string;
  ownerId: string;
};

export type StoredPracticeProgressState = {
  ownerId: string;
  generation: number;
};

export class TrainerDatabase extends Dexie {
  progress!: Table<QuestionProgress, number>;
  ownerProgress!: Table<StoredQuestionProgress, string>;
  examSessions!: Table<ExamSession, string>;
  ownerExamSessions!: Table<StoredExamSession, string>;
  practiceResume!: Table<PracticeResume, string>;
  practiceProgressState!: Table<StoredPracticeProgressState, string>;

  constructor() {
    super("saa-c03-trainer");

    this.version(1).stores({
      progress: "questionId, updatedAt, syncedAt, lastResult, bookmarked",
      examSessions: "id, startedAt, submittedAt",
    });

    this.version(2).stores({
      progress: "questionId, updatedAt, syncedAt, lastResult, bookmarked",
      examSessions: "id, startedAt, submittedAt",
      practiceResume: "ownerId",
    });

    this.version(3)
      .stores({
        progress:
          "questionId, updatedAt, syncedAt, lastResult, bookmarked",
        ownerProgress:
          "key, ownerId, questionId, updatedAt, syncedAt, lastResult, bookmarked",
        examSessions: "id, startedAt, submittedAt",
        practiceResume: "ownerId",
      })
      .upgrade(async (transaction) => {
        const legacyProgress = await transaction.table("progress").toArray();
        if (legacyProgress.length === 0) return;

        await transaction.table("ownerProgress").bulkPut(
          legacyProgress.map((progress: QuestionProgress) => ({
            ...progress,
            ownerId: "anonymous",
            key: `anonymous:${progress.questionId}`,
          })),
        );
      });

    this.version(4)
      .stores({
        progress:
          "questionId, updatedAt, syncedAt, lastResult, bookmarked",
        ownerProgress:
          "key, ownerId, questionId, updatedAt, syncedAt, lastResult, bookmarked",
        examSessions: "id, startedAt, submittedAt",
        ownerExamSessions: "key, ownerId, id, startedAt, submittedAt",
        practiceResume: "ownerId",
      })
      .upgrade(async (transaction) => {
        const legacySessions = await transaction.table("examSessions").toArray();
        if (legacySessions.length === 0) return;

        await transaction.table("ownerExamSessions").bulkPut(
          legacySessions.map((session: ExamSession) => ({
            ...session,
            ownerId: "anonymous",
            key: `anonymous:${session.id}`,
          })),
        );
      });

    this.version(5).stores({
      progress: "questionId, updatedAt, syncedAt, lastResult, bookmarked",
      ownerProgress:
        "key, ownerId, questionId, updatedAt, syncedAt, lastResult, bookmarked",
      examSessions: "id, startedAt, submittedAt",
      ownerExamSessions: "key, ownerId, id, startedAt, submittedAt",
      practiceResume: "ownerId",
      practiceProgressState: "ownerId",
    });
  }
}

export const db = new TrainerDatabase();
