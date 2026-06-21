import { useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import { PracticePage } from "./pages/PracticePage";

export default function App() {
  const [page, setPage] = useState<"dashboard" | "practice">("dashboard");

  if (page === "practice") {
    return <PracticePage onDashboardClick={() => setPage("dashboard")} />;
  }

  return <DashboardPage onPracticeClick={() => setPage("practice")} />;
}
