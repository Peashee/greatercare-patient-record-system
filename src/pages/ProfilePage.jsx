import { useState } from "react";
import { updatePassword } from "aws-amplify/auth";
import { Clock, KeyRound, Loader2, LogOut, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useFeedback } from "../context/FeedbackContext";
import { audit } from "../lib/audit";
import { ageFrom, formatDate, formatDateTime } from "../lib/format";
import { ROLES } from "../lib/rbac";
import { Avatar, Card, RoleBadge } from "../components/ui";
import { PasswordInput, PasswordStrength } from "../components/ui/PasswordField";
import { passwordIsValid } from "../lib/password";
import { describeAuthError } from "./auth/authErrors";

function ChangePassword() {
  const { notify } = useFeedback();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!passwordIsValid(next)) return setError("The new password doesn't meet all requirements.");
    if (next !== confirmValue) return setError("The new passwords don't match.");
    setBusy(true);
    setError("");
    try {
      await updatePassword({ oldPassword: current, newPassword: next });
      await audit("PASSWORD_CHANGED", "AUTH", "Changed account password");
      setCurrent("");
      setNext("");
      setConfirmValue("");
      notify("Your password has been updated.", { title: "Password changed" });
    } catch (updateError) {
      setError(describeAuthError(updateError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack-sm" onSubmit={submit} noValidate>
      <label className="field"><span className="field-label">Current password</span><PasswordInput value={current} onChange={setCurrent} /></label>
      <label className="field"><span className="field-label">New password</span><PasswordInput value={next} onChange={setNext} autoComplete="new-password" placeholder="Create a strong password" /></label>
      {next && <PasswordStrength value={next} />}
      <label className="field"><span className="field-label">Confirm new password</span><PasswordInput value={confirmValue} onChange={setConfirmValue} autoComplete="new-password" placeholder="Re-enter new password" /></label>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div>
        <button className="btn btn-primary" type="submit" disabled={busy || !current || !next}>
          {busy ? <Loader2 size={16} className="spin" /> : <KeyRound size={16} />} Update password
        </button>
      </div>
    </form>
  );
}

export default function ProfilePage() {
  const { user, profile, role, displayName, signOut } = useAuth();
  const age = ageFrom(profile?.dateOfBirth);

  const details =
    role === "DOCTORS"
      ? [["Specialty", profile?.specialty], ["Department", profile?.department], ["Licence number", profile?.licenseNumber], ["Phone", profile?.phone]]
      : role === "PATIENTS"
        ? [
            ["Date of birth", profile?.dateOfBirth && `${formatDate(profile.dateOfBirth)}${age !== null ? ` (${age})` : ""}`],
            ["Gender", profile?.gender],
            ["Blood group", profile?.bloodGroup],
            ["Allergies", profile?.allergies],
            ["Phone", profile?.phone],
            ["Address", profile?.address],
            ["Emergency contact", profile?.emergencyContact],
          ]
        : [["Phone", profile?.phone]];

  return (
    <>
      <section className="profile-hero card">
        <Avatar name={displayName} email={user?.email} size="xl" />
        <div className="profile-hero-text">
          <h1>{role === "DOCTORS" ? `Dr. ${displayName}` : displayName}</h1>
          <p>{user?.email}</p>
          <div className="chip-row"><RoleBadge role={role} /></div>
        </div>
      </section>
      <div className="split-layout">
        <div className="stack">
          <Card title="Personal details" eyebrow="Profile">
            <dl className="detail-list">
              {details.map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>
              ))}
            </dl>
            <p className="muted small">Details are managed by your administrator. Contact them if anything needs correcting.</p>
          </Card>
          <Card title="Change password" eyebrow="Security">
            <ChangePassword />
          </Card>
        </div>
        <aside className="stack">
          <Card title="Session" eyebrow="Security">
            <dl className="detail-list">
              <div><dt><ShieldCheck size={13} /> Role</dt><dd>{ROLES[role]?.label}</dd></div>
              <div><dt><Clock size={13} /> Signed in</dt><dd>{formatDateTime(user?.authTime?.toISOString())}</dd></div>
              <div><dt><KeyRound size={13} /> Token expires</dt><dd>{formatDateTime(user?.expiresAt?.toISOString())}</dd></div>
              <div><dt>User ID</dt><dd className="mono small">{user?.sub}</dd></div>
            </dl>
            <p className="muted small">Tokens refresh automatically. You'll be signed out after 15 minutes without activity.</p>
          </Card>
          <Card title="Sign out" eyebrow="Devices">
            <div className="stack-sm">
              <button className="btn btn-secondary btn-block" onClick={() => signOut()}><LogOut size={16} /> Sign out of this device</button>
              <button className="btn btn-danger-ghost btn-block" onClick={() => signOut({ global: true, reason: "Signed out of all devices" })}>
                <MonitorSmartphone size={16} /> Sign out everywhere
              </button>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
