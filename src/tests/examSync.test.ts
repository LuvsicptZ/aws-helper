import { describe, expect, it } from "vitest";
import type { ExamSession } from "../domain/exam";
import { syncExamSessions } from "../sync/examSync";

function exam(overrides: Partial<ExamSession>): ExamSession {
  return {
    id: overrides.id ?? "exam-1",
    questionIds: [1, 2],
    startedAt: "2026-01-01T00:00:00.000Z",
    durationSeconds: 60,
    answers: {},
    ...overrides,
  };
}

describe("exam session sync", () => {
  it("uploads local exam sessions when cloud is empty", async () => {
    const savedLocal: ExamSession[] = [];
    const uploaded: ExamSession[] = [];

    const result = await syncExamSessions({
      localSessions: [exam({ id: "local" })],
      remoteSessions: [],
      saveLocalSessions: async (sessions) => {
        savedLocal.push(...sessions);
      },
      saveRemoteSessions: async (sessions) => {
        uploaded.push(...sessions);
      },
    });

    expect(result).toEqual({ merged: 1, uploaded: 1, downloaded: 0 });
    expect(savedLocal).toHaveLength(1);
    expect(uploaded).toHaveLength(1);
  });

  it("downloads remote exam sessions when local is empty", async () => {
    const savedLocal: ExamSession[] = [];

    const result = await syncExamSessions({
      localSessions: [],
      remoteSessions: [exam({ id: "remote" })],
      saveLocalSessions: async (sessions) => {
        savedLocal.push(...sessions);
      },
      saveRemoteSessions: async () => undefined,
    });

    expect(result).toEqual({ merged: 1, uploaded: 0, downloaded: 1 });
    expect(savedLocal[0].id).toBe("remote");
  });

  it("keeps the newest copy when both sides have the same exam", async () => {
    const savedLocal: ExamSession[] = [];
    const uploaded: ExamSession[] = [];

    await syncExamSessions({
      localSessions: [
        exam({
          id: "same",
          submittedAt: "2026-01-01T00:00:00.000Z",
          score: 60,
        }),
      ],
      remoteSessions: [
        exam({
          id: "same",
          submittedAt: "2026-01-02T00:00:00.000Z",
          score: 80,
        }),
      ],
      saveLocalSessions: async (sessions) => {
        savedLocal.push(...sessions);
      },
      saveRemoteSessions: async (sessions) => {
        uploaded.push(...sessions);
      },
    });

    expect(savedLocal[0].score).toBe(80);
    expect(uploaded[0].score).toBe(80);
  });
});
