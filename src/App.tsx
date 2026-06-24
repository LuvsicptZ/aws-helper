import { useCallback, useEffect, useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import { ExamPage } from "./pages/ExamPage";
import { PracticePage } from "./pages/PracticePage";
import { SecondaryPage } from "./pages/SecondaryPage";
import type { PracticeMode } from "./domain/practiceMode";
import type { ShellRoute } from "./components/AppShell";
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

export default function App() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const [page, setPage] = useState<ShellRoute>("dashboard");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("sequential");
  const [examRunId, setExamRunId] = useState(0);
  const [practiceResume, setPracticeResume] = useState<PracticeResume>(() =>
    createEmptyPracticeResume(ANONYMOUS_OWNER_ID),
  );
  const [syncStatus, setSyncStatus] = useState<string>();
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
        setSyncStatus(undefined);
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
      setSyncStatus("Syncing practice position…");

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
        setSyncStatus("Practice progress synced.");
      } catch {
        if (!isCurrent) return;
        setSyncStatus("Sync failed. Local practice position is still available.");
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

  const refreshCurrentResume = useCallback(() => {
    void getPracticeResume(ownerId).then((savedResume) => {
      if (savedResume) setPracticeResume(savedResume);
    });
  }, [ownerId]);

  function keepAnonymousProgressSeparate() {
    localStorage.setItem(`anonymous-progress-decision:${ownerId}`, "separate");
    setShowAnonymousProgressPrompt(false);
    if (supabaseClient) {
      const client = supabaseClient;
      setSyncStatus("Syncing account practice progress…");
      void syncProgressWithSupabase(client, ownerId)
        .then(() => syncExamSessionsWithSupabase(client, ownerId))
        .then(() => {
          setProgressRefreshToken((token) => token + 1);
          setSyncStatus("Practice progress synced.");
        })
        .catch(() =>
          setSyncStatus(
            "Sync failed. Local account progress is still available.",
          ),
        );
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
        setSyncStatus("Syncing merged practice progress…");
        try {
          await syncProgressWithSupabase(supabaseClient, ownerId);
          await syncExamSessionsWithSupabase(supabaseClient, ownerId);
          await syncPracticeResumeWithSupabase(supabaseClient, ownerId);
          setProgressRefreshToken((token) => token + 1);
          setSyncStatus("Practice progress synced.");
        } catch {
          setSyncStatus("Sync failed. Merged progress is saved on this device.");
        }
      }
    })();
  }

  function openPractice(mode: PracticeMode = "sequential") {
    setPracticeMode(mode);
    setPage("practice");
  }

  function openExam() {
    setExamRunId((currentRunId) => currentRunId + 1);
    setPage("exam");
  }

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f1eef3] text-sm text-[#687287]">
        Loading…
      </div>
    );
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
        onPracticeClick={(mode) => openPractice(mode ?? "sequential")}
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
        onPracticeClick={(mode) => openPractice(mode ?? "sequential")}
        onExamClick={openExam}
        onNavigate={setPage}
      />
    );
  }

  if (page !== "dashboard") {
    return (
      <SecondaryPage
        ownerId={ownerId}
        route={page}
        onNavigate={setPage}
        onPracticeClick={(mode) => openPractice(mode ?? "sequential")}
        onExamClick={openExam}
      />
    );
  }

  return (
    <DashboardPage
      ownerId={ownerId}
      progressRefreshToken={progressRefreshToken}
      onNavigate={setPage}
      onPracticeClick={(mode) => openPractice(mode ?? "sequential")}
      onExamClick={openExam}
      practiceResume={practiceResume}
      syncStatus={syncStatus}
      showAnonymousProgressPrompt={showAnonymousProgressPrompt}
      onMergeAnonymousProgress={mergeAnonymousProgress}
      onKeepAnonymousProgressSeparate={keepAnonymousProgressSeparate}
      onSyncComplete={refreshCurrentResume}
    />
  );
}
