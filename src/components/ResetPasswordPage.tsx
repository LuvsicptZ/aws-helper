import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { supabaseClient } from "../auth/supabaseClient";
import { useAuth } from "../auth/authContext";
import { BrandLogo } from "./BrandLogo";

export function ResetPasswordPage() {
  const { completePasswordRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<string>();
  const [statusKind, setStatusKind] = useState<"error" | "success">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function updatePassword() {
    if (!supabaseClient || !password) return;

    setIsSubmitting(true);
    setStatus(undefined);
    setStatusKind("success");

    const { error } = await supabaseClient.auth.updateUser({ password });

    if (error) {
      setStatusKind("error");
      setStatus(error.message);
      setIsSubmitting(false);
      return;
    }

    setStatusKind("success");
    setStatus("Your password has been updated. Redirecting you now...");
    setIsSubmitting(false);
    window.setTimeout(() => completePasswordRecovery(), 700);
  }

  return (
    <main className="min-h-screen bg-[#f1eef3] p-3 text-[#11182b] sm:p-6 lg:flex lg:items-center lg:justify-center lg:p-10">
      <section className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[560px] flex-col justify-center rounded-[28px] bg-white px-6 py-8 shadow-[0_24px_70px_rgba(25,20,35,0.14)] sm:min-h-[640px] sm:px-12">
        <BrandLogo className="-ml-2 h-12 w-[185px] shrink-0 self-start" />

        <div className="mx-auto mt-14 w-full max-w-[420px]">
          <p className="mb-3 text-sm font-semibold text-[#f4a340]">
            Password recovery
          </p>
          <h1 className="text-[34px] font-bold leading-tight tracking-[-0.04em] sm:text-[38px]">
            Set a new password
          </h1>
          <p className="mt-2 text-base leading-6 text-[#768092]">
            Choose a new password for your AWS Mastery account.
          </p>

          <form
            className="mt-8"
            onSubmit={(event) => {
              event.preventDefault();
              void updatePassword();
            }}
          >
            <label
              htmlFor="new-password"
              className="text-sm font-semibold text-[#20283a]"
            >
              New password
            </label>
            <div className="relative mt-2">
              <LockKeyhole
                aria-hidden="true"
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa2b0]"
              />
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your new password"
                className="h-14 w-full rounded-xl border border-[#dfe2e8] bg-white pl-12 pr-12 text-base text-[#11182b] shadow-[0_1px_2px_rgba(15,23,42,0.02)] outline-none transition duration-200 placeholder:text-[#9ba3b1] hover:border-[#cfd5df] focus:border-[#8290aa] focus:ring-4 focus:ring-[#e9ebf1]"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-[#9aa2b0] transition duration-200 hover:bg-[#f4f5f8] hover:text-[#20283a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#08122f]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !supabaseClient}
              className="relative mt-6 inline-flex h-[54px] w-full cursor-pointer items-center justify-center rounded-xl bg-[#08122f] px-5 text-base font-semibold text-white shadow-[0_8px_18px_rgba(8,18,47,0.16)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#111d3e] hover:shadow-[0_12px_22px_rgba(8,18,47,0.18)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#08122f] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-45 disabled:shadow-none"
            >
              <span>{isSubmitting ? "Updating..." : "Update password"}</span>
              <ArrowRight
                aria-hidden="true"
                size={19}
                className="absolute right-5"
              />
            </button>
          </form>

          <div className="mt-4 min-h-[42px]" aria-live="polite">
            {status ? (
              <p
                className={
                  statusKind === "error"
                    ? "rounded-xl border border-[#ffd6d6] bg-[#fff5f5] px-4 py-2.5 text-center text-sm leading-5 text-[#9f1d1d]"
                    : "rounded-xl border border-[#ccebdd] bg-[#f3fbf7] px-4 py-2.5 text-center text-sm leading-5 text-[#276749]"
                }
              >
                {status}
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 border-t border-[#ececf0] pt-4 text-sm text-[#727c8e]">
            <ShieldCheck size={17} />
            <span>Secure account recovery</span>
          </div>
        </div>
      </section>
    </main>
  );
}
