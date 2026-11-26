import { Link } from "react-router";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROLES, PERMISSIONS } from "../lib/rbac";

export default function ForbiddenPage({ permission }) {
  const { role } = useAuth();
  const rule = PERMISSIONS.find((item) => item.key === permission);
  return (
    <div className="status-page">
      <span className="status-code status-code-danger"><ShieldAlert size={30} /></span>
      <div className="eyebrow">403 · Access restricted</div>
      <h1>This area isn't part of your role</h1>
      <p>
        Your <strong>{ROLES[role]?.label ?? "current"}</strong> account doesn't include the{" "}
        <strong>{rule?.label?.toLowerCase() ?? permission}</strong> permission. This attempt has been recorded in the audit trail.
      </p>
      {rule && (
        <p className="status-detail">
          Allowed roles: {rule.roles.map((item) => ROLES[item].label).join(", ")}
        </p>
      )}
      <div className="status-actions">
        <Link className="btn btn-primary" to="/">Back to overview</Link>
        <Link className="btn btn-secondary" to="/access">View my permissions</Link>
      </div>
    </div>
  );
}
