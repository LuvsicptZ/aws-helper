import {
  Bookmark,
  CalendarX,
  ChartLine,
  CircleHelp,
  ClipboardList,
  Clock,
  FileQuestion,
  Home,
  Layers,
  ListChecks,
  PenLine,
  Sun,
} from "lucide-react";
import type { PracticeMode } from "../domain/practiceMode";
import { AuthPanel } from "./AuthPanel";
import { BrandLogo } from "./BrandLogo";

export type ShellRoute =
  | "dashboard"
  | "practice"
  | "exam"
  | "topics"
  | "notes"
  | "flashcards"
  | "analytics"
  | "history"
  | "focus";

type AppShellProps = {
  active: ShellRoute;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  mobileHeader?: React.ReactNode;
  practiceMode?: PracticeMode;
  onNavigate?: (route: ShellRoute) => void;
  onDashboardClick?: () => void;
  onPracticeClick?: (mode?: PracticeMode) => void;
  onExamClick?: () => void;
};

type NavButtonProps = {
  active?: boolean;
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick?: () => void;
};

function NavButton({ active = false, children, icon, onClick }: NavButtonProps) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      type="button"
      onClick={onClick}
      className={[
        "flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition-colors",
        active
          ? "bg-gray-200 text-gray-900"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
      ].join(" ")}
    >
      <span className="mr-2 flex w-5 justify-center text-gray-500">{icon}</span>
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
      {children}
    </h3>
  );
}

export function AppShell({
  active,
  children,
  headerActions,
  mobileHeader,
  practiceMode = "sequential",
  onNavigate,
  onDashboardClick,
  onPracticeClick,
  onExamClick,
}: AppShellProps) {
  const isQuestionBankActive =
    active === "practice" &&
    (practiceMode === "sequential" || practiceMode === "random");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans text-gray-900 antialiased">
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-gray-200 bg-gray-50 md:flex">
        <div className="flex h-16 items-center px-6">
          <BrandLogo className="h-11 w-auto" />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-6">
            <div>
              <NavButton
                active={active === "dashboard"}
                icon={<Home size={16} />}
                onClick={onDashboardClick ?? (() => onNavigate?.("dashboard"))}
              >
                Dashboard
              </NavButton>
            </div>

            <div>
              <SectionLabel>Practice</SectionLabel>
              <nav className="space-y-1">
                <NavButton
                  active={isQuestionBankActive}
                  icon={<ListChecks size={16} />}
                  onClick={() => onPracticeClick?.("sequential")}
                >
                  Question Bank
                </NavButton>
                <NavButton
                  active={active === "exam"}
                  icon={<ClipboardList size={16} />}
                  onClick={onExamClick}
                >
                  Mock Exams
                </NavButton>
                <NavButton
                  active={active === "practice" && practiceMode === "incorrect"}
                  icon={<CalendarX size={16} />}
                  onClick={() => onPracticeClick?.("incorrect")}
                >
                  Review Incorrect
                </NavButton>
                <NavButton
                  active={active === "practice" && practiceMode === "guessed"}
                  icon={<CircleHelp size={16} />}
                  onClick={() => onPracticeClick?.("guessed")}
                >
                  Review Guessed
                </NavButton>
                <NavButton
                  active={active === "practice" && practiceMode === "favorite"}
                  icon={<Bookmark size={16} />}
                  onClick={() => onPracticeClick?.("favorite")}
                >
                  Review Bookmarked
                </NavButton>
              </nav>
            </div>

            <div>
              <SectionLabel>Study</SectionLabel>
              <nav className="space-y-1">
                <NavButton
                  active={active === "topics"}
                  icon={<Layers size={16} />}
                  onClick={() => onNavigate?.("topics")}
                >
                  Topics
                </NavButton>
                <NavButton
                  active={active === "notes"}
                  icon={<PenLine size={16} />}
                  onClick={() => onNavigate?.("notes")}
                >
                  My Notes
                </NavButton>
                <NavButton
                  active={active === "flashcards"}
                  icon={<FileQuestion size={16} />}
                  onClick={() => onNavigate?.("flashcards")}
                >
                  Flashcards
                </NavButton>
              </nav>
            </div>

            <div>
              <SectionLabel>Progress</SectionLabel>
              <nav className="space-y-1">
                <NavButton
                  active={active === "analytics"}
                  icon={<ChartLine size={16} />}
                  onClick={() => onNavigate?.("analytics")}
                >
                  Analytics
                </NavButton>
                <NavButton
                  active={active === "history"}
                  icon={<Clock size={16} />}
                  onClick={() => onNavigate?.("history")}
                >
                  Study History
                </NavButton>
              </nav>
            </div>
          </div>
        </div>

      </aside>

      <div className="flex h-full flex-1 flex-col overflow-hidden bg-white">
        <header className="z-10 flex min-h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-4 py-2 backdrop-blur-sm sm:px-8">
          {mobileHeader ? (
            <div className="w-full md:hidden">{mobileHeader}</div>
          ) : (
            <div className="flex items-center gap-3 md:hidden">
              <BrandLogo className="h-9 w-auto" />
            </div>
          )}

          <div
            className={[
              "ml-auto min-w-0 items-center gap-2",
              mobileHeader ? "hidden md:flex" : "flex",
            ].join(" ")}
          >
            {headerActions}
            <button
              aria-label="Toggle theme"
              className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120]"
              title="Toggle theme"
              type="button"
            >
              <Sun aria-hidden="true" size={17} />
            </button>
            {!headerActions ? <AuthPanel /> : null}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
