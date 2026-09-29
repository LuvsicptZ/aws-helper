import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../theme/useTheme";
import { BrandLogo } from "./BrandLogo";
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
  const { isDark, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>();
  const [statusKind, setStatusKind] = useState<"error" | "success">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const isSignUp = mode === "sign-up";
  const isEmailActionReady = Boolean(
    supabaseClient && email.trim() && password && !isSubmitting,
  );

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
    <div className="ui-product-surface auth-page" data-practice-gateway>
      <a href="#login-form" className="skip-link">Skip to sign in</a>
      <header className="auth-topbar"><BrandLogo className="shell-logo" /><span className="auth-topbar-label">AWS Solutions Architect Associate</span><button className="ui-button ui-button--tertiary" type="button" aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"} onClick={toggleTheme}>{isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}<span>{isDark ? "Light mode" : "Dark mode"}</span></button></header>
      <main className="auth-layout" data-login-shell>
        <section className="auth-story" data-login-visual>
          <div data-login-promise><span className="ui-eyebrow">Your path to SAA-C03</span><h1>Build knowledge.<br />Find your confidence.</h1><p>Make room for your next step. Practice AWS architecture, learn from your answers, and test your understanding.</p></div>
          <div className="auth-feature-cards"><article className="auth-feature auth-feature--coral"><span className="ui-eyebrow">Practice</span><h2>One question.<br />More understanding.</h2><p>Explanations, bookmarks, and notes keep your learning together.</p><div className="auth-orbit" aria-hidden="true"><span /><span /><span /><b>AWS</b></div></article><article className="auth-feature auth-feature--blue"><span className="ui-eyebrow">Put it to the test</span><h2>65 questions.<br />130 minutes.</h2><p>A timed mock exam to understand where you stand.</p><span className="auth-exam-mark" aria-hidden="true">SAA<br /><b>C03</b></span></article></div>
        </section>
        <section className="auth-form-panel" aria-labelledby="login-heading" id="login-form" tabIndex={-1} data-login-form>
          <span className="ui-eyebrow">{isSignUp ? "Start your learning journey" : "Pick up where you left off"}</span><h2 id="login-heading">{isSignUp ? "Create account" : "Ready for the next question?"}</h2><p className="ui-muted">{isSignUp ? "Create an account to save your practice." : "Sign in and continue where you left off."}</p>
          <form onSubmit={event => { event.preventDefault(); void submitAuthForm(); }} aria-busy={isSubmitting}>
            <div className="ui-field"><label htmlFor="login-email">Email</label><div className="ui-input-wrap"><span aria-hidden="true"><FieldIcon type="email" /></span><input className="login-calm-field-control" id="login-email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={statusKind === "error" && Boolean(status)} aria-describedby={status ? "login-status" : undefined} /></div></div>
            <div className="ui-field"><label htmlFor="login-password">Password</label><div className="ui-input-wrap"><span aria-hidden="true"><FieldIcon type="password" /></span><input className="login-calm-field-control" id="login-password" type={showPassword ? "text" : "password"} required autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} aria-invalid={statusKind === "error" && Boolean(status)} aria-describedby={status ? "login-status" : undefined} /><button type="button" className="input-visibility min-h-11 min-w-11" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)}><EyeIcon hidden={showPassword} /></button></div></div>
            {!isSignUp && <div className="auth-forgot"><button className="ui-text-button" type="button" disabled={isSubmitting || !supabaseClient || !email.trim()} onClick={() => void sendPasswordReset()}>Forgot password?</button></div>}
            {status && <div id="login-status" className={`ui-message ui-message--${statusKind}`} role={statusKind === "error" ? "alert" : "status"} aria-live="polite">{status}</div>}
            <button className="ui-button ui-button--primary auth-submit" type="submit" disabled={!isEmailActionReady}>{isSubmitting ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}<ArrowIcon /></button>
          </form>
          <div className="auth-divider"><span />or<span /></div>
          <button className="ui-button ui-button--secondary auth-google" type="button" disabled={isSubmitting || !supabaseClient} onClick={() => void signInWithGoogle()}><GoogleIcon />Continue with Google</button>
          <p className="auth-switch">{isSignUp ? "Already have an account? " : "Don't have an account? "}<button type="button" className="ui-text-button" disabled={isSubmitting} onClick={() => { setMode(isSignUp ? "sign-in" : "sign-up"); setPassword(""); setShowPassword(false); setStatus(undefined); setStatusKind("success"); }}>{isSignUp ? "Sign in" : "Sign up"}</button></p>
          <p className="auth-footnote">Your progress, bookmarks, and notes follow your account.</p>
        </section>
      </main>
      <footer className="auth-footer"><span>AWS Mastery</span><span>Focused practice for SAA-C03.</span></footer>
    </div>
  );
}
