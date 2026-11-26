import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { AlertTriangle, ArrowLeft, FileUp, HeartPulse, Loader2, Paperclip, Save, Thermometer, Weight, X, Activity } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useProfiles } from "../../hooks/useCareData";
import { client, unwrap } from "../../lib/amplify";
import { ageFrom, fileNameFromPath, formatDate, formatTime, fullName, todayISO } from "../../lib/format";
import { MAX_FILE_BYTES, saveRecord } from "../../lib/records";
import { Avatar, Card, Field, PageHeader, SkeletonRows } from "../../components/ui";

const EMPTY = {
  patientEmail: "",
  patientName: "",
  bloodPressure: "",
  heartRate: "",
  temperature: "",
  weight: "",
  assessment: "",
  diagnosis: "",
  treatmentPlan: "",
  prescriptions: "",
  followUpDate: "",
};

function PatientSummary({ patient, appointment }) {
  if (!patient && !appointment) {
    return (
      <Card title="Patient" eyebrow="Summary">
        <p className="muted">Select a patient to see their details and allergies here.</p>
      </Card>
    );
  }
  const age = ageFrom(patient?.dateOfBirth);
  return (
    <Card title="Patient" eyebrow="Summary">
      <div className="person-cell large">
        <Avatar name={patient ? fullName(patient) : appointment.patientName} email={patient?.email ?? appointment?.patientEmail} size="lg" />
        <div>
          <strong>{patient ? fullName(patient) : appointment.patientName}</strong>
          <small>{patient?.email ?? appointment?.patientEmail}</small>
        </div>
      </div>
      {patient?.allergies ? (
        <div className="allergy-alert">
          <AlertTriangle size={16} />
          <div>
            <strong>Allergies</strong>
            <span>{patient.allergies}</span>
          </div>
        </div>
      ) : (
        <p className="muted small">No allergies recorded.</p>
      )}
      <dl className="detail-list">
        <div><dt>Age</dt><dd>{age !== null ? `${age} years` : "—"}</dd></div>
        <div><dt>Gender</dt><dd>{patient?.gender || "—"}</dd></div>
        <div><dt>Blood group</dt><dd>{patient?.bloodGroup || "—"}</dd></div>
      </dl>
      {appointment && (
        <div className="linked-visit">
          <small>Linked appointment</small>
          <strong>{formatDate(appointment.date)} · {formatTime(appointment.time)}</strong>
          <span>{appointment.reason}</span>
        </div>
      )}
    </Card>
  );
}

export default function AssessmentFormPage() {
  const { recordId } = useParams();
  const [params] = useSearchParams();
  const appointmentId = params.get("appointment");
  const presetPatient = params.get("patient");
  const navigate = useNavigate();
  const { user, role, displayName } = useAuth();
  const { notify } = useFeedback();
  const profiles = useProfiles();
  const fileInput = useRef(null);

  const [values, setValues] = useState({ ...EMPTY, patientEmail: presetPatient ?? "" });
  const [existing, setExisting] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [completeVisit, setCompleteVisit] = useState(true);
  const [loading, setLoading] = useState(Boolean(recordId || appointmentId));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  const patients = useMemo(() => (profiles.data ?? []).filter((item) => item.role === "PATIENTS"), [profiles.data]);
  const patient = patients.find((item) => item.email === values.patientEmail);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (recordId) {
          const record = unwrap(await client.models.PatientRecord.get({ id: recordId }));
          if (!record) throw new Error("That record no longer exists.");
          if (cancelled) return;
          setExisting(record);
          const next = { ...EMPTY };
          for (const key of Object.keys(EMPTY)) next[key] = record[key] == null ? "" : String(record[key]);
          setValues(next);
        } else if (appointmentId) {
          const visit = unwrap(await client.models.Appointment.get({ id: appointmentId }));
          if (cancelled || !visit) return;
          setAppointment(visit);
          setValues((current) => ({ ...current, patientEmail: visit.patientEmail, patientName: visit.patientName }));
        }
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [recordId, appointmentId]);

  const set = (field) => (event) => setValues({ ...values, [field]: event.target.value });
  const locked = Boolean(appointment || existing);

  function addFiles(list) {
    const accepted = [];
    for (const file of list) {
      if (file.size > MAX_FILE_BYTES) {
        notify(`${file.name} is larger than 10 MB and was skipped.`, { tone: "warning" });
      } else {
        accepted.push(file);
      }
    }
    setFiles((current) => [...current, ...accepted]);
  }

  async function submit(event) {
    event.preventDefault();
    const selected = patient ?? (appointment ? { email: appointment.patientEmail, name: appointment.patientName } : null);
    if (!values.patientEmail || !values.assessment.trim()) {
      setError("Select a patient and write the clinical assessment before saving.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await saveRecord({
        id: existing?.id,
        values: {
          ...values,
          patientName: patient ? fullName(patient) : values.patientName || selected?.name,
          doctorEmail: existing?.doctorEmail ?? (role === "DOCTORS" ? user.email : null),
          doctorName: existing?.doctorName ?? (role === "DOCTORS" ? `Dr. ${displayName}` : null),
          appointmentId: existing?.appointmentId ?? appointment?.id ?? null,
        },
        files,
        existingAttachments: existing?.attachments ?? [],
        completeAppointment: Boolean(appointment) && completeVisit,
        onProgress: setProgress,
      });
      notify(existing ? "The record has been amended." : "Assessment saved to the patient's record.", { title: "Record saved" });
      navigate(`/records/${saved.id}`, { replace: true });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  if (loading) return <Card><SkeletonRows rows={6} /></Card>;

  return (
    <>
      <Link to={existing ? `/records/${existing.id}` : "/records"} className="back-link"><ArrowLeft size={16} /> {existing ? "Back to record" : "Medical records"}</Link>
      <PageHeader
        eyebrow="Clinical documentation"
        title={existing ? "Amend clinical record" : "New clinical assessment"}
        description={existing ? `Editing the record for ${existing.patientName}. Amendments are logged in the audit trail.` : "Document the encounter. The patient will be able to read this record from their portal."}
      />
      <div className="split-layout">
        <form className="stack" onSubmit={submit}>
          <Card title="Patient" eyebrow="1 · Who">
            {locked ? (
              <div className="locked-patient">
                <Avatar name={values.patientName} email={values.patientEmail} />
                <div>
                  <strong>{values.patientName}</strong>
                  <small>{values.patientEmail}</small>
                </div>
              </div>
            ) : (
              <Field label="Select patient" hint={patients.length ? undefined : "No patient profiles found. Invite patients from People & roles."}>
                <select value={values.patientEmail} onChange={set("patientEmail")} required>
                  <option value="">Choose a patient…</option>
                  {patients.map((item) => (
                    <option key={item.email} value={item.email}>{fullName(item)} — {item.email}</option>
                  ))}
                </select>
              </Field>
            )}
          </Card>

          <Card title="Vital signs" eyebrow="2 · Observations">
            <div className="vitals-grid">
              <Field label="Blood pressure" hint="mmHg">
                <div className="input-with-icon"><Activity size={16} className="input-icon" /><input value={values.bloodPressure} onChange={set("bloodPressure")} placeholder="120/80" pattern="\d{2,3}/\d{2,3}" title="e.g. 120/80" /></div>
              </Field>
              <Field label="Heart rate" hint="bpm">
                <div className="input-with-icon"><HeartPulse size={16} className="input-icon" /><input type="number" min="20" max="250" value={values.heartRate} onChange={set("heartRate")} placeholder="72" /></div>
              </Field>
              <Field label="Temperature" hint="°C">
                <div className="input-with-icon"><Thermometer size={16} className="input-icon" /><input type="number" step="0.1" min="30" max="45" value={values.temperature} onChange={set("temperature")} placeholder="36.8" /></div>
              </Field>
              <Field label="Weight" hint="kg">
                <div className="input-with-icon"><Weight size={16} className="input-icon" /><input type="number" step="0.1" min="0.5" max="400" value={values.weight} onChange={set("weight")} placeholder="70.5" /></div>
              </Field>
            </div>
          </Card>

          <Card title="Clinical assessment" eyebrow="3 · Findings">
            <div className="stack-sm">
              <Field label="Assessment & history">
                <textarea rows={5} value={values.assessment} onChange={set("assessment")} placeholder="Presenting complaint, history, examination findings…" required />
              </Field>
              <Field label="Diagnosis">
                <input value={values.diagnosis} onChange={set("diagnosis")} placeholder="e.g. Acute viral pharyngitis" />
              </Field>
              <Field label="Treatment plan">
                <textarea rows={3} value={values.treatmentPlan} onChange={set("treatmentPlan")} placeholder="Management, advice and referrals" />
              </Field>
              <Field label="Prescriptions" hint="One medication per line, e.g. Paracetamol 500mg — 2 tablets every 6 hours">
                <textarea rows={3} value={values.prescriptions} onChange={set("prescriptions")} placeholder="Medication · dose · frequency · duration" />
              </Field>
              <Field label="Follow-up date" hint="Optional">
                <input type="date" min={todayISO()} value={values.followUpDate} onChange={set("followUpDate")} />
              </Field>
            </div>
          </Card>

          <Card title="Supporting documents" eyebrow="4 · Attachments">
            <div
              className={`dropzone${dragging ? " dragging" : ""}`}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
              onClick={() => fileInput.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && fileInput.current?.click()}
            >
              <FileUp size={24} />
              <strong>Drop files here or click to browse</strong>
              <small>Lab results, referrals, scans · up to 10 MB each · stored privately in Amazon S3</small>
              <input ref={fileInput} type="file" multiple hidden onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
            </div>
            {(files.length > 0 || existing?.attachments?.length > 0) && (
              <ul className="file-list">
                {(existing?.attachments ?? []).map((path) => (
                  <li key={path}><Paperclip size={14} /> <span>{fileNameFromPath(path)}</span><small>Saved</small></li>
                ))}
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`}>
                    <Paperclip size={14} /> <span>{file.name}</span>
                    <small>{(file.size / 1024).toFixed(0)} KB</small>
                    <button type="button" className="icon-button ghost" aria-label={`Remove ${file.name}`} onClick={() => setFiles(files.filter((_, i) => i !== index))}><X size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {appointment && (
            <label className="checkbox-row">
              <input type="checkbox" checked={completeVisit} onChange={(event) => setCompleteVisit(event.target.checked)} />
              <span>Mark the linked appointment as <strong>completed</strong> when this record is saved</span>
            </label>
          )}
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <div className="form-footer">
            <Link className="btn btn-secondary" to={existing ? `/records/${existing.id}` : "/records"}>Cancel</Link>
            <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
              {busy ? <Loader2 size={17} className="spin" /> : <Save size={17} />}
              {busy
                ? progress ? `Uploading ${progress.file}/${progress.of} · ${progress.percent}%` : "Saving…"
                : existing ? "Save amendments" : "Save assessment"}
            </button>
          </div>
        </form>
        <aside className="stack sticky-aside">
          <PatientSummary patient={patient} appointment={appointment} />
        </aside>
      </div>
    </>
  );
}
