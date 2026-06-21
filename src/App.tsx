import { useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import { ExamPage } from "./pages/ExamPage";
import { PracticePage } from "./pages/PracticePage";

export default function App() {
  const [page, setPage] = useState<"dashboard" | "practice" | "exam">("dashboard");

  if (page === "practice") {
    return <PracticePage onDashboardClick={() => setPage("dashboard")} />;
  }

  if (page === "exam") {
    return <ExamPage onDashboardClick={() => setPage("dashboard")} />;
  }

  return (
    <DashboardPage
      onPracticeClick={() => setPage("practice")}
      onExamClick={() => setPage("exam")}
    />
  );
}
