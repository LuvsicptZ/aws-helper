import { describe, expect, it } from "vitest";
import schema from "../../supabase/schema.sql?raw";
import reliableResetMigration from "../../supabase/migrations/20260801042000_reliable_practice_reset.sql?raw";

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

describe.each([
  ["canonical schema", schema],
  ["reliable reset migration", reliableResetMigration],
])("practice reset generation protocol in %s", (_name, sql) => {
  it("defines generation state and generation-tagged practice rows", () => {
    expect(sql).toContain(
      "create table if not exists public.practice_progress_state",
    );
    expect(sql).toMatch(/reset_generation integer not null default 0/i);
  });

  it("serializes reset and practice writes", () => {
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain(
      "create trigger guard_question_progress_generation",
    );
    expect(sql).toContain(
      "create trigger guard_practice_resume_generation",
    );
  });

  it("restricts the reset RPC to authenticated callers", () => {
    expect(sql).toContain(
      "create or replace function public.reset_practice_progress()",
    );
    expect(sql).toContain(
      "revoke execute on function public.reset_practice_progress() from public, anon",
    );
    expect(sql).toContain(
      "grant execute on function public.reset_practice_progress() to authenticated",
    );
  });

  it("enforces owner reads and generation-aware practice writes", () => {
    expect(sql).toMatch(
      /practice_progress_state[\s\S]*?for select[\s\S]*?auth\.uid\(\) = user_id/i,
    );
    expect(sql).toMatch(
      /question_progress[\s\S]*?for insert[\s\S]*?reset_generation/i,
    );
    expect(sql).toMatch(
      /practice_resume[\s\S]*?for update[\s\S]*?reset_generation/i,
    );
  });
});
