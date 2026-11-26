import { useMemo, useState } from "react";
import { Link } from "react-router";
import { AlertTriangle, CalendarDays, Droplet, Search, UserPlus, UsersRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments, useProfiles, useRecords } from "../../hooks/useCareData";
import { ageFrom, formatDate, fullName } from "../../lib/format";
import { can } from "../../lib/rbac";
import { Avatar, EmptyState, ErrorState, PageHeader, SkeletonRows } from "../../components/ui";

export default function PatientsPage() {
  const { role } = useAuth();
  const profiles = useProfiles();
  const records = useRecords();
  const appointments = useAppointments();
  const [query, setQuery] = useState("");

  const patients = useMemo(() => {
    const lastVisit = new Map();
    for (const record of records.data ?? []) {
      if (!lastVisit.has(record.patientEmail)) lastVisit.set(record.patientEmail, record.createdAt);
    }
    const recordCount = new Map();
    for (const record of records.data ?? []) recordCount.set(record.patientEmail, (recordCount.get(record.patientEmail) ?? 0) + 1);
    const nextVisit = new Map();
    const today = new Date().toISOString().slice(0, 10);
    for (const appointment of appointments.items) {
      if (appointment.date >= today && appointment.status !== "CANCELLED" && appointment.status !== "COMPLETED" && !nextVisit.has(appointment.patientEmail)) {
        nextVisit.set(appointment.patientEmail, appointment.date);
      }
    }
    return (profiles.data ?? [])
      .filter((profile) => profile.role === "PATIENTS")
      .map((profile) => ({
        ...profile,
        lastVisit: lastVisit.get(profile.email),
        records: recordCount.get(profile.email) ?? 0,
        nextVisit: nextVisit.get(profile.email),
      }))
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [profiles.data, records.data, appointments.items]);

  const visible = patients.filter((patient) =>
    `${fullName(patient)} ${patient.email} ${patient.phone ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <>
      <PageHeader
        eyebrow="Directory"
        title="Patients"
        description="Every registered patient, with allergies, upcoming visits and record history at a glance."
        actions={can(role, "users:manage") && <Link className="btn btn-primary" to="/admin/users/new"><UserPlus size={16} /> Register patient</Link>}
      />
      <div className="toolbar-row">
        <div className="search-input grow">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, email or phone…" aria-label="Search patients" />
        </div>
        <span className="muted">{visible.length} patient{visible.length === 1 ? "" : "s"}</span>
      </div>
      {profiles.error && <ErrorState error={profiles.error} onRetry={profiles.reload} />}
      {profiles.loading ? (
        <div className="card"><SkeletonRows rows={6} /></div>
      ) : visible.length === 0 ? (
        <div className="card"><EmptyState icon={UsersRound} title="No patients found">Patients appear here once an administrator registers them.</EmptyState></div>
      ) : (
        <div className="patient-grid">
          {visible.map((patient) => {
            const age = ageFrom(patient.dateOfBirth);
            return (
              <Link key={patient.email} className="patient-card" to={`/patients/${encodeURIComponent(patient.email)}`}>
                <div className="patient-card-top">
                  <Avatar name={fullName(patient)} email={patient.email} size="lg" />
                  <div>
                    <strong>{fullName(patient)}</strong>
                    <small>{[age !== null && `${age} yrs`, patient.gender].filter(Boolean).join(" · ") || patient.email}</small>
                  </div>
                </div>
                <div className="chip-row">
                  {patient.bloodGroup && <span className="chip"><Droplet size={12} /> {patient.bloodGroup}</span>}
                  {patient.allergies && <span className="chip chip-danger"><AlertTriangle size={12} /> Allergies</span>}
                  <span className="chip">{patient.records} record{patient.records === 1 ? "" : "s"}</span>
                </div>
                <div className="patient-card-foot">
                  <span><small>Last visit</small>{patient.lastVisit ? formatDate(patient.lastVisit) : "—"}</span>
                  <span><small>Next visit</small>{patient.nextVisit ? <span className="inline-icon"><CalendarDays size={13} /> {formatDate(patient.nextVisit)}</span> : "—"}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
