import { useMemo, useState } from "react";
import { Download, KeyRound, Lock, RefreshCw, ScrollText, Search, ShieldAlert } from "lucide-react";
import { useAuditLog } from "../../hooks/useCareData";
import { AUDIT_CATEGORIES } from "../../lib/audit";
import { downloadCsv, formatDateTime, relativeTime } from "../../lib/format";
import { EmptyState, ErrorState, PageHeader, RoleBadge, SkeletonRows, StatCard, Tabs } from "../../components/ui";

const ACTION_TONES = {
  ACCESS_DENIED: "rose",
  USER_DELETED: "rose",
  USER_DISABLED: "rose",
  RECORD_DELETED: "rose",
  APPOINTMENT_DELETED: "rose",
  ROLE_CHANGED: "violet",
  USER_INVITED: "violet",
  SIGN_IN: "teal",
  ACCOUNT_ACTIVATED: "teal",
};

export default function AuditLogPage() {
  const { data = [], loading, error, reload } = useAuditLog();
  const [category, setCategory] = useState("ALL");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const result = { ALL: data.length };
    for (const entry of data) result[entry.category] = (result[entry.category] ?? 0) + 1;
    return result;
  }, [data]);

  const last24h = data.filter((entry) => Date.now() - new Date(entry.createdAt).getTime() < 86400000);
  const denied = data.filter((entry) => entry.action === "ACCESS_DENIED").length;

  const visible = data.filter((entry) => {
    if (category !== "ALL" && entry.category !== category) return false;
    const text = `${entry.action} ${entry.summary} ${entry.actorEmail}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });

  function exportCsv() {
    downloadCsv(`greatercare-audit-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Timestamp", "Category", "Action", "Summary", "Actor", "Actor role", "Target", "Owner identity"],
      ...visible.map((entry) => [entry.createdAt, entry.category, entry.action, entry.summary, entry.actorEmail, entry.actorRole, entry.targetId, entry.owner]),
    ]);
  }

  return (
    <>
      <PageHeader
        eyebrow="Compliance"
        title="Audit trail"
        description="An append-only record of security-relevant activity. Entries cannot be edited or deleted — not even by administrators."
        actions={
          <>
            <button className="btn btn-secondary" onClick={reload}><RefreshCw size={16} /> Refresh</button>
            <button className="btn btn-primary" onClick={exportCsv} disabled={!visible.length}><Download size={16} /> Export CSV</button>
          </>
        }
      />

      <div className="stat-grid">
        <StatCard icon={ScrollText} label="Events recorded" value={data.length} hint="All time" />
        <StatCard icon={KeyRound} tone="teal" label="Last 24 hours" value={last24h.length} hint="Recent activity" />
        <StatCard icon={ShieldAlert} tone="rose" label="Access denied" value={denied} hint="Blocked route attempts" />
        <StatCard icon={Lock} tone="violet" label="Tamper protection" value="Immutable" hint="No update / delete API exists" />
      </div>

      <section className="card">
        <div className="table-toolbar">
          <Tabs
            value={category}
            onChange={setCategory}
            tabs={[{ value: "ALL", label: "All", count: counts.ALL }].concat(
              Object.entries(AUDIT_CATEGORIES).map(([value, label]) => ({ value, label, count: counts[value] ?? 0 }))
            )}
          />
          <div className="search-input">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events or people…" aria-label="Search audit events" />
          </div>
        </div>
        {error && <ErrorState error={error} onRetry={reload} />}
        {loading ? (
          <SkeletonRows rows={6} />
        ) : visible.length === 0 ? (
          <EmptyState icon={ScrollText} title="No events found">Activity will appear here as people use GreaterCare.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Event</th>
                  <th>Actor</th>
                  <th className="hide-sm">Category</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((entry) => (
                  <tr key={entry.id}>
                    <td className="nowrap">
                      <strong className="small">{relativeTime(entry.createdAt)}</strong>
                      <small className="block muted">{formatDateTime(entry.createdAt)}</small>
                    </td>
                    <td>
                      <span className={`action-tag tone-${ACTION_TONES[entry.action] ?? "neutral"}`}>{entry.action.replaceAll("_", " ")}</span>
                      <span className="block">{entry.summary}</span>
                    </td>
                    <td>
                      <span className="block">{entry.actorEmail || "—"}</span>
                      {entry.actorRole && <RoleBadge role={entry.actorRole} />}
                    </td>
                    <td className="hide-sm muted">{AUDIT_CATEGORIES[entry.category] ?? entry.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
