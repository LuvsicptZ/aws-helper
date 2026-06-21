import type { ChoiceKey } from "./question";

export type ExamSession = {
  id: string;
  questionIds: number[];
  startedAt: string;
  submittedAt?: string;
  durationSeconds: number;
  answers: Record<number, ChoiceKey[]>;
  score?: number;
};