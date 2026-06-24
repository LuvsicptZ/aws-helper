import { useState } from "react";
import { LogIn, LogOut, RefreshCw } from "lucide-react";
import { supabaseClient } from "../auth/supabaseClient";
import { syncExamSessionsWithSupabase } from "../sync/supabaseExamSync";
import { syncProgressWithSupabase } from "../sync/supabaseProgressSync";
import { syncPracticeResumeWithSupabase } from "../sync/supabasePracticeResumeSync";
import { useAuth } from "../auth/authContext";

type AuthPanelProps = {
  onSyncComplete?: () => void;
};

export function AuthPanel({ onSyncComplete }: AuthPanelProps) {
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>();
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

      setStatus(error ? error.message : "Check your email for the login link.");
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
      setStatus(error ? error.message : undefined);
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
      setStatus(
        `Synced ${progressResult.merged} progress and ${examResult.merged} exams.`,
      );
      onSyncComplete?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed.";
      setStatus(`${message} Local progress is still available.`);
    } finally {
      setIsSyncing(false);
    }
  }

  if (session) {
    return (
      <div className="flex flex-col gap-2 sm:items-end">
        <div className="flex flex-wrap items-center gap-2">
          <span className="max-w-44 truncate rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
            {session.user.email}
          </span>
          <button
            type="button"
            onClick={() => void syncNow()}
            disabled={isSyncing}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0B1120] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120] disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw size={16} />
            Sync
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={isSubmitting}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120] disabled:cursor-wait disabled:opacity-70"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
        {status ? <p className="text-xs text-slate-500">{status}</p> : null}
      </div>
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
      {status ? <p className="text-xs text-slate-500">{status}</p> : null}
    </div>
  );
}
