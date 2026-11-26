import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useMatches } from "react-router";
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileHeart,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  ShieldCheck,
  Sun,
  UserCircle2,
  Users,
  UsersRound,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useIdleTimeout } from "../../hooks/useIdleTimeout";
import { useTheme } from "../../hooks/useTheme";
import { can, ROLES } from "../../lib/rbac";
import { Avatar, Logo, RoleBadge } from "../ui";
import Modal from "../ui/Modal";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const IDLE_WARNING_MS = 60 * 1000;

const NAVIGATION = [
  {
    section: "Care",
    items: [
      { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/appointments", label: "Appointments", icon: CalendarDays },
      { to: "/records", label: "Medical records", patientLabel: "My records", icon: FileHeart },
      { to: "/patients", label: "Patients", icon: UsersRound, permission: "patients:directory" },
    ],
  },
  {
    section: "Administration",
    items: [
      { to: "/admin/users", label: "People & roles", icon: Users, permission: "users:manage" },
      { to: "/admin/audit", label: "Audit trail", icon: ScrollText, permission: "audit:read" },
    ],
  },
  {
    section: "Account",
    items: [
      { to: "/access", label: "Access control", icon: ShieldCheck },
      { to: "/profile", label: "My profile", icon: UserCircle2 },
    ],
  },
];

function Sidebar({ open, onNavigate }) {
  const { role, displayName, user, signOut } = useAuth();
  const sections = NAVIGATION.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.permission || can(role, item.permission)),
  })).filter((section) => section.items.length);

  return (
    <aside className={`sidebar${open ? " sidebar-open" : ""}`}>
      <Link to="/" className="sidebar-brand" onClick={onNavigate}>
        <Logo />
      </Link>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {sections.map((section) => (
          <div className="nav-section" key={section.section}>
            <div className="nav-heading">{section.section}</div>
            {section.items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="nav-link" onClick={onNavigate}>
                <item.icon size={18} />
                <span>{role === "PATIENTS" && item.patientLabel ? item.patientLabel : item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="role-card">
          <ShieldCheck size={16} />
          <div>
            <strong>{ROLES[role]?.label} access</strong>
            <small>Permissions enforced by AWS AppSync, S3 and Cognito.</small>
          </div>
        </div>
        <div className="sidebar-user">
          <Avatar name={displayName} email={user?.email} />
          <div className="sidebar-user-info">
            <strong>{displayName}</strong>
            <small>{user?.email}</small>
          </div>
          <button className="icon-button ghost" onClick={() => signOut()} aria-label="Sign out" title="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Breadcrumbs() {
  const matches = useMatches().filter((match) => match.handle?.crumb);
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <span>GreaterCare</span>
      {matches.map((match, index) => (
        <span key={match.id} className="crumb">
          <ChevronRight size={14} />
          {index === matches.length - 1 ? (
            <span aria-current="page">{match.handle.crumb}</span>
          ) : (
            <Link to={match.pathname}>{match.handle.crumb}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}

export default function AppLayout() {
  const { role, signOut, user, displayName } = useAuth();
  const { notify } = useFeedback();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const handleTimeout = useCallback(async () => {
    await signOut({ reason: "Signed out automatically after 15 minutes of inactivity" });
    notify("You were signed out after 15 minutes of inactivity.", { tone: "info", title: "Session ended" });
  }, [signOut, notify]);

  const { secondsLeft, stayActive } = useIdleTimeout({
    timeoutMs: IDLE_TIMEOUT_MS,
    warningMs: IDLE_WARNING_MS,
    onTimeout: handleTimeout,
  });

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      {menuOpen && <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} />}
      <div className="app-main">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <Breadcrumbs />
          <div className="topbar-right">
            <span className="secure-pill">
              <span className="pulse-dot" /> Encrypted session
            </span>
            <button className="icon-button" onClick={toggleTheme} aria-label="Toggle colour theme" title="Toggle theme">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link to="/profile" className="topbar-user">
              <Avatar name={displayName} email={user?.email} size="sm" />
              <RoleBadge role={role} />
            </Link>
          </div>
        </header>
        <main className="page" id="main">
          <Outlet />
        </main>
        <footer className="app-footer">
          <ClipboardList size={14} /> GreaterCare · Secure patient record system on AWS Amplify
        </footer>
      </div>

      {secondsLeft !== null && (
        <Modal title="Are you still there?" onClose={stayActive} size="sm">
          <p className="modal-text">
            For your patients' privacy, you will be signed out in <strong>{secondsLeft}s</strong> due to inactivity.
          </p>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => signOut()}>Sign out now</button>
            <button className="btn btn-primary" onClick={stayActive}>Stay signed in</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
