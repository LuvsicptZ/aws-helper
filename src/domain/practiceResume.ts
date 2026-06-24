import type { PracticeMode } from "./practiceMode";

export const ANONYMOUS_OWNER_ID = "anonymous";

export type PracticePosition = {
  questionId?: number;
  index: number;
  updatedAt?: string;
  randomQuestionIds?: number[];
};

export type PracticeResume = {
  ownerId: string;
  lastMode: PracticeMode;
  positions: Record<PracticeMode, PracticePosition>;
};

const practiceModes: PracticeMode[] = [
  "sequential",
  "random",
  "incorrect",
  "guessed",
  "favorite",
];

export function createEmptyPracticeResume(ownerId: string): PracticeResume {
  return {
    ownerId,
    lastMode: "sequential",
    positions: Object.fromEntries(
      practiceModes.map((mode) => [mode, { index: 0 }]),
    ) as Record<PracticeMode, PracticePosition>,
  };
}

export function updatePracticePosition(
  resume: PracticeResume,
  mode: PracticeMode,
  position: Omit<PracticePosition, "updatedAt">,
  now = new Date(),
): PracticeResume {
  return {
    ...resume,
    lastMode: mode,
    positions: {
      ...resume.positions,
      [mode]: {
        ...position,
        updatedAt: now.toISOString(),
      },
    },
  };
}

export function resolvePracticePosition(
  position: Pick<PracticePosition, "questionId" | "index"> | undefined,
  questionIds: number[],
): number {
  if (questionIds.length === 0) return 0;

  if (position?.questionId !== undefined) {
    const questionIndex = questionIds.indexOf(position.questionId);
    if (questionIndex >= 0) return questionIndex;
  }

  return Math.min(Math.max(position?.index ?? 0, 0), questionIds.length - 1);
}

function updatedAtTime(position: PracticePosition | undefined): number {
  return position?.updatedAt ? new Date(position.updatedAt).getTime() : 0;
}

export function mergePracticeResume(
  local: PracticeResume,
  remote: PracticeResume,
): PracticeResume {
  const positions = Object.fromEntries(
    practiceModes.map((mode) => {
      const localPosition = local.positions[mode];
      const remotePosition = remote.positions[mode];
      return [
        mode,
        updatedAtTime(remotePosition) > updatedAtTime(localPosition)
          ? remotePosition ?? { index: 0 }
          : localPosition,
      ];
    }),
  ) as Record<PracticeMode, PracticePosition>;

  const lastMode = practiceModes.reduce((latestMode, mode) =>
    updatedAtTime(positions[mode]) > updatedAtTime(positions[latestMode])
      ? mode
      : latestMode,
  );

  return {
    ownerId: local.ownerId,
    lastMode,
    positions,
  };
}

export function repairRandomQuestionIds(
  savedQuestionIds: number[] | undefined,
  availableQuestionIds: number[],
): number[] {
  const available = new Set(availableQuestionIds);
  const repaired = (savedQuestionIds ?? []).filter(
    (questionId, index, list) =>
      available.has(questionId) && list.indexOf(questionId) === index,
  );
  const included = new Set(repaired);

  return [
    ...repaired,
    ...availableQuestionIds.filter((questionId) => !included.has(questionId)),
  ];
}
