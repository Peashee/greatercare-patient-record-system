import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronRight, MailPlus, RefreshCw, Search, ShieldCheck, Stethoscope, UserPlus, Users, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useDirectoryUsers, useProfiles } from "../../hooks/useCareData";
import { fullName, relativeTime } from "../../lib/format";
import { ROLES } from "../../lib/rbac";
import { accountState, mergeDirectory, resendInvitation } from "../../lib/userAdmin";
import { Avatar, EmptyState, ErrorState, PageHeader, RoleBadge, SkeletonRows, StatCard, StatusBadge, Tabs } from "../../components/ui";

export default function UsersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useFeedback();
  const directory = useDirectoryUsers();
  const profiles = useProfiles();
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [resending, setResending] = useState("");

  const people = useMemo(
    () => mergeDirectory(directory.data ?? [], profiles.data ?? []),
    [directory.data, profiles.data]
  );

  const counts = useMemo(() => {
    const result = { ALL: people.length, ADMINS: 0, DOCTORS: 0, PATIENTS: 0, INVITED: 0 };
    for (const person of people) {
      if (person.role) result[person.role] += 1;
      if (accountState(person.account).key === "INVITED") result.INVITED += 1;
    }
    return result;
  }, [people]);

  const visible = people.filter((person) => {
    if (roleFilter !== "ALL" && person.role !== roleFilter) return false;
    const haystack = `${fullName(person)} ${person.email} ${person.specialty ?? ""} ${person.department ?? ""}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  async function resend(event, email) {
    event.stopPropagation();
    setResending(email);
    try {
      await resendInvitation(email);
      notify(`A new temporary password was emailed to ${email}.`, { title: "Invitation re-sent" });
      directory.reload();
    } catch (error) {
      notify(error.message, { tone: "error", title: "Could not resend invitation" });
    } finally {
      setResending("");
    }
  }

  const loading = directory.loading || profiles.loading;

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="People & roles"
        description="Provision accounts, assign roles and manage access to GreaterCare. Every change is written to the audit trail."
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => { directory.reload(); profiles.reload(); }}>
              <RefreshCw size={16} /> Refresh
            </button>
            <Link className="btn btn-primary" to="/admin/users/new">
              <UserPlus size={16} /> Invite user
            </Link>
          </>
        }
      />

      <div className="stat-grid">
        <StatCard icon={Users} label="Total accounts" value={counts.ALL} hint="Across all roles" />
        <StatCard icon={ShieldCheck} tone="violet" label="Administrators" value={counts.ADMINS} hint="Full system control" />
        <StatCard icon={Stethoscope} tone="teal" label="Doctors" value={counts.DOCTORS} hint="Clinical staff" />
        <StatCard icon={UserRound} tone="amber" label="Patients" value={counts.PATIENTS} hint={`${counts.INVITED} invitation${counts.INVITED === 1 ? "" : "s"} pending`} />
      </div>

      <section className="card">
        <div className="table-toolbar">
          <Tabs
            value={roleFilter}
            onChange={setRoleFilter}
            tabs={[
              { value: "ALL", label: "Everyone", count: counts.ALL },
              { value: "ADMINS", label: "Admins", count: counts.ADMINS },
              { value: "DOCTORS", label: "Doctors", count: counts.DOCTORS },
              { value: "PATIENTS", label: "Patients", count: counts.PATIENTS },
            ]}
          />
          <div className="search-input">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, specialty…" aria-label="Search people" />
          </div>
        </div>

        {directory.error && <ErrorState error={directory.error} onRetry={directory.reload} />}
        {loading ? (
          <SkeletonRows rows={5} />
        ) : visible.length === 0 ? (
          <EmptyState icon={Users} title={query ? "No one matches that search" : "No accounts yet"} action={<Link className="btn btn-primary" to="/admin/users/new"><UserPlus size={16} /> Invite the first user</Link>}>
            {query ? "Try a different name or email." : "Invite doctors and patients to start using GreaterCare."}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Role</th>
                  <th>Account status</th>
                  <th className="hide-sm">Details</th>
                  <th className="hide-sm">Created</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visible.map((person) => {
                  const state = accountState(person.account);
                  const isSelf = person.email === user?.email;
                  return (
                    <tr key={person.email} className="row-link" onClick={() => navigate(`/admin/users/${encodeURIComponent(person.email)}`)}>
                      <td>
                        <div className="person-cell">
                          <Avatar name={fullName(person)} email={person.email} />
                          <div>
                            <strong>{fullName(person) || "Unnamed user"} {isSelf && <span className="you-tag">You</span>}</strong>
                            <small>{person.email}</small>
                          </div>
                        </div>
                      </td>
                      <td><RoleBadge role={person.role} /></td>
                      <td><StatusBadge status={state.key} label={state.label} /></td>
                      <td className="hide-sm muted">
                        {person.role === "DOCTORS"
                          ? [person.specialty, person.department].filter(Boolean).join(" · ") || "—"
                          : person.role === "PATIENTS"
                            ? person.bloodGroup ? `Blood group ${person.bloodGroup}` : "—"
                            : ROLES[person.role]?.short ?? "—"}
                      </td>
                      <td className="hide-sm muted">{relativeTime(person.account?.createdAt ?? person.createdAt)}</td>
                      <td className="row-actions">
                        {state.key === "INVITED" && (
                          <button className="btn btn-sm btn-secondary" disabled={resending === person.email} onClick={(event) => resend(event, person.email)}>
                            <MailPlus size={14} /> {resending === person.email ? "Sending…" : "Resend"}
                          </button>
                        )}
                        <ChevronRight size={18} className="row-chevron" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
