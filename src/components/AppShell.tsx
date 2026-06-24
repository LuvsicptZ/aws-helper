import {
  Bookmark,
  CalendarX,
  ChartLine,
  CircleHelp,
  ClipboardList,
  Clock,
  Crosshair,
  FileQuestion,
  HelpCircle,
  Home,
  Layers,
  ListChecks,
  LogIn,
  Moon,
  PenLine,
  Settings,
  Sun,
} from "lucide-react";
import type { PracticeMode } from "../domain/practiceMode";
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
  onNavigate,
  onDashboardClick,
  onPracticeClick,
  onExamClick,
}: AppShellProps) {
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
                  active={active === "practice"}
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
                  icon={<CalendarX size={16} />}
                  onClick={() => onPracticeClick?.("incorrect")}
                >
                  Review Incorrect
                </NavButton>
                <NavButton
                  icon={<CircleHelp size={16} />}
                  onClick={() => onPracticeClick?.("guessed")}
                >
                  Review Guessed
                </NavButton>
                <NavButton
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

        <div className="space-y-4 p-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center">
              <Crosshair size={16} className="mr-2 text-orange-500" />
              <span className="text-sm font-semibold text-gray-900">Focus Mode</span>
            </div>
            <p className="mb-3 text-xs text-gray-600">
              Jump into a focused practice flow.
            </p>
            <button
              type="button"
              onClick={() => onNavigate?.("focus")}
              className="w-full rounded-lg bg-[#0B1120] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              Start Focus Session
            </button>
          </div>

          <div className="flex justify-around pb-2 text-gray-400">
            <button className="hover:text-gray-600" type="button">
              <Moon size={16} />
            </button>
            <button className="hover:text-gray-600" type="button">
              <Settings size={16} />
            </button>
            <button className="hover:text-gray-600" type="button">
              <HelpCircle size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex h-full flex-1 flex-col overflow-hidden rounded-tl-none border-l border-gray-200 bg-white shadow-[-4px_0_24px_-4px_rgba(0,0,0,0.05)] md:rounded-tl-3xl">
        <header className="z-10 flex min-h-16 items-start justify-between border-b border-gray-100 bg-white/90 px-4 py-2 backdrop-blur-sm sm:px-8">
          <div className="flex items-center gap-3 md:hidden">
            <BrandLogo className="h-9 w-auto" />
          </div>

          <div className="ml-auto flex min-w-0 items-start gap-2">
            {headerActions}
            <button
              aria-label="Toggle theme"
              className="mt-1 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120]"
              title="Toggle theme"
              type="button"
            >
              <Sun aria-hidden="true" size={17} />
            </button>
            {!headerActions ? (
              <button className="inline-flex min-h-10 items-center rounded-lg bg-[#0B1120] px-4 text-sm font-medium text-white transition-colors hover:bg-gray-800">
                <LogIn size={15} className="mr-2" />
                Sign in
              </button>
            ) : null}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
