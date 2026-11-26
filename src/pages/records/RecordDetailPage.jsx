import { Link, useNavigate, useParams } from "react-router";
import { Activity, ArrowLeft, CalendarClock, Download, FileText, HeartPulse, Pencil, Pill, Printer, Thermometer, Trash2, Weight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useAsync } from "../../hooks/useAsync";
import { client, unwrap } from "../../lib/amplify";
import { audit } from "../../lib/audit";
import { fileNameFromPath, formatDate, formatDateTime } from "../../lib/format";
import { can } from "../../lib/rbac";
import { attachmentLinks, deleteRecord } from "../../lib/records";
import { Avatar, Card, EmptyState, ErrorState, Logo, SkeletonRows } from "../../components/ui";

function Vital({ icon: Icon, label, value, unit, tone }) {
  return (
    <div className={`vital tone-${tone}`}>
      <span className="vital-icon"><Icon size={17} /></span>
      <small>{label}</small>
      <strong>{value ?? "—"}{value != null && unit && <em>{unit}</em>}</strong>
    </div>
  );
}

export default function RecordDetailPage() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { notify, confirm } = useFeedback();
  const canSeeDocuments = can(role, "documents:manage");

  const { data, loading, error, reload } = useAsync(async () => {
    const record = unwrap(await client.models.PatientRecord.get({ id: recordId }));
    if (!record) return null;
    const attachments = canSeeDocuments ? await attachmentLinks(record.attachments ?? []) : [];
    audit("RECORD_VIEWED", "RECORD", `Viewed the clinical record for ${record.patientName}`, record.id);
    return { ...record, links: attachments };
  }, [recordId, canSeeDocuments]);

  async function remove() {
    const ok = await confirm({
      title: "Delete this clinical record?",
      message: "The record and its documents will be permanently removed. This cannot be undone.",
      confirmLabel: "Delete record",
    });
    if (!ok) return;
    try {
      await deleteRecord(data);
      notify("Record deleted.");
      navigate("/records");
    } catch (deleteError) {
      notify(deleteError.message, { tone: "error" });
    }
  }

  if (loading) return <Card><SkeletonRows rows={6} /></Card>;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) {
    return <EmptyState title="Record not found" action={<Link className="btn btn-primary" to="/records">Back to records</Link>}>It may have been removed, or you may not have access to it.</EmptyState>;
  }

  const prescriptions = (data.prescriptions ?? "").split("\n").map((line) => line.trim()).filter(Boolean);

  return (
    <>
      <div className="no-print detail-toolbar">
        <Link to="/records" className="back-link"><ArrowLeft size={16} /> Medical records</Link>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button>
          {can(role, "records:write") && <Link className="btn btn-secondary" to={`/records/${data.id}/edit`}><Pencil size={16} /> Amend</Link>}
          {can(role, "records:delete") && <button className="btn btn-danger-ghost" onClick={remove}><Trash2 size={16} /> Delete</button>}
        </div>
      </div>

      <article className="record-sheet">
        <header className="record-sheet-header">
          <div className="print-only"><Logo /></div>
          <div className="person-cell large">
            <Avatar name={data.patientName} email={data.patientEmail} size="lg" />
            <div>
              <div className="eyebrow">Clinical record</div>
              <h1>{data.patientName}</h1>
              <small>{data.patientEmail}</small>
            </div>
          </div>
          <dl className="record-sheet-meta">
            <div><dt>Recorded</dt><dd>{formatDateTime(data.createdAt)}</dd></div>
            <div><dt>Clinician</dt><dd>{data.doctorName || data.doctorEmail || "—"}</dd></div>
            {data.updatedAt !== data.createdAt && <div><dt>Last amended</dt><dd>{formatDateTime(data.updatedAt)}</dd></div>}
            <div><dt>Record ID</dt><dd className="mono small">{data.id.slice(0, 8).toUpperCase()}</dd></div>
          </dl>
        </header>

        <section className="vitals-row">
          <Vital icon={Activity} label="Blood pressure" value={data.bloodPressure} unit=" mmHg" tone="violet" />
          <Vital icon={HeartPulse} label="Heart rate" value={data.heartRate} unit=" bpm" tone="rose" />
          <Vital icon={Thermometer} label="Temperature" value={data.temperature} unit=" °C" tone="amber" />
          <Vital icon={Weight} label="Weight" value={data.weight} unit=" kg" tone="teal" />
        </section>

        {data.diagnosis && (
          <section className="record-section diagnosis-block">
            <h2>Diagnosis</h2>
            <p className="diagnosis-text">{data.diagnosis}</p>
          </section>
        )}
        <section className="record-section">
          <h2>Assessment</h2>
          <p className="prewrap">{data.assessment || data.notes || "—"}</p>
        </section>
        {data.treatmentPlan && (
          <section className="record-section">
            <h2>Treatment plan</h2>
            <p className="prewrap">{data.treatmentPlan}</p>
          </section>
        )}
        {prescriptions.length > 0 && (
          <section className="record-section">
            <h2>Prescriptions</h2>
            <ul className="prescription-list">
              {prescriptions.map((line) => <li key={line}><Pill size={15} /> {line}</li>)}
            </ul>
          </section>
        )}
        {data.followUpDate && (
          <section className="record-section followup">
            <CalendarClock size={18} />
            <div>
              <strong>Follow-up recommended</strong>
              <span>{formatDate(data.followUpDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
          </section>
        )}

        {canSeeDocuments && (
          <section className="record-section no-print">
            <h2>Documents</h2>
            {data.links.length === 0 ? (
              <p className="muted">No supporting documents attached.</p>
            ) : (
              <ul className="document-grid">
                {data.links.map(({ path, url }) => (
                  <li key={path}>
                    <FileText size={20} />
                    <span className="truncate">{fileNameFromPath(path)}</span>
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary"><Download size={14} /> Open</a>
                    ) : (
                      <small className="muted">Unavailable</small>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <small className="muted">Document links are pre-signed and expire after 15 minutes.</small>
          </section>
        )}
        <footer className="record-sheet-footer">
          Confidential medical information · Generated by GreaterCare on {formatDateTime(new Date().toISOString())}
        </footer>
      </article>
    </>
  );
}
