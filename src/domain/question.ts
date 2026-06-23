export type ChoiceKey = "A" | "B" | "C" | "D" | "E" | "F";

export type Question = {
  id: number;
  sourceNumber: number;
  stem: string;
  options: Partial<Record<ChoiceKey, string>>;
  answer: ChoiceKey | ChoiceKey[];
  explanation: string;
  topics?: string[];
  sourcePage?: number;
};

export function normalizeAnswer(answer: ChoiceKey | ChoiceKey[]) : ChoiceKey[] {
    if (Array.isArray(answer)) {
        return [...answer].sort();
    } else {
        return [answer];
    }
}

export function gradeAnswer(
  correctAnswer: ChoiceKey | ChoiceKey[],
  selectedAnswer: ChoiceKey[],
): "correct" | "incorrect" {
  const normalizedCorrect = normalizeAnswer(correctAnswer);
  const normalizedSelected = [...selectedAnswer].sort();

  if (normalizedCorrect.length !== normalizedSelected.length) {
    return "incorrect";
  }

  return normalizedCorrect.every((key, index) => key === normalizedSelected[index])
    ? "correct"
    : "incorrect";
}
