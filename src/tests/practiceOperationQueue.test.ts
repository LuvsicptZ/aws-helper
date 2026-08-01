import { describe, expect, it } from "vitest";
import { runPracticeOperation } from "../sync/practiceOperationQueue";

describe("practice operation queue", () => {
  it("serializes one owner while allowing another owner to proceed", async () => {
    const events: string[] = [];
    let releaseFirst!: () => void;
    let markFirstStarted!: () => void;
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve;
    });
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = runPracticeOperation("user-1", async () => {
      events.push("first:start");
      markFirstStarted();
      await firstGate;
      events.push("first:end");
    });
    await firstStarted;

    const second = runPracticeOperation("user-1", async () => {
      events.push("second");
    });
    const otherOwner = runPracticeOperation("user-2", async () => {
      events.push("other");
    });

    await otherOwner;
    expect(events).toEqual(["first:start", "other"]);

    releaseFirst();
    await Promise.all([first, second]);
    expect(events).toEqual(["first:start", "other", "first:end", "second"]);
  });

  it("continues after a rejected operation", async () => {
    await expect(
      runPracticeOperation("user-1", async () => {
        throw new Error("sync failed");
      }),
    ).rejects.toThrow("sync failed");

    await expect(
      runPracticeOperation("user-1", async () => "recovered"),
    ).resolves.toBe("recovered");
  });
});
