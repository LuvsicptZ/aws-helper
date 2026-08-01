export function parsePracticeGeneration(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error("Invalid practice generation");
  }

  return value;
}

export class StalePracticeGenerationError extends Error {
  constructor() {
    super("Stale practice generation");
    this.name = "StalePracticeGenerationError";
  }
}
