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
  hasProgress,
} from "./db/progressRepository";
import { useAuth } from "./auth/authContext";
import { supabaseClient } from "./auth/supabaseClient";
import {
  mergeAnonymousPracticeDataWithSupabase,
  resetPracticeData,
  syncPracticeResumeData,
  syncQuestionProgress,
} from "./sync/supabasePracticeCoordinator";
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

function readRouteFromLocation(): {
  page: ShellRoute;
  practiceMode: PracticeMode;
} {
  if (typeof window === "undefined") {
    return { page: "dashboard", practiceMode: "sequential" };
  }

  const practiceMode = normalizePracticeMode(
    new URLSearchParams(window.location.search).get("mode") as
      | PracticeMode
      | undefined,
  );

  if (window.location.pathname === "/practice") {
    return { page: "practice", practiceMode };
  }

  if (window.location.pathname === "/exam") {
    return { page: "exam", practiceMode };
  }

  return { page: "dashboard", practiceMode };
}

function replaceRouteInLocation(
  page: ShellRoute,
  practiceMode: PracticeMode = "sequential",
) {
  if (typeof window === "undefined") return;

  const path =
    page === "practice"
      ? `/practice?mode=${practiceMode}`
      : page === "exam"
        ? "/exam"
        : "/";
  window.history.replaceState(null, "", path);
}

export default function App() {
  const {
    session,
    isLoading: isAuthLoading,
    isPasswordRecovery,
  } = useAuth();
  const [page, setPage] = useState<ShellRoute>(
    () => readRouteFromLocation().page,
  );
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(
    () => readRouteFromLocation().practiceMode,
  );
  const [examRunId, setExamRunId] = useState(0);
  const [practiceResume, setPracticeResume] = useState<PracticeResume>(() =>
    createEmptyPracticeResume(ANONYMOUS_OWNER_ID),
  );
  const [showAnonymousProgressPrompt, setShowAnonymousProgressPrompt] =
    useState(false);
  const [progressRefreshToken, setProgressRefreshToken] = useState(0);
  const ownerId = session?.user.id ?? ANONYMOUS_OWNER_ID;

  const refreshPracticeResume = useCallback(async () => {
    const savedResume =
      (await getPracticeResume(ownerId)) ?? createEmptyPracticeResume(ownerId);
    setPracticeResume(savedResume);
    setProgressRefreshToken((token) => token + 1);
    return savedResume;
  }, [ownerId]);

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
        const syncedResume = await syncPracticeResumeData(supabaseClient, ownerId);
        if (!isCurrent) return;
        setPracticeResume(syncedResume);
        if (!hasAnonymous || previousDecision !== null) {
          await syncQuestionProgress(supabaseClient, ownerId);
          await syncExamSessionsWithSupabase(supabaseClient, ownerId);
          setProgressRefreshToken((token) => token + 1);
        }
      } catch {
        if (!isCurrent) return;
        const currentResume =
          (await getPracticeResume(ownerId)) ??
          createEmptyPracticeResume(ownerId);
        if (!isCurrent) return;
        setPracticeResume(currentResume);
        setProgressRefreshToken((token) => token + 1);
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
        void savePracticeResume(
          nextResume,
          nextResume.resetGeneration,
        ).catch(() => {
          void refreshPracticeResume();
        });
        return nextResume;
      });
    },
    [refreshPracticeResume],
  );

  function keepAnonymousProgressSeparate() {
    localStorage.setItem(`anonymous-progress-decision:${ownerId}`, "separate");
    setShowAnonymousProgressPrompt(false);
    if (supabaseClient) {
      const client = supabaseClient;
      void syncQuestionProgress(client, ownerId)
        .then(() => syncExamSessionsWithSupabase(client, ownerId))
        .then(() => {
          setProgressRefreshToken((token) => token + 1);
        })
        .catch(() => undefined);
    }
  }

  function mergeAnonymousProgress() {
    void (async () => {
      if (!supabaseClient) return;

      try {
        const { resume } = await mergeAnonymousPracticeDataWithSupabase(
          supabaseClient,
          ownerId,
        );
        await copyExamSessions(ANONYMOUS_OWNER_ID, ownerId);
        await clearAllExamSessions(ANONYMOUS_OWNER_ID);
        await syncExamSessionsWithSupabase(supabaseClient, ownerId);
        localStorage.setItem(
          `anonymous-progress-decision:${ownerId}`,
          "merged",
        );
        setPracticeResume(resume);
        setShowAnonymousProgressPrompt(false);
        setProgressRefreshToken((token) => token + 1);
      } catch {
        await refreshPracticeResume();
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
        void savePracticeResume(
          nextResume,
          nextResume.resetGeneration,
        ).catch(() => {
          void refreshPracticeResume();
        });
        return nextResume;
      });
    }
    replaceRouteInLocation("practice", nextMode);
    setPage("practice");
  }

  function openExam() {
    setExamRunId((currentRunId) => currentRunId + 1);
    replaceRouteInLocation("exam");
    setPage("exam");
  }

  function navigate(page: ShellRoute) {
    replaceRouteInLocation(page, practiceMode);
    setPage(page);
  }

  const handleResetProgress = useCallback(async () => {
    if (
      !window.confirm(
        "Are you sure you want to reset all your practice progress? This cannot be undone.",
      )
    ) {
      return;
    }

    let freshResume = createEmptyPracticeResume(ownerId);

    try {
      if (session && supabaseClient) {
        await resetPracticeData(supabaseClient, ownerId);
        freshResume =
          (await getPracticeResume(ownerId)) ??
          createEmptyPracticeResume(ownerId);
      } else {
        await clearAllProgress(ownerId);
        await deletePracticeResume(ownerId);
        await savePracticeResume(freshResume);
      }
    } catch (error) {
      console.error("Reset progress failed on remote server:", error);
      try {
        await clearAllProgress(ownerId);
        await deletePracticeResume(ownerId);
        await savePracticeResume(freshResume);
      } catch (fallbackError) {
        console.error("Local fallback reset failed:", fallbackError);
        window.alert(
          "Reset failed. Your progress was not changed. Please try again.",
        );
        return;
      }
    }

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
        progressRefreshToken={progressRefreshToken}
        initialMode={practiceMode}
        resumePositions={practiceResume.positions}
        onPositionChange={savePosition}
        onDashboardClick={() => navigate("dashboard")}
        onExamClick={openExam}
        onPracticeClick={(mode, idx) => openPractice(mode ?? "sequential", idx)}
        onNavigate={navigate}
      />
    );
  }

  if (page === "exam") {
    return (
      <ExamPage
        key={examRunId}
        ownerId={ownerId}
        onDashboardClick={() => navigate("dashboard")}
        onPracticeClick={(mode, idx) => openPractice(mode ?? "sequential", idx)}
        onExamClick={openExam}
        onNavigate={navigate}
      />
    );
  }

  return (
    <DashboardPage
      ownerId={ownerId}
      progressRefreshToken={progressRefreshToken}
      onNavigate={navigate}
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
