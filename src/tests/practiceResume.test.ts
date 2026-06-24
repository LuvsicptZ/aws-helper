import { describe, expect, it } from "vitest";
import type { PracticeMode } from "../domain/practiceMode";
import {
  createEmptyPracticeResume,
  mergePracticeResume,
  repairRandomQuestionIds,
  resolvePracticePosition,
  updatePracticePosition,
} from "../domain/practiceResume";

const modes: PracticeMode[] = [
  "sequential",
  "random",
  "incorrect",
  "guessed",
  "favorite",
];

describe("practice resume", () => {
  it("creates independent empty positions for every practice mode", () => {
    const resume = createEmptyPracticeResume("anonymous");

    expect(resume.ownerId).toBe("anonymous");
    expect(resume.lastMode).toBe("sequential");
    expect(Object.keys(resume.positions)).toEqual(modes);
    expect(resume.positions.sequential.questionId).toBeUndefined();
  });

  it("updates one mode without overwriting the other mode positions", () => {
    const initial = updatePracticePosition(
      createEmptyPracticeResume("anonymous"),
      "sequential",
      { questionId: 8, index: 7 },
      new Date("2026-06-24T01:00:00.000Z"),
    );

    const updated = updatePracticePosition(
      initial,
      "incorrect",
      { questionId: 42, index: 3 },
      new Date("2026-06-24T02:00:00.000Z"),
    );

    expect(updated.lastMode).toBe("incorrect");
    expect(updated.positions.sequential.questionId).toBe(8);
    expect(updated.positions.incorrect.questionId).toBe(42);
  });

  it("restores by question ID before using the saved index fallback", () => {
    expect(
      resolvePracticePosition({ questionId: 30, index: 1 }, [10, 20, 30, 40]),
    ).toBe(2);
    expect(
      resolvePracticePosition({ questionId: 99, index: 2 }, [10, 20, 30, 40]),
    ).toBe(2);
    expect(
      resolvePracticePosition({ questionId: 99, index: 20 }, [10, 20, 30, 40]),
    ).toBe(3);
    expect(resolvePracticePosition({ questionId: 99, index: 2 }, [])).toBe(0);
  });

  it("merges each mode independently using its newest update", () => {
    let local = createEmptyPracticeResume("user-1");
    local = updatePracticePosition(
      local,
      "sequential",
      { questionId: 5, index: 4 },
      new Date("2026-06-24T03:00:00.000Z"),
    );
    local = updatePracticePosition(
      local,
      "incorrect",
      { questionId: 20, index: 1 },
      new Date("2026-06-24T01:00:00.000Z"),
    );

    let remote = createEmptyPracticeResume("user-1");
    remote = updatePracticePosition(
      remote,
      "sequential",
      { questionId: 2, index: 1 },
      new Date("2026-06-24T02:00:00.000Z"),
    );
    remote = updatePracticePosition(
      remote,
      "incorrect",
      { questionId: 40, index: 3 },
      new Date("2026-06-24T04:00:00.000Z"),
    );

    const merged = mergePracticeResume(local, remote);

    expect(merged.positions.sequential.questionId).toBe(5);
    expect(merged.positions.incorrect.questionId).toBe(40);
    expect(merged.lastMode).toBe("incorrect");
  });

  it("repairs a saved random order without reshuffling known questions", () => {
    expect(repairRandomQuestionIds([3, 1, 3, 99], [1, 2, 3, 4])).toEqual([
      3, 1, 2, 4,
    ]);
  });
});
