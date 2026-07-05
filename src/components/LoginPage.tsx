import { useState } from "react";
import { supabaseClient } from "../auth/supabaseClient";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.94c1.47 0 2.78.5 3.82 1.5l2.88-2.88A9.66 9.66 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      {hidden ? (
        <>
          <path d="m3 3 18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.4 9.6 6.1a1.7 1.7 0 0 1 0 1.8 17.7 17.7 0 0 1-2.5 3.1" />
          <path d="M6.4 6.7A17.7 17.7 0 0 0 2.4 11a1.7 1.7 0 0 0 0 1.9C3.5 14.6 7 19 12 19a10.4 10.4 0 0 0 4.1-.8" />
        </>
      ) : (
        <>
          <path d="M2.4 11.1a1.7 1.7 0 0 0 0 1.8C3.5 14.6 7 19 12 19s8.5-4.4 9.6-6.1a1.7 1.7 0 0 0 0-1.8C20.5 9.4 17 5 12 5S3.5 9.4 2.4 11.1Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function FieldIcon({ type }: { type: "email" | "password" | "shield" }) {
  const paths = {
    email: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    password: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        <path d="M12 15v1.5" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5.5c0 4.1 2.7 7.5 7 9.5 4.3-2 7-5.4 7-9.5V6Z" />
        <path d="m9.5 12 1.7 1.7 3.8-4" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      {paths[type]}
    </svg>
  );
}

function normalizeAuthError(message: string) {
  if (message.toLowerCase().includes("invalid login credentials")) {
    return "Email or password does not look right. Try again.";
  }

  return message;
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>();
  const [statusKind, setStatusKind] = useState<"error" | "success">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const isSignUp = mode === "sign-up";

  async function submitAuthForm() {
    if (!supabaseClient || !email.trim() || !password) return;

    setIsSubmitting(true);
    setStatus(undefined);
    setStatusKind("success");

    const authResult = isSignUp
      ? await supabaseClient.auth.signUp({
          email: email.trim(),
          password,
        })
      : await supabaseClient.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

    if (authResult.error) {
      setStatusKind("error");
      setStatus(normalizeAuthError(authResult.error.message));
      setIsSubmitting(false);
      return;
    }

    if (isSignUp) {
      setStatusKind("success");
      setStatus(
        "Check your inbox to confirm your account, then come back to practice.",
      );
      setIsSubmitting(false);
    }
  }

  async function sendPasswordReset() {
    if (!supabaseClient || !email.trim()) return;

    setIsSubmitting(true);
    setStatus(undefined);
    setStatusKind("success");

    const { error } = await supabaseClient.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: window.location.origin,
      },
    );

    if (error) {
      setStatusKind("error");
      setStatus(normalizeAuthError(error.message));
    } else {
      setStatusKind("success");
      setStatus("If this email is registered, a reset link is on its way.");
    }

    setIsSubmitting(false);
  }

  async function signInWithGoogle() {
    if (!supabaseClient) return;

    setIsSubmitting(true);
    setStatus(undefined);
    setStatusKind("success");

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

    if (error) {
      setStatusKind("error");
      setStatus(normalizeAuthError(error.message));
      setIsSubmitting(false);
    }
  }

  return (
    <main
      data-practice-gateway
      className="login-calm-page"
    >
      <nav className="login-calm-nav">
        <span aria-hidden="true" />
        <a
          href="#access"
          className="login-calm-nav-link"
        >
          Sign in
        </a>
      </nav>

      <section
        id="top"
        className="login-calm-shell"
      >
        <div className="login-calm-copy">
          <p className="login-calm-kicker">
            AWS Mastery
          </p>
          <h1>
            Sit down.
            <br />
            Keep
            <br />
            answering.
          </h1>
          <p>
            A quiet entry point for your AWS question session. No clutter, no
            noise—just you and the next question.
          </p>
        </div>

        <section
          id="access"
          data-login-form
          className="login-calm-form-panel"
        >
          <header>
            <h2>{isSignUp ? "Create account" : "Welcome back"}</h2>
            <p>
              {isSignUp
                ? "Create an account to save your practice"
                : "Sign in to continue your practice"}
            </p>
          </header>

          <form
            className="login-calm-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submitAuthForm();
            }}
          >
            <label
              htmlFor="login-email"
              className="sr-only"
            >
              Email
            </label>
            <div className="login-calm-field">
              <span>
                <FieldIcon type="email" />
              </span>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
              />
            </div>

            <label
              htmlFor="login-password"
              className="sr-only"
            >
              Password
            </label>
            <div className="login-calm-field">
              <span>
                <FieldIcon type="password" />
              </span>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isSignUp ? "Create password" : "Password"}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((current) => !current)}
                className="login-calm-eye-button"
              >
                <EyeIcon hidden={showPassword} />
              </button>
            </div>

            <div className="login-calm-forgot-row">
              {!isSignUp ? (
                <button
                  type="button"
                  onClick={() => void sendPasswordReset()}
                  disabled={isSubmitting || !supabaseClient || !email.trim()}
                  className="login-calm-link-button"
                >
                  Forgot password?
                </button>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !supabaseClient}
              className="login-calm-primary-button"
            >
              {isSubmitting
                ? "Please wait..."
                : isSignUp
                  ? "Create account"
                  : "Continue"}
              <ArrowIcon />
            </button>
          </form>

          <div className="login-calm-divider">
            <span />
            <em>or</em>
            <span />
          </div>

          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            disabled={isSubmitting || !supabaseClient}
            className="login-calm-google-button"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="login-calm-switch">
            {isSignUp ? "Already have an account? " : "New here? "}
            <button
              type="button"
              onClick={() => {
                setMode(isSignUp ? "sign-in" : "sign-up");
                setPassword("");
                setShowPassword(false);
                setStatus(undefined);
                setStatusKind("success");
              }}
              className="login-calm-link-button"
            >
              {isSignUp ? "Sign in" : "Create an account"}
            </button>
          </p>

          <div className="login-calm-status" aria-live="polite">
            {status ? (
              <p
                className={
                  statusKind === "error"
                    ? "login-calm-status-message login-calm-status-message--error"
                    : "login-calm-status-message login-calm-status-message--success"
                }
              >
                {status}
              </p>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
