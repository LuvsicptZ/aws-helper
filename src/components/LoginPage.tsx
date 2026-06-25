import { useState } from "react";
import {
  ArrowRight,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { supabaseClient } from "../auth/supabaseClient";
import { BrandLogo } from "./BrandLogo";

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

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function sendMagicLink() {
    if (!supabaseClient || !email.trim()) return;

    setIsSubmitting(true);
    setStatus(undefined);

    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin },
      });
      setStatus(error ? error.message : "Check your email for the login link.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signInWithGoogle() {
    if (!supabaseClient) return;

    setIsSubmitting(true);
    setStatus(undefined);

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

    if (error) {
      setStatus(error.message);
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f1eef3] p-3 text-[#11182b] sm:p-6 lg:flex lg:items-center lg:justify-center lg:p-10">
      <section
        data-login-shell
        className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-[1180px] overflow-hidden rounded-[24px] bg-white shadow-[0_22px_56px_rgba(25,20,35,0.12)] sm:min-h-[calc(100vh-3rem)] lg:h-[660px] lg:min-h-0 lg:grid-cols-[45%_55%]"
      >
        <aside className="relative hidden overflow-hidden bg-[#fff7f3] p-12 lg:flex lg:flex-col">
          <BrandLogo className="relative z-10 -ml-2 -mt-2 h-16 w-60 shrink-0 self-start" />

          <div
            data-login-promise
            className="relative z-10 my-auto max-w-[360px] -translate-y-8"
          >
            <h1 className="text-[46px] font-bold leading-[1.02] tracking-[-0.045em]">
              Stay focused.
              <br />
              Keep improving<span className="text-[#f4a340]">.</span>
            </h1>
            <p className="mt-6 max-w-[300px] text-lg leading-8 text-[#6e7789]">
              Build your AWS knowledge, one question at a time.
            </p>
          </div>

          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-40">
            <svg
              viewBox="0 0 560 160"
              preserveAspectRatio="none"
              className="h-full w-full"
            >
              <path
                d="M0 88C75 62 130 112 206 105c82-7 119-75 205-58 58 11 91 48 149 31v82H0Z"
                fill="#f1f1fb"
              />
              <path
                d="M0 108c77-16 126 32 210 24 91-9 130-72 217-57 55 10 82 34 133 25v60H0Z"
                fill="#e6e7f5"
              />
              <path
                d="M0 139c98-14 147 18 229 13 92-6 148-47 232-35 39 6 66 16 99 15v28H0Z"
                fill="#08122f"
              />
            </svg>
            <span className="absolute bottom-[46px] left-[44%] h-20 w-20 rounded-full bg-[#ffd76a] shadow-[0_10px_30px_rgba(246,190,69,0.2)]" />
            <span className="absolute bottom-[69px] left-[28%] h-3 w-6 rounded-t-full border-t-2 border-[#778198]" />
            <span className="absolute bottom-[48px] left-[34%] h-3 w-6 rounded-t-full border-t-2 border-[#778198]" />
          </div>
        </aside>

        <div className="relative flex min-w-0 flex-col px-6 py-7 sm:px-12 sm:py-10 lg:px-16 lg:py-12">
          <BrandLogo className="-ml-2 h-11 w-[165px] shrink-0 self-start lg:hidden" />

          <div
            data-login-form
            className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-start pb-6 pt-12 sm:justify-center sm:py-8 lg:py-12"
          >
            <header>
              <h2 className="text-[34px] font-bold leading-tight tracking-[-0.035em] sm:text-[38px]">
                Welcome back <span aria-hidden="true">👋</span>
              </h2>
              <p className="mt-2 text-base text-[#768092]">
                Sign in to continue your AWS practice.
              </p>
            </header>

            <form
              className="mt-10"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMagicLink();
              }}
            >
              <label
                htmlFor="login-email"
                className="text-sm font-semibold text-[#20283a]"
              >
                Email
              </label>
              <div className="relative mt-2">
                <Mail
                  aria-hidden="true"
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa2b0]"
                />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-14 w-full rounded-xl border border-[#dfe2e8] bg-white pl-12 pr-4 text-base text-[#11182b] shadow-[0_1px_2px_rgba(15,23,42,0.02)] outline-none transition placeholder:text-[#9ba3b1] focus:border-[#8290aa] focus:ring-4 focus:ring-[#e9ebf1]"
                />
              </div>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !supabaseClient
                }
                className="mt-6 inline-flex h-[54px] w-full items-center justify-center rounded-xl bg-[#08122f] px-5 text-base font-semibold text-white shadow-[0_8px_18px_rgba(8,18,47,0.16)] transition hover:bg-[#111d3e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#08122f] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="flex-1 text-center">
                  {isSubmitting ? "Sending…" : "Continue"}
                </span>
                <ArrowRight size={19} />
              </button>
            </form>

            <div className="my-8 flex items-center gap-4">
              <span className="h-px flex-1 bg-[#e6e7eb]" />
              <span className="text-sm text-[#7f8796]">Or continue with</span>
              <span className="h-px flex-1 bg-[#e6e7eb]" />
            </div>

            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              disabled={isSubmitting || !supabaseClient}
              className="inline-flex h-[54px] w-full items-center justify-center gap-3 rounded-xl border border-[#dfe2e8] bg-white px-5 text-base font-semibold text-[#20283a] shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#08122f] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {status ? (
              <p
                aria-live="polite"
                className="mt-4 text-center text-sm leading-5 text-[#687287]"
              >
                {status}
              </p>
            ) : null}

            <div className="mt-10 flex items-center justify-center gap-2 border-t border-[#ececf0] pt-6 text-sm text-[#727c8e]">
              <ShieldCheck size={17} />
              <span>Secure cloud sync across devices</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
