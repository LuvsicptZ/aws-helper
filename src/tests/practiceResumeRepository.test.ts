import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/localDb";
import {
  getPracticeResume,
  hasPracticeResume,
  savePracticeResume,
} from "../db/practiceResumeRepository";
import {
  createEmptyPracticeResume,
  updatePracticePosition,
} from "../domain/practiceResume";

beforeEach(async () => {
  await db.practiceResume.clear();
});

describe("practiceResumeRepository", () => {
  it("isolates resume records by owner", async () => {
    const anonymous = updatePracticePosition(
      createEmptyPracticeResume("anonymous"),
      "sequential",
      { questionId: 10, index: 9 },
    );
    const user = updatePracticePosition(
      createEmptyPracticeResume("user-1"),
      "sequential",
      { questionId: 25, index: 24 },
    );

    await savePracticeResume(anonymous);
    await savePracticeResume(user);

    await expect(getPracticeResume("anonymous")).resolves.toMatchObject({
      ownerId: "anonymous",
      positions: { sequential: { questionId: 10 } },
    });
    await expect(getPracticeResume("user-1")).resolves.toMatchObject({
      ownerId: "user-1",
      positions: { sequential: { questionId: 25 } },
    });
  });

  it("reports whether an owner has resume data", async () => {
    await expect(hasPracticeResume("anonymous")).resolves.toBe(false);
    await savePracticeResume(createEmptyPracticeResume("anonymous"));
    await expect(hasPracticeResume("anonymous")).resolves.toBe(true);
  });
});
