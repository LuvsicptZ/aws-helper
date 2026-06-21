import Dexie, { type Table } from "dexie";
import type { QuestionProgress } from "../domain/progress";
import type { ExamSession } from "../domain/exam";

export class TrainerDatabase extends Dexie {
  progress!: Table<QuestionProgress, number>;
  examSessions!: Table<ExamSession, string>;

  constructor() {
    super("saa-c03-trainer");

    this.version(1).stores({
      progress: "questionId, updatedAt, syncedAt, lastResult, markedGuessed, bookmarked",
      examSessions: "id, startedAt, submittedAt",
    });
  }
}

export const db = new TrainerDatabase();