import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Field } from "../../components/ui";
import { fullName, todayISO } from "../../lib/format";
import { VISIT_TYPES } from "../../lib/appointments";

/**
 * Patients request a visit for themselves; staff schedule for any patient
 * (and administrators can assign a doctor straight away).
 */
export default function AppointmentForm({ mode, patients = [], doctors = [], defaultDoctor, onSubmit, onCancel }) {
  const [values, setValues] = useState({
    patientEmail: "",
    date: "",
    time: "",
    visitType: VISIT_TYPES[0],
    reason: "",
    doctorEmail: defaultDoctor?.email ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (field) => (event) => setValues({ ...values, [field]: event.target.value });

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit(values);
    } catch (submitError) {
      setError(submitError.message);
      setBusy(false);
    }
  }

  return (
    <form className="stack-sm" onSubmit={submit}>
      {mode === "staff" && (
        <Field label="Patient" hint={patients.length ? undefined : "No patient profiles yet — invite patients from People & roles."}>
          <select value={values.patientEmail} onChange={set("patientEmail")} required>
            <option value="">Select a patient</option>
            {patients.map((patient) => (
              <option key={patient.email} value={patient.email}>{fullName(patient)} — {patient.email}</option>
            ))}
          </select>
        </Field>
      )}
      <div className="form-grid">
        <Field label="Date">
          <input type="date" min={todayISO()} value={values.date} onChange={set("date")} required />
        </Field>
        <Field label="Time">
          <input type="time" value={values.time} onChange={set("time")} min="07:00" max="20:00" required />
        </Field>
      </div>
      <Field label="Visit type">
        <div className="segmented">
          {VISIT_TYPES.map((type) => (
            <button type="button" key={type} className={values.visitType === type ? "active" : ""} onClick={() => setValues({ ...values, visitType: type })}>
              {type}
            </button>
          ))}
        </div>
      </Field>
      <Field label={mode === "staff" ? "Reason for visit" : "What would you like help with?"}>
        <textarea rows={3} value={values.reason} onChange={set("reason")} placeholder="Briefly describe symptoms or the purpose of the visit" required />
      </Field>
      {mode === "staff" && doctors.length > 0 && (
        <Field label="Assign doctor" hint="Leave unassigned to place it in the open queue.">
          <select value={values.doctorEmail} onChange={set("doctorEmail")}>
            <option value="">Unassigned — open queue</option>
            {doctors.map((doctor) => (
              <option key={doctor.email} value={doctor.email}>Dr. {fullName(doctor)}{doctor.specialty ? ` · ${doctor.specialty}` : ""}</option>
            ))}
          </select>
        </Field>
      )}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="modal-actions">
        {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
          {mode === "staff" ? "Schedule appointment" : "Request appointment"}
        </button>
      </div>
    </form>
  );
}
