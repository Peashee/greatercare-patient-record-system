import { Hourglass, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/ui";

export default function PendingRolePage() {
  const { user, signOut } = useAuth();
  return (
    <div className="splash">
      <Logo />
      <div className="status-page status-page-card">
        <span className="status-code"><Hourglass size={28} /></span>
        <h1>Your account is almost ready</h1>
        <p>
          You're signed in as <strong>{user?.email}</strong>, but no role has been assigned yet. An administrator needs to
          grant you Administrator, Doctor or Patient access before you can continue.
        </p>
        <button className="btn btn-secondary" onClick={() => signOut()}>
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}
