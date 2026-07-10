// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  client: null as null | {
    auth: {
      resetPasswordForEmail: ReturnType<typeof vi.fn>;
      signInWithOAuth: ReturnType<typeof vi.fn>;
      signInWithPassword: ReturnType<typeof vi.fn>;
      signUp: ReturnType<typeof vi.fn>;
    };
  },
}));

vi.mock("../auth/supabaseClient", () => ({
  get supabaseClient() {
    return authMocks.client;
  },
}));

import { LoginPage } from "../components/LoginPage";

function createClient() {
  return {
    auth: {
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

function fillCredentials() {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "learner@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "practice-password" },
  });
}

describe("login page", () => {
  beforeEach(() => {
    authMocks.client = createClient();
    window.localStorage.clear();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps authentication actions unavailable without Supabase", () => {
    authMocks.client = null;
    render(<LoginPage />);

    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Forgot password?" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeDisabled();
  });

  it("enables email actions only when their required fields are present", () => {
    render(<LoginPage />);

    const submit = screen.getByRole("button", { name: "Sign in" });
    const reset = screen.getByRole("button", { name: "Forgot password?" });
    expect(submit).toBeDisabled();
    expect(reset).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "learner@example.com" },
    });
    expect(reset).toBeEnabled();
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "practice-password" },
    });
    expect(submit).toBeEnabled();
  });

  it("disables every authentication action while submitting", async () => {
    let resolveSignIn: (value: { error: null }) => void = () => {};
    authMocks.client!.auth.signInWithPassword.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }),
    );
    render(<LoginPage />);
    fillCredentials();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Please wait..." })).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Forgot password?" }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Continue with Google" }),
      ).toBeDisabled();
    });

    resolveSignIn({ error: null });
  });

  it("clears password and status when switching to sign-up", async () => {
    render(<LoginPage />);
    fillCredentials();
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(
      "If this email is registered, a reset link is on its way.",
    );
    expect(status).toHaveAttribute("aria-live", "polite");

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(
      screen.getByRole("heading", { name: "Create account" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Create an account to save your practice.")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("uses alert semantics for authentication errors", async () => {
    authMocks.client!.auth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    render(<LoginPage />);
    fillCredentials();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email or password does not look right. Try again.",
    );
  });

  it("labels the theme action and provides a full-size password control", () => {
    render(<LoginPage />);

    const theme = screen.getByRole("button", { name: "Switch to dark theme" });
    expect(theme).toHaveTextContent("Dark mode");
    const passwordToggle = screen.getByRole("button", { name: "Show password" });
    expect(passwordToggle).toHaveClass("min-h-11", "min-w-11");

    fireEvent.click(theme);
    expect(
      screen.getByRole("button", { name: "Switch to light theme" }),
    ).toHaveTextContent("Light mode");
  });
});
