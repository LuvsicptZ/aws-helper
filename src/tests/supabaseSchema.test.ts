import { describe, expect, it } from "vitest";
import schema from "../../supabase/schema.sql?raw";

describe("Supabase progress reset policies", () => {
  it.each(["question_progress", "practice_resume"])(
    "allows users to delete their own rows from %s",
    (table) => {
      expect(schema).toMatch(
        new RegExp(
          `create policy [\\s\\S]*?on public\\.${table}[\\s\\S]*?for delete[\\s\\S]*?using \\(auth\\.uid\\(\\) = user_id\\)`,
          "i",
        ),
      );
    },
  );
});
