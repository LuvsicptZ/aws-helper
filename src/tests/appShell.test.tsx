import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { AuthContext } from "../auth/authContext";
import { AppShell } from "../components/AppShell";

describe("app shell header", () => {
  it("keeps the signed-in account controls on every app page", () => {
    const session = {
      user: {
        id: "user-1",
        email: "ryan197427@outlook.com",
      },
    } as Session;
    const markup = renderToStaticMarkup(
      <AuthContext.Provider value={{ session, isLoading: false }}>
        <AppShell active="practice">
          <p>Practice</p>
        </AppShell>
      </AuthContext.Provider>,
    );

    expect(markup).toContain("ryan197427@outlook.com");
    expect(markup).toContain('aria-label="Sign out"');
    expect(markup).not.toContain(">Sign in</button>");
  });

  it("uses a flush content edge and aligned header actions", () => {
    const markup = renderToStaticMarkup(
      <AppShell active="dashboard">
        <p>Dashboard</p>
      </AppShell>,
    );

    expect(markup).not.toContain("md:rounded-tl-3xl");
    expect(markup).toContain(
      "min-h-16 items-center justify-between border-b border-gray-200",
    );
    expect(markup).toContain(
      "ml-auto min-w-0 items-center gap-2",
    );
    expect(markup).toContain(
      "inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl",
    );
    expect(markup).toContain('id="auth-email"');
  });

  it("does not render the deprecated sidebar utility panel", () => {
    const markup = renderToStaticMarkup(
      <AppShell active="dashboard">
        <p>Dashboard</p>
      </AppShell>,
    );

    expect(markup).not.toContain("Focus Mode");
    expect(markup).not.toContain("Start Focus Session");
    expect(markup).not.toContain("lucide-moon");
    expect(markup).not.toContain("lucide-settings");
  });

  it("uses a page-specific mobile header without duplicating desktop actions", () => {
    const markup = renderToStaticMarkup(
      <AppShell
        active="practice"
        mobileHeader={<div data-testid="mobile-header">Mobile practice</div>}
      >
        <p>Practice</p>
      </AppShell>,
    );

    expect(markup).toContain('data-testid="mobile-header"');
    expect(markup).toContain("hidden md:flex");
  });

  it.each([
    ["sequential", "Question Bank"],
    ["random", "Question Bank"],
    ["incorrect", "Review Incorrect"],
    ["guessed", "Review Guessed"],
    ["favorite", "Review Bookmarked"],
  ] as const)("highlights %s practice mode in the sidebar", (practiceMode, label) => {
    const markup = renderToStaticMarkup(
      <AppShell active="practice" practiceMode={practiceMode}>
        <p>Practice</p>
      </AppShell>,
    );
    const activeItemPattern = new RegExp(
      `<button[^>]*aria-current="page"[^>]*>[\\s\\S]*?${label}</button>`,
    );

    expect(markup).toMatch(activeItemPattern);
  });
});
