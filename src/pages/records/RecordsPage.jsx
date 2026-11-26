import { useState } from "react";
import { Link } from "react-router";
import { ChevronRight, FileHeart, FilePlus2, Paperclip, Search, Stethoscope } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRecords } from "../../hooks/useCareData";
import { formatDate } from "../../lib/format";
import { can } from "../../lib/rbac";
import { Avatar, EmptyState, ErrorState, PageHeader, SkeletonRows } from "../../components/ui";

export function RecordItem({ record, showPatient = true }) {
  return (
    <Link to={`/records/${record.id}`} className="record-item">
      {showPatient ? (
        <Avatar name={record.patientName} email={record.patientEmail} />
      ) : (
        <span className="record-icon"><FileHeart size={18} /></span>
      )}
      <div className="record-item-main">
        <div className="record-item-top">
          <strong>{showPatient ? record.patientName : record.diagnosis || "Clinical assessment"}</strong>
          <span className="muted small">{formatDate(record.createdAt)}</span>
        </div>
        {showPatient && record.diagnosis && <span className="record-diagnosis">{record.diagnosis}</span>}
        <p>{record.assessment || record.notes || "No assessment details."}</p>
        <div className="record-item-meta">
          {record.doctorName || record.doctorEmail ? (
            <span><Stethoscope size={13} /> {record.doctorName || record.doctorEmail}</span>
          ) : null}
          {record.attachments?.length > 0 && <span><Paperclip size={13} /> {record.attachments.length} document{record.attachments.length === 1 ? "" : "s"}</span>}
        </div>
      </div>
      <ChevronRight size={18} className="row-chevron" />
    </Link>
  );
}

export default function RecordsPage() {
  const { role, user } = useAuth();
  const { data = [], loading, error, reload } = useRecords();
  const [query, setQuery] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const isPatient = role === "PATIENTS";

  const visible = data.filter((record) => {
    if (mineOnly && record.doctorEmail !== user.email) return false;
    const text = `${record.patientName} ${record.patientEmail} ${record.diagnosis ?? ""} ${record.assessment ?? ""}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });

  return (
    <>
      <PageHeader
        eyebrow={isPatient ? "Your health record" : "Clinical records"}
        title={isPatient ? "My medical records" : "Medical records"}
        description={
          isPatient
            ? "Every assessment your care team has written for you. Only you and your clinicians can see these."
            : "Assessments, diagnoses and supporting documents across your patients."
        }
        actions={
          can(role, "records:write") && (
            <Link className="btn btn-primary" to="/records/new"><FilePlus2 size={16} /> New assessment</Link>
          )
        }
      />
      <section className="card">
        {!isPatient && (
          <div className="table-toolbar">
            <div className="search-input grow">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient, diagnosis or notes…" aria-label="Search records" />
            </div>
            {role === "DOCTORS" && (
              <label className="switch">
                <input type="checkbox" checked={mineOnly} onChange={(event) => setMineOnly(event.target.checked)} />
                <span className="switch-track" />
                Written by me
              </label>
            )}
          </div>
        )}
        {error && <ErrorState error={error} onRetry={reload} />}
        {loading ? (
          <SkeletonRows rows={5} />
        ) : visible.length === 0 ? (
          <EmptyState icon={FileHeart} title={query ? "No matching records" : "No records yet"}>
            {isPatient ? "Records from your visits will appear here after your doctor completes an assessment." : "Assessments you write will appear here."}
          </EmptyState>
        ) : (
          <div className="record-list">
            {visible.map((record) => <RecordItem key={record.id} record={record} showPatient={!isPatient} />)}
          </div>
        )}
      </section>
    </>
  );
}
