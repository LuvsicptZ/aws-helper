import { useCallback, useEffect, useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import { ExamPage } from "./pages/ExamPage";
import { PracticePage } from "./pages/PracticePage";
import type { PracticeMode } from "./domain/practiceMode";
import type { ShellRoute } from "./components/AppShell";
import { questions } from "./data/questions";
import {
  ANONYMOUS_OWNER_ID,
  createEmptyPracticeResume,
  mergePracticeResume,
  updatePracticePosition,
} from "./domain/practiceResume";
import type {
  PracticePosition,
  PracticeResume,
} from "./domain/practiceResume";
import {
  getPracticeResume,
  deletePracticeResume,
  hasPracticeResume,
  savePracticeResume,
} from "./db/practiceResumeRepository";
import {
  clearAllProgress,
  copyProgress,
  hasProgress,
} from "./db/progressRepository";
import { useAuth } from "./auth/authContext";
import { supabaseClient } from "./auth/supabaseClient";
import { syncPracticeResumeWithSupabase } from "./sync/supabasePracticeResumeSync";
import { syncProgressWithSupabase } from "./sync/supabaseProgressSync";
import {
  clearAllExamSessions,
  copyExamSessions,
  hasExamSessions,
} from "./db/examRepository";
import { syncExamSessionsWithSupabase } from "./sync/supabaseExamSync";
import { LoginPage } from "./components/LoginPage";
import { ResetPasswordPage } from "./components/ResetPasswordPage";

function normalizePracticeMode(mode: PracticeMode | undefined): PracticeMode {
  return mode === "incorrect" || mode === "favorite" ? mode : "sequential";
}

export default function App() {
  const {
    session,
    isLoading: isAuthLoading,
    isPasswordRecovery,
  } = useAuth();
  const [page, setPage] = useState<ShellRoute>("dashboard");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("sequential");
  const [examRunId, setExamRunId] = useState(0);
  const [practiceResume, setPracticeResume] = useState<PracticeResume>(() =>
    createEmptyPracticeResume(ANONYMOUS_OWNER_ID),
  );
  const [showAnonymousProgressPrompt, setShowAnonymousProgressPrompt] =
    useState(false);
  const [progressRefreshToken, setProgressRefreshToken] = useState(0);
  const ownerId = session?.user.id ?? ANONYMOUS_OWNER_ID;

  useEffect(() => {
    if (isAuthLoading) return;

    let isCurrent = true;

    void (async () => {
      const savedResume =
        (await getPracticeResume(ownerId)) ?? createEmptyPracticeResume(ownerId);
      if (!isCurrent) return;
      setPracticeResume(savedResume);

      if (!session || !supabaseClient) {
        setShowAnonymousProgressPrompt(false);
        return;
      }

      const decisionKey = `anonymous-progress-decision:${ownerId}`;
      const hasAnonymous =
        (await hasPracticeResume(ANONYMOUS_OWNER_ID)) ||
        (await hasProgress(ANONYMOUS_OWNER_ID)) ||
        (await hasExamSessions(ANONYMOUS_OWNER_ID));
      const previousDecision = localStorage.getItem(decisionKey);
      setShowAnonymousProgressPrompt(
        hasAnonymous && previousDecision === null,
      );

      try {
        const syncedResume = await syncPracticeResumeWithSupabase(
          supabaseClient,
          ownerId,
        );
        if (!isCurrent) return;
        setPracticeResume(syncedResume);
        if (!hasAnonymous || previousDecision !== null) {
          await syncProgressWithSupabase(supabaseClient, ownerId);
          await syncExamSessionsWithSupabase(supabaseClient, ownerId);
          setProgressRefreshToken((token) => token + 1);
        }
      } catch {
        if (!isCurrent) return;
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [isAuthLoading, ownerId, session]);

  const savePosition = useCallback(
    (
      mode: PracticeMode,
      position: Omit<PracticePosition, "updatedAt">,
    ) => {
      setPracticeResume((currentResume) => {
        const nextResume = updatePracticePosition(
          currentResume,
          mode,
          position,
        );
        void savePracticeResume(nextResume);
        return nextResume;
      });
    },
    [],
  );

  function keepAnonymousProgressSeparate() {
    localStorage.setItem(`anonymous-progress-decision:${ownerId}`, "separate");
    setShowAnonymousProgressPrompt(false);
    if (supabaseClient) {
      const client = supabaseClient;
      void syncProgressWithSupabase(client, ownerId)
        .then(() => syncExamSessionsWithSupabase(client, ownerId))
        .then(() => {
          setProgressRefreshToken((token) => token + 1);
        })
        .catch(() => undefined);
    }
  }

  function mergeAnonymousProgress() {
    void (async () => {
      const anonymousResume = await getPracticeResume(ANONYMOUS_OWNER_ID);
      const mergedResume = anonymousResume
        ? mergePracticeResume(practiceResume, {
            ...anonymousResume,
            ownerId,
          })
        : practiceResume;
      await savePracticeResume(mergedResume);
      await copyProgress(ANONYMOUS_OWNER_ID, ownerId);
      await copyExamSessions(ANONYMOUS_OWNER_ID, ownerId);
      await clearAllProgress(ANONYMOUS_OWNER_ID);
      await clearAllExamSessions(ANONYMOUS_OWNER_ID);
      await deletePracticeResume(ANONYMOUS_OWNER_ID);
      localStorage.setItem(`anonymous-progress-decision:${ownerId}`, "merged");
      setPracticeResume(mergedResume);
      setShowAnonymousProgressPrompt(false);

      if (supabaseClient) {
        try {
          await syncProgressWithSupabase(supabaseClient, ownerId);
          await syncExamSessionsWithSupabase(supabaseClient, ownerId);
          await syncPracticeResumeWithSupabase(supabaseClient, ownerId);
          setProgressRefreshToken((token) => token + 1);
        } catch {
          // Local merged progress remains saved even if cloud sync is unavailable.
        }
      }
    })();
  }

  function openPractice(mode: PracticeMode = "sequential", initialIndex?: number) {
    const nextMode = normalizePracticeMode(mode);
    setPracticeMode(nextMode);
    if (initialIndex !== undefined) {
      setPracticeResume((currentResume) => {
        const nextResume = updatePracticePosition(currentResume, nextMode, {
          questionId: questions[initialIndex]?.id ?? 1,
          index: initialIndex,
        });
        void savePracticeResume(nextResume);
        return nextResume;
      });
    }
    setPage("practice");
  }

  function openExam() {
    setExamRunId((currentRunId) => currentRunId + 1);
    setPage("exam");
  }

  const handleResetProgress = useCallback(async () => {
    if (
      !window.confirm(
        "Are you sure you want to reset all your practice progress? This cannot be undone.",
      )
    ) {
      return;
    }

    // 1. Clear local databases
    await clearAllProgress(ownerId);
    await deletePracticeResume(ownerId);

    // 2. Clear remote databases if logged in
    if (session && supabaseClient) {
      try {
        await supabaseClient
          .from("question_progress")
          .delete()
          .eq("user_id", ownerId);
        await supabaseClient
          .from("practice_resume")
          .delete()
          .eq("user_id", ownerId);
      } catch {
        // Keep offline deletion even if network fails
      }
    }

    // 3. Reset local states
    const freshResume = createEmptyPracticeResume(ownerId);
    await savePracticeResume(freshResume);
    setPracticeResume(freshResume);
    setProgressRefreshToken((token) => token + 1);
  }, [ownerId, session]);

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f1eef3] text-sm text-[#687287]">
        Loading…
      </div>
    );
  }

  if (isPasswordRecovery) {
    return <ResetPasswordPage />;
  }

  if (!session) {
    return <LoginPage />;
  }

  if (page === "practice") {
    return (
      <PracticePage
        key={practiceMode}
        ownerId={ownerId}
        initialMode={practiceMode}
        resumePositions={practiceResume.positions}
        onPositionChange={savePosition}
        onDashboardClick={() => setPage("dashboard")}
        onExamClick={openExam}
        onPracticeClick={(mode, idx) => openPractice(mode ?? "sequential", idx)}
        onNavigate={setPage}
      />
    );
  }

  if (page === "exam") {
    return (
      <ExamPage
        key={examRunId}
        ownerId={ownerId}
        onDashboardClick={() => setPage("dashboard")}
        onPracticeClick={(mode, idx) => openPractice(mode ?? "sequential", idx)}
        onExamClick={openExam}
        onNavigate={setPage}
      />
    );
  }

  return (
    <DashboardPage
      ownerId={ownerId}
      progressRefreshToken={progressRefreshToken}
      onNavigate={setPage}
      onPracticeClick={(mode, idx) => openPractice(mode ?? "sequential", idx)}
      onExamClick={openExam}
      practiceResume={practiceResume}
      showAnonymousProgressPrompt={showAnonymousProgressPrompt}
      onMergeAnonymousProgress={mergeAnonymousProgress}
      onKeepAnonymousProgressSeparate={keepAnonymousProgressSeparate}
      onResetProgress={handleResetProgress}
    />
  );
}
