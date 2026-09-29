import { useRef, useState } from "react";
import { Bookmark, CalendarX, ClipboardList, Home, ListChecks, Menu, Moon, Sun, X } from "lucide-react";
import type { PracticeMode } from "../domain/practiceMode";
import { AuthPanel } from "./AuthPanel";
import { BrandLogo } from "./BrandLogo";
import { useTheme } from "../theme/useTheme";

export type ShellRoute = "dashboard" | "practice" | "exam";
type AppShellProps = {
  active: ShellRoute;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  hideHeader?: boolean;
  immersiveHeader?: React.ReactNode;
  immersive?: boolean;
  variant?: "default" | "studio" | "minimal";
  mobileHeader?: React.ReactNode;
  practiceMode?: PracticeMode;
  sidebarBadges?: Partial<Record<"incorrect" | "favorite", number>>;
  onNavigate?: (route: ShellRoute) => void;
  onDashboardClick?: () => void;
  onPracticeClick?: (mode?: PracticeMode) => void;
  onExamClick?: () => void;
};

export function AppShell({ active, children, headerActions, immersiveHeader, immersive = false, mobileHeader, practiceMode = "sequential", sidebarBadges, onNavigate, onDashboardClick, onPracticeClick, onExamClick }: AppShellProps) {
  const { isDark, toggleTheme } = useTheme();
  const menuRef = useRef<HTMLDialogElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { label: "Dashboard", icon: Home, selected: active === "dashboard", action: onDashboardClick ?? (() => onNavigate?.("dashboard")) },
    { label: "Question Bank", icon: ListChecks, selected: active === "practice" && practiceMode === "sequential", action: () => onPracticeClick?.("sequential") },
    { label: "Mock Exams", icon: ClipboardList, selected: active === "exam", action: onExamClick },
    { label: "Review Incorrect", icon: CalendarX, selected: active === "practice" && practiceMode === "incorrect", action: () => onPracticeClick?.("incorrect"), badge: sidebarBadges?.incorrect },
    { label: "Review Bookmarked", icon: Bookmark, selected: active === "practice" && practiceMode === "favorite", action: () => onPracticeClick?.("favorite"), badge: sidebarBadges?.favorite },
  ];
  function closeMenu() { menuRef.current?.close(); setMenuOpen(false); }
  return (
    <div className={`app-shell-root ui-product-surface ${immersive ? "app-shell-root--reader" : "app-shell-root--studio"}`}>
      <a className="skip-link" href="#app-main">Skip to main content</a>
      <header className="app-shell-header min-h-16 items-center justify-between border-b border-gray-200">
        <div className="shell-header-inner">
        <BrandLogo className="shell-logo" onClick={onDashboardClick ?? (() => onNavigate?.("dashboard"))} />
        <nav className="shell-desktop-nav" aria-label="Primary navigation">
          {links.slice(0, 3).map(({ label, selected, action }) => <button key={label} type="button" aria-current={selected ? "page" : undefined} className={`shell-nav-link ${selected ? "is-current" : ""}`} onClick={action}>{label}</button>)}
        </nav>
        <div className={`shell-account ml-auto min-w-0 items-center gap-2 ${mobileHeader ? "hidden md:flex" : ""}`}>
          {headerActions}
          <button type="button" className="ui-icon-button inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl" aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"} onClick={toggleTheme}>
            {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
          <div className="shell-auth"><AuthPanel /></div>
        </div>
        <button className="ui-icon-button shell-menu-button" type="button" aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="navigation-menu" onClick={() => { menuRef.current?.showModal(); setMenuOpen(true); }}><Menu size={20} aria-hidden="true" /></button>
        </div>
      </header>
      {mobileHeader && <div className="shell-mobile-slot">{mobileHeader}</div>}
      {immersiveHeader}
      <dialog ref={menuRef} id="navigation-menu" className="ui-dialog navigation-dialog" aria-labelledby="navigation-title" onClose={() => setMenuOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) closeMenu(); }}>
        <div className="dialog-heading"><h2 id="navigation-title">Navigation</h2><button className="ui-icon-button" type="button" aria-label="Close navigation" onClick={closeMenu}><X size={20} aria-hidden="true" /></button></div>
        <nav aria-label="Mobile navigation" className="mobile-nav-list">
          {links.map(({ label, icon: Icon, selected, action, badge }) => <button key={label} type="button" className={`mobile-nav-link ${selected ? "is-current" : ""}`} aria-current={selected ? "page" : undefined} onClick={() => { closeMenu(); action?.(); }}><Icon size={18} aria-hidden="true" /><span>{label}</span>{badge !== undefined && <span className="ui-badge">{badge}</span>}</button>)}
        </nav>
        <div className="navigation-account"><AuthPanel /></div>
      </dialog>
      <div className="app-shell-content"><main id="app-main" tabIndex={-1} className="app-shell-main">{children}</main></div>
    </div>
  );
}
