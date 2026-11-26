import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { AlertTriangle, ArrowLeft, CalendarDays, FileHeart, FilePlus2, Mail, MapPin, Phone, ShieldPlus, UserCog } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments, useProfiles, useRecords } from "../../hooks/useCareData";
import { ageFrom, formatDate, fullName } from "../../lib/format";
import { can } from "../../lib/rbac";
import { Avatar, Card, EmptyState, SkeletonRows } from "../../components/ui";
import { AppointmentRow } from "../appointments/AppointmentList";
import { RecordItem } from "../records/RecordsPage";

export default function PatientDetailPage() {
  const { email: rawEmail } = useParams();
  const email = decodeURIComponent(rawEmail ?? "").toLowerCase();
  const { role } = useAuth();
  const profiles = useProfiles();
  const records = useRecords();
  const appointments = useAppointments();

  const patient = (profiles.data ?? []).find((profile) => profile.email === email);
  const doctors = (profiles.data ?? []).filter((profile) => profile.role === "DOCTORS");
  const patientRecords = useMemo(() => (records.data ?? []).filter((record) => record.patientEmail === email), [records.data, email]);
  const patientAppointments = useMemo(() => appointments.items.filter((item) => item.patientEmail === email).reverse(), [appointments.items, email]);

  if (profiles.loading) return <Card><SkeletonRows rows={6} /></Card>;
  if (!patient) {
    return <EmptyState title="Patient not found" action={<Link className="btn btn-primary" to="/patients">Back to patients</Link>}>No patient profile exists for {email}.</EmptyState>;
  }

  const age = ageFrom(patient.dateOfBirth);
  const latest = patientRecords[0];

  return (
    <>
      <Link to="/patients" className="back-link"><ArrowLeft size={16} /> Patients</Link>
      <section className="profile-hero card">
        <Avatar name={fullName(patient)} email={patient.email} size="xl" />
        <div className="profile-hero-text">
          <h1>{fullName(patient)}</h1>
          <p>{[age !== null && `${age} years old`, patient.gender, patient.dateOfBirth && `Born ${formatDate(patient.dateOfBirth)}`].filter(Boolean).join(" · ") || "Patient"}</p>
          <div className="contact-row">
            <span><Mail size={14} /> {patient.email}</span>
            {patient.phone && <span><Phone size={14} /> {patient.phone}</span>}
            {patient.address && <span><MapPin size={14} /> {patient.address}</span>}
          </div>
        </div>
        <div className="profile-hero-actions">
          {can(role, "records:write") && (
            <Link className="btn btn-primary" to={`/records/new?patient=${encodeURIComponent(patient.email)}`}><FilePlus2 size={16} /> New assessment</Link>
          )}
          {can(role, "users:manage") && (
            <Link className="btn btn-secondary" to={`/admin/users/${encodeURIComponent(patient.email)}`}><UserCog size={16} /> Manage account</Link>
          )}
        </div>
      </section>

      {patient.allergies && (
        <div className="allergy-alert wide">
          <AlertTriangle size={18} />
          <div>
            <strong>Allergy alert</strong>
            <span>{patient.allergies}</span>
          </div>
        </div>
      )}

      <div className="split-layout">
        <div className="stack">
          <Card title="Clinical history" eyebrow={`${patientRecords.length} record${patientRecords.length === 1 ? "" : "s"}`} padded={false}>
            {records.loading ? <SkeletonRows rows={3} /> : patientRecords.length === 0 ? (
              <EmptyState icon={FileHeart} title="No records yet">Assessments for this patient will appear here.</EmptyState>
            ) : (
              <div className="record-list timeline">
                {patientRecords.map((record) => <RecordItem key={record.id} record={record} showPatient={false} />)}
              </div>
            )}
          </Card>
          <Card title="Appointments" eyebrow={`${patientAppointments.length} total`} padded={false}>
            {patientAppointments.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No appointments">This patient hasn't booked any visits.</EmptyState>
            ) : (
              <div className="appointment-list">
                {patientAppointments.map((appointment) => (
                  <AppointmentRow key={appointment.id} appointment={appointment} doctors={doctors} onChanged={appointments.reload} compact />
                ))}
              </div>
            )}
          </Card>
        </div>
        <aside className="stack">
          <Card title="Medical summary" eyebrow="At a glance">
            <dl className="detail-list">
              <div><dt>Blood group</dt><dd>{patient.bloodGroup || "Unknown"}</dd></div>
              <div><dt>Allergies</dt><dd>{patient.allergies || "None recorded"}</dd></div>
              <div><dt>Latest diagnosis</dt><dd>{latest?.diagnosis || "—"}</dd></div>
              <div><dt>Last BP</dt><dd>{patientRecords.find((record) => record.bloodPressure)?.bloodPressure ?? "—"}</dd></div>
              <div><dt>Next follow-up</dt><dd>{patientRecords.find((record) => record.followUpDate)?.followUpDate ? formatDate(patientRecords.find((record) => record.followUpDate).followUpDate) : "—"}</dd></div>
            </dl>
          </Card>
          <Card title="Emergency contact" eyebrow="Safety">
            <p className="contact-block"><ShieldPlus size={16} /> {patient.emergencyContact || "Not provided"}</p>
          </Card>
        </aside>
      </div>
    </>
  );
}
