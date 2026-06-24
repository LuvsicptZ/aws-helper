import { describe, expect, it } from "vitest";
import { getDashboardGreeting } from "../domain/dashboardGreeting";

describe("dashboard greeting", () => {
  it("welcomes signed-out visitors without implying recognition", () => {
    expect(getDashboardGreeting(false)).toEqual({
      title: "Start your AWS practice",
      subtitle: "Build momentum one question at a time.",
    });
  });

  it("welcomes authenticated users back", () => {
    expect(getDashboardGreeting(true)).toEqual({
      title: "Welcome back",
      subtitle: "Keep going one small session at a time.",
    });
  });
});
