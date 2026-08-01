import { describe, expect, it } from "vitest";
import { parsePracticeGeneration } from "../domain/practiceGeneration";

describe("practice generation", () => {
  it.each([0, 1, Number.MAX_SAFE_INTEGER])(
    "accepts safe non-negative integer %s",
    (value) => {
      expect(parsePracticeGeneration(value)).toBe(value);
    },
  );

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Infinity, "1", null])(
    "rejects invalid generation %s",
    (value) => {
      expect(() => parsePracticeGeneration(value)).toThrow(
        "Invalid practice generation",
      );
    },
  );
});
