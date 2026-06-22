import {
  BarChart3,
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

type AppShellProps = {
  active: "dashboard" | "practice" | "exam";
  children: React.ReactNode;
  headerActions?: React.ReactNode;
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
  onDashboardClick,
  onPracticeClick,
  onExamClick,
}: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans text-gray-900 antialiased">
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-gray-200 bg-gray-50 md:flex">
        <div className="flex h-16 items-center px-6">
          <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-md bg-[#0B1120] text-white">
            <BarChart3 size={14} />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight text-gray-900">
              AWS SAA-C03
            </h1>
            <p className="text-xs text-gray-500">Practice</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-6">
            <div>
              <NavButton
                active={active === "dashboard"}
                icon={<Home size={16} />}
                onClick={onDashboardClick}
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
                <NavButton icon={<Layers size={16} />}>Topics</NavButton>
                <NavButton icon={<PenLine size={16} />}>My Notes</NavButton>
                <NavButton icon={<FileQuestion size={16} />}>Flashcards</NavButton>
              </nav>
            </div>

            <div>
              <SectionLabel>Progress</SectionLabel>
              <nav className="space-y-1">
                <NavButton icon={<ChartLine size={16} />}>Analytics</NavButton>
                <NavButton icon={<Clock size={16} />}>Study History</NavButton>
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
            <p className="mb-2 text-xs text-gray-500">25-min session</p>
            <p className="mb-3 text-xs text-gray-600">
              Eliminate distractions and focus.
            </p>
            <button className="w-full rounded-lg bg-[#0B1120] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800">
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
        <header className="z-10 flex min-h-16 items-center justify-between border-b border-transparent bg-white/80 px-4 backdrop-blur-sm sm:px-8">
          <div className="flex items-center gap-3 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0B1120] text-white">
              <BarChart3 size={14} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">AWS SAA-C03</p>
              <p className="text-xs text-gray-500">Practice</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {headerActions}
            <button className="text-gray-400 hover:text-gray-600" type="button">
              <Sun size={16} />
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
