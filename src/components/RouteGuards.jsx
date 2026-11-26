import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { audit } from "../lib/audit";
import { can } from "../lib/rbac";
import { Logo } from "./ui";
import ForbiddenPage from "../pages/ForbiddenPage";
import PendingRolePage from "../pages/PendingRolePage";

export function SplashScreen({ message = "Securing your session…" }) {
  return (
    <div className="splash">
      <Logo />
      <div className="splash-bar"><span /></div>
      <p>{message}</p>
    </div>
  );
}

/** Requires a signed-in user with an assigned role. */
export function RequireAuth() {
  const { status, role } = useAuth();
  const location = useLocation();
  if (status === "loading") return <SplashScreen />;
  if (status === "signedOut") return <Navigate to="/login" replace state={{ from: location }} />;
  if (!role) return <PendingRolePage />;
  return <Outlet />;
}

/** Only for signed-out visitors (login, password recovery). */
export function PublicOnly() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <SplashScreen />;
  if (status === "signedIn") {
    const target = location.state?.from?.pathname ?? "/";
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
}

/**
 * Route-level RBAC. Denied attempts are written to the audit trail — useful
 * evidence that someone tried to reach a page outside their role.
 */
export function RequirePermission({ permission }) {
  const { role } = useAuth();
  const location = useLocation();
  const allowed = can(role, permission);

  useEffect(() => {
    if (!allowed) {
      audit("ACCESS_DENIED", "AUTH", `Blocked ${role ?? "unknown"} from ${location.pathname} (needs ${permission})`);
    }
  }, [allowed, role, permission, location.pathname]);

  return allowed ? <Outlet /> : <ForbiddenPage permission={permission} />;
}
