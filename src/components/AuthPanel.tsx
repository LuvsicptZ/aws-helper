import { useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  CircleUserRound,
  LogIn,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { supabaseClient } from "../auth/supabaseClient";
import { syncExamSessionsWithSupabase } from "../sync/supabaseExamSync";
import { syncProgressWithSupabase } from "../sync/supabaseProgressSync";
import { syncPracticeResumeWithSupabase } from "../sync/supabasePracticeResumeSync";
import { useAuth } from "../auth/authContext";

type AuthPanelProps = {
  onSyncComplete?: () => void;
};

type AuthStatus = {
  message: string;
  tone: "success" | "error";
};

type SignedInAuthPanelProps = {
  email?: string;
  isSubmitting: boolean;
  isSyncing: boolean;
  onSignOut: () => void;
  onSync: () => void;
  status?: AuthStatus;
};

export function SignedInAuthPanel({
  email,
  isSubmitting,
  isSyncing,
  onSignOut,
  onSync,
  status,
}: SignedInAuthPanelProps) {
  return (
    <div className="flex min-w-0 flex-col items-end gap-1.5">
      <div
        aria-label="Account actions"
        className="flex min-w-0 items-center gap-1 rounded-xl border border-gray-200/90 bg-white p-1 shadow-sm"
      >
        <div className="hidden min-w-0 items-center gap-2 px-2 sm:flex">
          <CircleUserRound
            aria-hidden="true"
            className="shrink-0 text-gray-400"
            size={17}
          />
          <span
            className="max-w-40 truncate text-sm font-medium text-gray-700 lg:max-w-52"
            title={email}
          >
            {email}
          </span>
        </div>

        <span
          aria-hidden="true"
          className="hidden h-6 w-px shrink-0 bg-gray-200 sm:block"
        />

        <button
          type="button"
          aria-label="Sync progress"
          title="Sync progress"
          onClick={onSync}
          disabled={isSyncing}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0B1120] px-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120] disabled:cursor-wait disabled:opacity-70"
        >
          <RefreshCw
            aria-hidden="true"
            className={isSyncing ? "animate-spin motion-reduce:animate-none" : ""}
            size={16}
          />
          <span className="hidden md:inline">
            {isSyncing ? "Syncing" : "Sync"}
          </span>
        </button>

        <button
          type="button"
          aria-label="Sign out"
          title="Sign out"
          onClick={onSignOut}
          disabled={isSubmitting}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120] disabled:cursor-wait disabled:opacity-60"
        >
          <LogOut aria-hidden="true" size={16} />
          <span className="hidden md:inline">Sign out</span>
        </button>
      </div>

      {status ? (
        <p
          aria-live="polite"
          className={[
            "flex max-w-[min(28rem,calc(100vw-2rem))] items-start justify-end gap-1.5 pr-1 text-right text-sm leading-5",
            status.tone === "error"
              ? "text-amber-700"
              : "text-emerald-700",
          ].join(" ")}
          role="status"
          title={status.message}
        >
          {status.tone === "error" ? (
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 shrink-0"
              size={14}
            />
          ) : (
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 shrink-0"
              size={14}
            />
          )}
          <span className="line-clamp-2 max-w-72">{status.message}</span>
        </p>
      ) : null}
    </div>
  );
}

export function AuthPanel({ onSyncComplete }: AuthPanelProps) {
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<AuthStatus>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!supabaseClient) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
        Local mode
      </div>
    );
  }

  async function sendMagicLink() {
    if (!supabaseClient || !email.trim()) return;

    setIsSubmitting(true);
    setStatus(undefined);

    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      setStatus({
        tone: error ? "error" : "success",
        message: error?.message ?? "Check your email for the login link.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signOut() {
    if (!supabaseClient) return;

    setIsSubmitting(true);
    setStatus(undefined);

    try {
      const { error } = await supabaseClient.auth.signOut();
      setStatus(
        error
          ? {
              tone: "error",
              message: error.message,
            }
          : undefined,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function syncNow() {
    if (!supabaseClient || !session) return;

    setIsSyncing(true);
    setStatus(undefined);

    try {
      const progressResult = await syncProgressWithSupabase(
        supabaseClient,
        session.user.id,
      );
      const examResult = await syncExamSessionsWithSupabase(
        supabaseClient,
        session.user.id,
      );
      await syncPracticeResumeWithSupabase(supabaseClient, session.user.id);
      setStatus({
        tone: "success",
        message: `Synced ${progressResult.merged} progress and ${examResult.merged} exams.`,
      });
      onSyncComplete?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed.";
      setStatus({
        tone: "error",
        message: `${message} Your local progress is safe.`,
      });
    } finally {
      setIsSyncing(false);
    }
  }

  if (session) {
    return (
      <SignedInAuthPanel
        email={session.user.email}
        isSubmitting={isSubmitting}
        isSyncing={isSyncing}
        onSignOut={() => void signOut()}
        onSync={() => void syncNow()}
        status={status}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <label htmlFor="auth-email" className="sr-only">
          Email address
        </label>
        <input
          id="auth-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="min-h-10 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
        />
        <button
          type="button"
          onClick={() => void sendMagicLink()}
          disabled={isSubmitting || email.trim().length === 0}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0B1120] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogIn size={16} />
          Sign in
        </button>
      </div>
      {status ? (
        <p
          aria-live="polite"
          className={
            status.tone === "error"
              ? "text-sm text-amber-700"
              : "text-sm text-emerald-700"
          }
        >
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
