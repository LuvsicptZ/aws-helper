import { useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import { ExamPage } from "./pages/ExamPage";
import { PracticePage } from "./pages/PracticePage";
import type { PracticeMode } from "./domain/practiceMode";

export default function App() {
  const [page, setPage] = useState<"dashboard" | "practice" | "exam">("dashboard");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("sequential");

  if (page === "practice") {
    return (
      <PracticePage
        initialMode={practiceMode}
        onDashboardClick={() => setPage("dashboard")}
      />
    );
  }

  if (page === "exam") {
    return <ExamPage onDashboardClick={() => setPage("dashboard")} />;
  }

  return (
    <DashboardPage
      onPracticeClick={(mode) => {
        setPracticeMode(mode ?? "sequential");
        setPage("practice");
      }}
      onExamClick={() => setPage("exam")}
    />
  );
}
