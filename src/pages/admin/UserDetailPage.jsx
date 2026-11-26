import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Ban, Loader2, MailPlus, RotateCcw, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useAuditLog, useDirectoryUsers, useProfiles } from "../../hooks/useCareData";
import { formatDateTime, fullName, relativeTime } from "../../lib/format";
import { ROLES } from "../../lib/rbac";
import { accountState, mergeDirectory, removeUser, resendInvitation, saveUser, setUserEnabled } from "../../lib/userAdmin";
import { Avatar, Card, EmptyState, RoleBadge, SkeletonRows, StatusBadge } from "../../components/ui";
import { IdentityFields, RoleFields } from "./ProfileFields";
import { EMPTY_PERSON } from "../../lib/profileOptions";

export default function UserDetailPage() {
  const { email: rawEmail } = useParams();
  const email = decodeURIComponent(rawEmail ?? "").toLowerCase();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify, confirm } = useFeedback();
  const directory = useDirectoryUsers();
  const profiles = useProfiles();
  const auditLog = useAuditLog();
  const [values, setValues] = useState(null);
  const [busy, setBusy] = useState("");

  const person = useMemo(
    () => mergeDirectory(directory.data ?? [], profiles.data ?? []).find((item) => item.email === email),
    [directory.data, profiles.data, email]
  );

  useEffect(() => {
    if (person && !values) {
      const initial = { ...EMPTY_PERSON };
      for (const key of Object.keys(EMPTY_PERSON)) initial[key] = person[key] ?? "";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValues(initial);
    }
  }, [person, values]);

  const isSelf = email === user?.email;
  const state = accountState(person?.account);
  const history = (auditLog.data ?? []).filter((entry) => entry.targetId === email).slice(0, 8);

  function refresh() {
    directory.reload();
    profiles.reload();
    auditLog.reload();
  }

  async function run(label, action, success) {
    setBusy(label);
    try {
      await action();
      notify(success);
      refresh();
      return true;
    } catch (error) {
      notify(error.message, { tone: "error", title: "Action failed" });
      return false;
    } finally {
      setBusy("");
    }
  }

  async function submit(event) {
    event.preventDefault();
    const roleChanged = person.role && values.role !== person.role;
    if (roleChanged) {
      const ok = await confirm({
        title: "Change role?",
        message: `${fullName(values)} will move from ${ROLES[person.role].label} to ${ROLES[values.role].label}. Their active sessions will be revoked so the new permissions apply immediately.`,
        confirmLabel: "Change role",
        tone: "primary",
      });
      if (!ok) return;
    }
    await run("save", () => saveUser(values, { previousRole: person.role }), "Changes saved.");
  }

  async function toggleEnabled() {
    const enabling = person.account?.enabled === false;
    if (!enabling) {
      const ok = await confirm({
        title: "Deactivate account?",
        message: `${fullName(person)} will be signed out everywhere and won't be able to sign in until reactivated. Their records are kept.`,
        confirmLabel: "Deactivate",
      });
      if (!ok) return;
    }
    await run("enable", () => setUserEnabled(email, enabling), enabling ? "Account reactivated." : "Account deactivated.");
  }

  async function deleteAccount() {
    const ok = await confirm({
      title: "Delete this account permanently?",
      message: `The login for ${email} will be removed from Amazon Cognito. Clinical records are retained. This cannot be undone.`,
      confirmLabel: "Delete account",
    });
    if (!ok) return;
    const done = await run("delete", () => removeUser(email), "Account deleted.");
    if (done) navigate("/admin/users");
  }

  if (directory.loading || profiles.loading) return <Card><SkeletonRows rows={6} /></Card>;
  if (!person || !values) {
    return (
      <EmptyState title="User not found" action={<Link className="btn btn-primary" to="/admin/users">Back to people</Link>}>
        No account exists for {email}.
      </EmptyState>
    );
  }

  return (
    <>
      <Link to="/admin/users" className="back-link"><ArrowLeft size={16} /> People & roles</Link>
      <section className="profile-hero card">
        <Avatar name={fullName(person)} email={email} size="xl" />
        <div className="profile-hero-text">
          <h1>{fullName(person)} {isSelf && <span className="you-tag">You</span>}</h1>
          <p>{email}</p>
          <div className="chip-row">
            <RoleBadge role={person.role} />
            <StatusBadge status={state.key} label={state.label} />
          </div>
        </div>
        <div className="profile-hero-actions">
          {state.key === "INVITED" && (
            <button className="btn btn-secondary" disabled={!!busy} onClick={() => run("resend", () => resendInvitation(email), "Invitation re-sent with a fresh temporary password.")}>
              <MailPlus size={16} /> Resend invitation
            </button>
          )}
          {person.account && !isSelf && (
            <button className="btn btn-secondary" disabled={!!busy} onClick={toggleEnabled}>
              {person.account.enabled === false ? <RotateCcw size={16} /> : <Ban size={16} />}
              {person.account.enabled === false ? "Reactivate" : "Deactivate"}
            </button>
          )}
        </div>
      </section>

      <div className="split-layout">
        <form className="stack" onSubmit={submit}>
          <Card title="Identity" eyebrow="Profile">
            <IdentityFields values={values} onChange={setValues} emailLocked />
          </Card>
          <Card title="Role assignment" eyebrow="Access control">
            <div className="role-select-row">
              {Object.entries(ROLES).map(([key, meta]) => (
                <label key={key} className={`role-chip tone-${meta.tone}${values.role === key ? " selected" : ""}${isSelf ? " disabled" : ""}`}>
                  <input type="radio" name="role" checked={values.role === key} disabled={isSelf} onChange={() => setValues({ ...values, role: key })} />
                  {meta.label}
                </label>
              ))}
            </div>
            {isSelf && <small className="field-hint">You can't change your own role — ask another administrator.</small>}
          </Card>
          <Card title={values.role === "DOCTORS" ? "Clinical details" : values.role === "PATIENTS" ? "Patient details" : "Details"} eyebrow="Role-specific">
            <RoleFields values={values} onChange={setValues} />
          </Card>
          <div className="form-footer">
            {!isSelf && (
              <button type="button" className="btn btn-danger-ghost" disabled={!!busy} onClick={deleteAccount}>
                <Trash2 size={16} /> Delete account
              </button>
            )}
            <button className="btn btn-primary" type="submit" disabled={!!busy}>
              {busy === "save" ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Save changes
            </button>
          </div>
        </form>

        <aside className="stack">
          <Card title="Account" eyebrow="Amazon Cognito">
            <dl className="detail-list">
              <div><dt>Status</dt><dd>{state.label}</dd></div>
              <div><dt>Created</dt><dd>{formatDateTime(person.account?.createdAt)}</dd></div>
              <div><dt>Last modified</dt><dd>{formatDateTime(person.account?.updatedAt)}</dd></div>
              <div><dt>Invited by</dt><dd>{person.invitedBy ?? "—"}</dd></div>
              <div><dt>User ID (sub)</dt><dd className="mono small">{person.account?.sub || "—"}</dd></div>
            </dl>
          </Card>
          <Card title="Activity" eyebrow="Audit trail" actions={<ShieldCheck size={16} className="muted" />}>
            {history.length === 0 ? (
              <p className="muted">No administrative events recorded for this user yet.</p>
            ) : (
              <ul className="activity-list">
                {history.map((entry) => (
                  <li key={entry.id}>
                    <span className="activity-dot" />
                    <div>
                      <strong>{entry.summary}</strong>
                      <small>{entry.actorEmail} · {relativeTime(entry.createdAt)}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
