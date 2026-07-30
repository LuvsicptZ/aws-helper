// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { AuthContext } from "../auth/authContext";

const session = {
  user: {
    id: "user-1",
    email: "learner@example.com",
  },
} as Session;

function renderApp() {
  return renderToStaticMarkup(
    <AuthContext.Provider
      value={{
        session,
        isLoading: false,
        isPasswordRecovery: false,
        completePasswordRecovery: () => {},
      }}
    >
      <App />
    </AuthContext.Provider>,
  );
}

describe("app routing", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("restores the practice page from the URL after a fresh app start", () => {
    window.history.replaceState(null, "", "/practice?mode=sequential");

    const markup = renderApp();

    expect(markup).toContain("data-focused-practice-layout");
  });
});
