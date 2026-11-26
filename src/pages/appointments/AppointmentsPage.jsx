import { useMemo, useState } from "react";
import { CalendarDays, CalendarPlus, Radio, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useAppointments, useProfiles } from "../../hooks/useCareData";
import { createAppointment, STATUS } from "../../lib/appointments";
import { appointmentDateTime, fullName } from "../../lib/format";
import { can } from "../../lib/rbac";
import { EmptyState, ErrorState, PageHeader, SkeletonRows, Tabs } from "../../components/ui";
import Modal from "../../components/ui/Modal";
import AppointmentForm from "./AppointmentForm";
import { AppointmentRow } from "./AppointmentList";

export default function AppointmentsPage() {
  const { role, user, displayName } = useAuth();
  const { notify } = useFeedback();
  const appointments = useAppointments();
  const isStaff = can(role, "appointments:schedule");
  const profiles = useProfiles();
  const [tab, setTab] = useState(role === "DOCTORS" ? "MINE" : "UPCOMING");
  const [query, setQuery] = useState("");
  const [booking, setBooking] = useState(false);

  const patients = (profiles.data ?? []).filter((profile) => profile.role === "PATIENTS");
  const doctors = (profiles.data ?? []).filter((profile) => profile.role === "DOCTORS");

  const groups = useMemo(() => {
    const now = Date.now();
    const items = appointments.items;
    const active = (item) => item.status !== STATUS.CANCELLED && item.status !== STATUS.COMPLETED;
    return {
      UPCOMING: items.filter((item) => active(item) && appointmentDateTime(item) >= now - 3600000),
      OPEN: items.filter((item) => item.status === STATUS.PENDING && !item.doctorEmail),
      MINE: items.filter((item) => item.doctorEmail === user?.email && active(item)),
      PAST: items.filter((item) => item.status === STATUS.COMPLETED || (active(item) && appointmentDateTime(item) < now - 3600000)).reverse(),
      CANCELLED: items.filter((item) => item.status === STATUS.CANCELLED),
      ALL: items,
    };
  }, [appointments.items, user?.email]);

  const tabs = [
    role === "DOCTORS" && { value: "MINE", label: "My schedule", count: groups.MINE.length },
    { value: "UPCOMING", label: "Upcoming", count: groups.UPCOMING.length },
    isStaff && { value: "OPEN", label: "Needs a doctor", count: groups.OPEN.length },
    { value: "PAST", label: "Past", count: groups.PAST.length },
    { value: "CANCELLED", label: "Cancelled", count: groups.CANCELLED.length },
    { value: "ALL", label: "All", count: groups.ALL.length },
  ].filter(Boolean);

  const visible = (groups[tab] ?? []).filter((item) =>
    `${item.patientName} ${item.reason} ${item.doctorName ?? ""} ${item.patientEmail}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  async function submit(values) {
    if (isStaff) {
      const patient = patients.find((item) => item.email === values.patientEmail);
      const selected = doctors.find((item) => item.email === values.doctorEmail);
      const doctor =
        role === "DOCTORS"
          ? { email: user.email, name: displayName }
          : selected && { email: selected.email, name: fullName(selected) };
      await createAppointment(
        {
          patientEmail: patient.email,
          patientName: fullName(patient),
          date: values.date,
          time: values.time,
          visitType: values.visitType,
          reason: values.reason.trim(),
          doctorEmail: doctor?.email,
          doctorName: doctor ? `Dr. ${doctor.name}` : undefined,
        },
        { requestedBy: role }
      );
      notify(`Visit scheduled for ${fullName(patient)}.`, { title: "Appointment scheduled" });
    } else {
      await createAppointment(
        {
          patientEmail: user.email,
          patientName: displayName,
          date: values.date,
          time: values.time,
          visitType: values.visitType,
          reason: values.reason.trim(),
        },
        { requestedBy: role }
      );
      notify("Your care team will assign a doctor shortly.", { title: "Request received" });
    }
    setBooking(false);
    appointments.reload();
  }

  return (
    <>
      <PageHeader
        eyebrow={role === "PATIENTS" ? "Your visits" : "Appointment desk"}
        title="Appointments"
        description={
          role === "PATIENTS"
            ? "Request a visit and follow its progress — a doctor will confirm your appointment."
            : "Claim open requests, manage your schedule and move visits through to completion."
        }
        actions={
          <>
            {appointments.live && (
              <span className="live-pill"><Radio size={14} /> Live</span>
            )}
            <button className="btn btn-primary" onClick={() => setBooking(true)}>
              <CalendarPlus size={16} /> {isStaff ? "Schedule appointment" : "Request appointment"}
            </button>
          </>
        }
      />

      <section className="card">
        <div className="table-toolbar">
          <Tabs tabs={tabs} value={tab} onChange={setTab} />
          {role !== "PATIENTS" && (
            <div className="search-input">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient or reason…" aria-label="Search appointments" />
            </div>
          )}
        </div>
        {appointments.error && <ErrorState error={appointments.error} onRetry={appointments.reload} />}
        {appointments.loading ? (
          <SkeletonRows rows={5} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={tab === "OPEN" ? "The queue is clear" : "No appointments here"}
            action={<button className="btn btn-secondary" onClick={() => setBooking(true)}><CalendarPlus size={16} /> {isStaff ? "Schedule one" : "Request a visit"}</button>}
          >
            {tab === "OPEN" ? "Every request has a doctor. Nice work." : "Appointments matching this view will appear here."}
          </EmptyState>
        ) : (
          <div className="appointment-list">
            {visible.map((appointment) => (
              <AppointmentRow key={appointment.id} appointment={appointment} doctors={doctors} onChanged={appointments.live ? undefined : appointments.reload} />
            ))}
          </div>
        )}
      </section>

      {booking && (
        <Modal
          title={isStaff ? "Schedule an appointment" : "Request an appointment"}
          description={isStaff ? "Book a visit on behalf of a patient." : "Choose a time that suits you — we'll match you with a doctor."}
          onClose={() => setBooking(false)}
        >
          <AppointmentForm
            mode={isStaff ? "staff" : "patient"}
            patients={patients}
            doctors={role === "ADMINS" ? doctors : []}
            onSubmit={submit}
            onCancel={() => setBooking(false)}
          />
        </Modal>
      )}
    </>
  );
}
