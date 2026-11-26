import { useState } from "react";
import { useNavigate } from "react-router";
import { CalendarX2, Check, ClipboardPlus, Hand, MoreHorizontal, Phone, Trash2, UserCog, Video, MapPin, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import {
  assignAppointment,
  claimAppointment,
  deleteAppointment,
  setAppointmentStatus,
  STATUS,
} from "../../lib/appointments";
import { formatDate, formatTime, fullName } from "../../lib/format";
import { can } from "../../lib/rbac";
import { StatusBadge } from "../../components/ui";
import Modal from "../../components/ui/Modal";

const VISIT_ICONS = { "Video call": Video, "Phone call": Phone };

function AssignDoctorModal({ appointment, doctors, onClose, onAssign }) {
  const [doctorEmail, setDoctorEmail] = useState(appointment.doctorEmail ?? "");
  return (
    <Modal title="Assign a doctor" description={`${appointment.patientName} · ${formatDate(appointment.date)} at ${formatTime(appointment.time)}`} onClose={onClose} size="sm">
      <label className="field">
        <span className="field-label">Doctor</span>
        <select value={doctorEmail} onChange={(event) => setDoctorEmail(event.target.value)}>
          <option value="">Unassigned — return to open queue</option>
          {doctors.map((doctor) => (
            <option key={doctor.email} value={doctor.email}>Dr. {fullName(doctor)}{doctor.specialty ? ` · ${doctor.specialty}` : ""}</option>
          ))}
        </select>
      </label>
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          onClick={() => {
            const doctor = doctors.find((item) => item.email === doctorEmail);
            onAssign(doctor ? { email: doctor.email, name: `Dr. ${fullName(doctor)}` } : null);
          }}
        >
          Save assignment
        </button>
      </div>
    </Modal>
  );
}

export function AppointmentRow({ appointment, doctors = [], onChanged, compact = false }) {
  const navigate = useNavigate();
  const { role, user, displayName } = useAuth();
  const { notify, confirm } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const status = appointment.status || STATUS.PENDING;
  const assignedToMe = appointment.doctorEmail?.toLowerCase() === user?.email;
  const isOpen = status === STATUS.PENDING || status === STATUS.CONFIRMED;
  const canManage = can(role, "appointments:manage");
  const canWork = role === "ADMINS" || assignedToMe;
  const VisitIcon = VISIT_ICONS[appointment.visitType] ?? MapPin;
  const date = new Date(`${appointment.date}T12:00:00`);

  async function run(action, success) {
    setBusy(true);
    setMenuOpen(false);
    try {
      await action();
      notify(success);
      onChanged?.();
    } catch (error) {
      notify(error.message, { tone: "error", title: "Appointment not updated" });
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    const ok = await confirm({
      title: "Cancel this appointment?",
      message: `${appointment.patientName}'s visit on ${formatDate(appointment.date)} will be marked as cancelled.`,
      confirmLabel: "Cancel appointment",
    });
    if (ok) run(() => setAppointmentStatus(appointment, STATUS.CANCELLED), "Appointment cancelled.");
  }

  async function remove() {
    const ok = await confirm({
      title: "Delete appointment?",
      message: "This permanently removes the appointment. Consider cancelling instead to keep the history.",
      confirmLabel: "Delete",
    });
    if (ok) run(() => deleteAppointment(appointment), "Appointment deleted.");
  }

  return (
    <article className={`appointment-row status-${status.toLowerCase()}${compact ? " compact" : ""}`}>
      <div className="date-tile">
        <small>{date.toLocaleDateString("en-GB", { month: "short" })}</small>
        <strong>{date.getDate()}</strong>
        <small>{date.toLocaleDateString("en-GB", { weekday: "short" })}</small>
      </div>
      <div className="appointment-main">
        <div className="appointment-title">
          <strong>{role === "PATIENTS" ? appointment.reason || "Consultation" : appointment.patientName}</strong>
          <StatusBadge status={status} />
        </div>
        <div className="appointment-meta">
          <span>{formatTime(appointment.time)}</span>
          <span><VisitIcon size={13} /> {appointment.visitType || "In person"}</span>
          {role !== "PATIENTS" && appointment.reason && <span className="truncate">{appointment.reason}</span>}
        </div>
        <div className={`appointment-doctor${appointment.doctorEmail ? "" : " unassigned"}`}>
          {appointment.doctorEmail
            ? assignedToMe ? "Assigned to you" : appointment.doctorName || appointment.doctorEmail
            : role === "PATIENTS" ? "Awaiting a doctor — we'll confirm shortly" : "Open — waiting for a doctor"}
        </div>
      </div>
      {canManage && (
        <div className="appointment-actions">
          {status === STATUS.PENDING && !appointment.doctorEmail && (
            <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => run(() => claimAppointment(appointment, { email: user.email, name: role === "DOCTORS" ? `Dr. ${displayName}` : displayName }), "Appointment added to your schedule.")}>
              <Hand size={14} /> Take
            </button>
          )}
          {canWork && status === STATUS.CONFIRMED && (
            <button className="btn btn-sm btn-secondary" disabled={busy} onClick={() => navigate(`/records/new?appointment=${appointment.id}`)}>
              <ClipboardPlus size={14} /> Assess
            </button>
          )}
          <div className="menu-wrap">
            <button className="icon-button" aria-label="More actions" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} disabled={busy}>
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <>
                <div className="menu-scrim" onClick={() => setMenuOpen(false)} />
                <div className="menu" role="menu">
                  {canWork && status === STATUS.CONFIRMED && (
                    <button role="menuitem" onClick={() => run(() => setAppointmentStatus(appointment, STATUS.COMPLETED), "Marked as completed.")}>
                      <Check size={15} /> Mark completed
                    </button>
                  )}
                  {can(role, "appointments:assign") && isOpen && (
                    <button role="menuitem" onClick={() => { setMenuOpen(false); setAssigning(true); }}>
                      <UserCog size={15} /> {appointment.doctorEmail ? "Reassign doctor" : "Assign doctor"}
                    </button>
                  )}
                  {(canWork || !appointment.doctorEmail) && isOpen && (
                    <button role="menuitem" onClick={cancel}>
                      <X size={15} /> Cancel appointment
                    </button>
                  )}
                  {can(role, "appointments:delete") && (
                    <button role="menuitem" className="danger" onClick={remove}>
                      <Trash2 size={15} /> Delete
                    </button>
                  )}
                  {!isOpen && !can(role, "appointments:delete") && (
                    <span className="menu-empty"><CalendarX2 size={15} /> No actions available</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {assigning && (
        <AssignDoctorModal
          appointment={appointment}
          doctors={doctors}
          onClose={() => setAssigning(false)}
          onAssign={(doctor) => {
            setAssigning(false);
            run(() => assignAppointment(appointment, doctor), doctor ? `Assigned to ${doctor.name}.` : "Returned to the open queue.");
          }}
        />
      )}
    </article>
  );
}
