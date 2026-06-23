import { useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import { ExamPage } from "./pages/ExamPage";
import { PracticePage } from "./pages/PracticePage";
import { SecondaryPage } from "./pages/SecondaryPage";
import type { PracticeMode } from "./domain/practiceMode";
import type { ShellRoute } from "./components/AppShell";

export default function App() {
  const [page, setPage] = useState<ShellRoute>("dashboard");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("sequential");
  const [examRunId, setExamRunId] = useState(0);

  function openPractice(mode: PracticeMode = "sequential") {
    setPracticeMode(mode);
    setPage("practice");
  }

  function openExam() {
    setExamRunId((currentRunId) => currentRunId + 1);
    setPage("exam");
  }

  if (page === "practice") {
    return (
      <PracticePage
        key={practiceMode}
        initialMode={practiceMode}
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
        route={page}
        onNavigate={setPage}
        onPracticeClick={(mode) => openPractice(mode ?? "sequential")}
        onExamClick={openExam}
      />
    );
  }

  return (
    <DashboardPage
      onNavigate={setPage}
      onPracticeClick={(mode) => openPractice(mode ?? "sequential")}
      onExamClick={openExam}
    />
  );
}
