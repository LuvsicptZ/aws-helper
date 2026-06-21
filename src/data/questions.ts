import rawQuestions from "../../data/questions.json";
import type { Question } from "../domain/question";

export const questions = rawQuestions as Question[];
export const totalQuestions = questions.length;

export function getQuestionByIndex(index: number): Question | undefined {
  return questions[index];
}