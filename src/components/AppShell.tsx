import {
  Bookmark,
  CalendarX,
  ClipboardList,
  Home,
  ListChecks,
  Moon,
  Sun,
} from "lucide-react";
import type { PracticeMode } from "../domain/practiceMode";
import { AuthPanel } from "./AuthPanel";
import { BrandLogo } from "./BrandLogo";
import { useTheme } from "../theme/useTheme";

export type ShellRoute =
  | "dashboard"
  | "practice"
  | "exam";

type AppShellProps = {
  active: ShellRoute;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  hideHeader?: boolean;
  immersiveHeader?: React.ReactNode;
  immersive?: boolean;
  variant?: "default" | "studio";
  mobileHeader?: React.ReactNode;
  practiceMode?: PracticeMode;
  sidebarBadges?: Partial<Record<"incorrect" | "favorite", number>>;
  onNavigate?: (route: ShellRoute) => void;
  onDashboardClick?: () => void;
  onPracticeClick?: (mode?: PracticeMode) => void;
  onExamClick?: () => void;
};

type NavButtonProps = {
  active?: boolean;
  badge?: number;
  badgeTone?: "danger" | "muted";
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "studio";
};

function NavButton({
  active = false,
  badge,
  badgeTone = "muted",
  children,
  icon,
  onClick,
  variant = "default",
}: NavButtonProps) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      type="button"
      onClick={onClick}
      className={[
        "app-shell-nav-button flex min-h-10 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-medium transition-colors duration-200",
        variant === "studio" ? "app-shell-nav-button--studio" : "",
        active
          ? "bg-[#111827] text-white shadow-sm app-shell-nav-button--active"
          : "text-gray-600 hover:bg-white hover:text-gray-950",
      ].join(" ")}
    >
      <span
        className={[
          "app-shell-nav-icon mr-2 flex w-5 justify-center",
          active ? "text-white/80" : "text-gray-500",
        ].join(" ")}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {badge !== undefined ? (
        <span
          className={[
            "app-shell-nav-badge ml-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold",
            badgeTone === "danger"
              ? "app-shell-nav-badge--danger"
              : "app-shell-nav-badge--muted",
          ].join(" ")}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 px-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-gray-400">
      {children}
    </h3>
  );
}

export function AppShell({
  active,
  children,
  headerActions,
  hideHeader = false,
  immersiveHeader,
  immersive = false,
  variant = "default",
  mobileHeader,
  practiceMode = "sequential",
  sidebarBadges,
  onNavigate,
  onDashboardClick,
  onPracticeClick,
  onExamClick,
}: AppShellProps) {
  const { isDark, toggleTheme } = useTheme();
  const isQuestionBankActive =
    active === "practice" && practiceMode === "sequential";
  const isStudio = variant === "studio";

  return (
    <div
      className={[
        "app-shell-root flex h-screen overflow-hidden bg-[#f6f3ef] font-sans text-gray-900 antialiased",
        isStudio ? "app-shell-root--studio" : "",
      ].join(" ")}
    >
      {!immersive ? (
      <aside className="app-shell-sidebar hidden h-full w-64 shrink-0 flex-col border-r border-gray-200 bg-[#f6f3ef] md:flex">
        <div className="flex h-16 items-center px-6">
          <BrandLogo
            className={isStudio ? "h-12 w-auto" : "h-11 w-auto"}
            onClick={onDashboardClick ?? (() => onNavigate?.("dashboard"))}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-6">
            <div>
              <NavButton
                active={active === "dashboard"}
                icon={<Home size={16} />}
                onClick={onDashboardClick ?? (() => onNavigate?.("dashboard"))}
                variant={variant}
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
                  variant={variant}
                >
                  Question Bank
                </NavButton>
                <NavButton
                  active={active === "exam"}
                  icon={<ClipboardList size={16} />}
                  onClick={onExamClick}
                  variant={variant}
                >
                  Mock Exams
                </NavButton>
                <NavButton
                  active={active === "practice" && practiceMode === "incorrect"}
                  badge={sidebarBadges?.incorrect}
                  badgeTone="danger"
                  icon={<CalendarX size={16} />}
                  onClick={() => onPracticeClick?.("incorrect")}
                  variant={variant}
                >
                  Review Incorrect
                </NavButton>
                <NavButton
                  active={active === "practice" && practiceMode === "favorite"}
                  badge={sidebarBadges?.favorite}
                  icon={<Bookmark size={16} />}
                  onClick={() => onPracticeClick?.("favorite")}
                  variant={variant}
                >
                  Review Bookmarked
                </NavButton>
              </nav>
            </div>
          </div>
        </div>
      </aside>
      ) : null}

      <div className="app-shell-content flex h-full flex-1 flex-col overflow-hidden bg-[#fbfaf8]">
        {!hideHeader ? (
        <header className="app-shell-header z-10 flex min-h-16 items-center justify-between border-b border-gray-200 bg-[#fbfaf8]/90 px-4 py-2 backdrop-blur-sm sm:px-8">
          {immersiveHeader ? (
            <div className="w-full">{immersiveHeader}</div>
          ) : mobileHeader ? (
            <div className="w-full md:hidden">{mobileHeader}</div>
          ) : (
            <div className="flex items-center gap-3 md:hidden">
              <BrandLogo
                className="h-9 w-auto"
                onClick={onDashboardClick ?? (() => onNavigate?.("dashboard"))}
              />
            </div>
          )}

          {!immersiveHeader ? (
          <div
            className={[
              "ml-auto min-w-0 items-center gap-2",
              mobileHeader ? "hidden md:flex" : "flex",
            ].join(" ")}
          >
            {headerActions}
            <button
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1120] cursor-pointer"
              title={isDark ? "Switch to light theme" : "Switch to dark theme"}
              onClick={toggleTheme}
              type="button"
            >
              {isDark ? (
                <Sun aria-hidden="true" size={17} />
              ) : (
                <Moon aria-hidden="true" size={17} />
              )}
            </button>
            {!headerActions ? <AuthPanel /> : null}
          </div>
          ) : null}
        </header>
        ) : null}

        <main
          className={[
            "app-shell-main flex-1 overflow-y-auto",
            immersive ? "p-0" : "p-4 sm:p-8",
          ].join(" ")}
        >
          <div className={immersive ? "mx-auto w-full" : "mx-auto max-w-[1200px]"}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
