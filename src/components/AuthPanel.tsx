import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { LogIn, LogOut, RefreshCw } from "lucide-react";
import { supabaseClient } from "../auth/supabaseClient";
import { syncProgressWithSupabase } from "../sync/supabaseProgressSync";

export function AuthPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!supabaseClient) return;

    void supabaseClient.auth
      .getSession()
      .then(({ data }) => setSession(data.session));

    const { data } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  if (!supabaseClient) {
    return (
      <div className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm shadow-stone-300/30">
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
      const result = await syncProgressWithSupabase(
        supabaseClient,
        session.user.id,
      );
      setStatus(
        `Synced ${result.merged} records. Uploaded ${result.uploaded}, downloaded ${result.downloaded}.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sync failed.");
    } finally {
      setIsSyncing(false);
    }
  }

  if (session) {
    return (
      <div className="flex flex-col gap-2 sm:items-end">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm shadow-stone-300/30">
            {session.user.email}
          </span>
          <button
            type="button"
            onClick={() => void syncNow()}
            disabled={isSyncing}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-stone-400/40 transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw size={16} />
            Sync
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={isSubmitting}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm shadow-stone-300/30 transition hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-wait disabled:opacity-70"
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
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="min-h-10 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm shadow-stone-300/30 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
        <button
          type="button"
          onClick={() => void sendMagicLink()}
          disabled={isSubmitting || email.trim().length === 0}
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-stone-400/40 transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogIn size={16} />
          Sign in
        </button>
      </div>
      {status ? <p className="text-xs text-slate-500">{status}</p> : null}
    </div>
  );
}
