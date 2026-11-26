import { Link } from "react-router";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  ClipboardList,
  Droplet,
  FileHeart,
  FilePlus2,
  Hourglass,
  ScrollText,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAppointments, useAuditLog, useProfiles, useRecords } from "../hooks/useCareData";
import { appointmentDateTime, formatDate, formatTime, greeting, relativeTime, todayISO } from "../lib/format";
import { ROLES } from "../lib/rbac";
import { Card, EmptyState, RoleBadge, SkeletonRows, StatCard } from "../components/ui";
import { AppointmentRow } from "./appointments/AppointmentList";
import { RecordItem } from "./records/RecordsPage";
import { StatusBreakdown, WeekBarChart } from "./dashboard/Charts";

function Hero({ subtitle, actions }) {
  const { firstName, role } = useAuth();
  return (
    <section className="hero">
      <div className="hero-text">
        <div className="hero-date">{formatDate(new Date().toISOString(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
        <h1>{greeting()}, {role === "DOCTORS" ? `Dr. ${firstName}` : firstName}</h1>
        <p>{subtitle}</p>
        <div className="hero-actions">{actions}</div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="hero-ring" />
        <div className="hero-badge"><ShieldCheck size={16} /> {ROLES[role]?.label} workspace</div>
        <svg viewBox="0 0 240 80" className="hero-pulse" preserveAspectRatio="none">
          <path d="M0 40 H70 L85 40 L95 14 L108 66 L120 26 L130 40 H240" />
        </svg>
      </div>
    </section>
  );
}

function upcoming(items) {
  const now = Date.now() - 3600000;
  return items.filter((item) => ["PENDING", "CONFIRMED"].includes(item.status || "PENDING") && appointmentDateTime(item) >= now);
}

function AdminDashboard() {
  const appointments = useAppointments();
  const records = useRecords();
  const profiles = useProfiles();
  const auditLog = useAuditLog();
  const people = profiles.data ?? [];
  const open = appointments.items.filter((item) => item.status === "PENDING" && !item.doctorEmail);
  const doctors = people.filter((person) => person.role === "DOCTORS");

  return (
    <>
      <Hero
        subtitle="Here's how GreaterCare is running today — people, visits and security at a glance."
        actions={
          <>
            <Link className="btn btn-primary" to="/admin/users/new"><UserPlus size={16} /> Invite user</Link>
            <Link className="btn btn-glass" to="/admin/audit"><ScrollText size={16} /> Audit trail</Link>
          </>
        }
      />
      <div className="stat-grid">
        <StatCard icon={UsersRound} tone="amber" label="Patients" value={people.filter((p) => p.role === "PATIENTS").length} hint="Registered profiles" to="/patients" />
        <StatCard icon={Stethoscope} tone="teal" label="Doctors" value={doctors.length} hint="Active clinicians" to="/admin/users" />
        <StatCard icon={Hourglass} tone="rose" label="Needs a doctor" value={open.length} hint="Unassigned requests" to="/appointments" />
        <StatCard icon={FileHeart} tone="violet" label="Clinical records" value={records.data?.length ?? "—"} hint="All time" to="/records" />
      </div>
      <div className="dashboard-grid">
        <Card title="Visits this week" eyebrow="Next 7 days" className="span-2">
          {appointments.loading ? <SkeletonRows rows={3} /> : <WeekBarChart appointments={appointments.items} />}
        </Card>
        <Card title="Appointment status" eyebrow="All time">
          <StatusBreakdown appointments={appointments.items} />
        </Card>
        <Card title="Open requests" eyebrow="Assign a doctor" className="span-2" padded={false} actions={<Link to="/appointments" className="text-link">View desk <ArrowRight size={14} /></Link>}>
          {open.length === 0 ? (
            <EmptyState icon={CalendarCheck2} title="Queue is clear">Every request has a doctor.</EmptyState>
          ) : (
            <div className="appointment-list">
              {open.slice(0, 4).map((item) => <AppointmentRow key={item.id} appointment={item} doctors={doctors} compact />)}
            </div>
          )}
        </Card>
        <Card title="Recent activity" eyebrow="Audit trail" actions={<Link to="/admin/audit" className="text-link">All events <ArrowRight size={14} /></Link>}>
          {auditLog.loading ? <SkeletonRows rows={4} /> : (auditLog.data ?? []).length === 0 ? (
            <p className="muted">No activity recorded yet.</p>
          ) : (
            <ul className="activity-list">
              {auditLog.data.slice(0, 6).map((entry) => (
                <li key={entry.id}>
                  <span className={`activity-dot${entry.action === "ACCESS_DENIED" ? " danger" : ""}`} />
                  <div>
                    <strong>{entry.summary}</strong>
                    <small>{entry.actorEmail} · {relativeTime(entry.createdAt)}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function DoctorDashboard() {
  const { user } = useAuth();
  const appointments = useAppointments();
  const records = useRecords();
  const today = todayISO();
  const mine = upcoming(appointments.items).filter((item) => item.doctorEmail === user.email);
  const todays = mine.filter((item) => item.date === today);
  const open = appointments.items.filter((item) => item.status === "PENDING" && !item.doctorEmail);
  const myRecords = (records.data ?? []).filter((record) => record.doctorEmail === user.email);
  const followUps = myRecords.filter((record) => record.followUpDate && record.followUpDate >= today);

  return (
    <>
      <Hero
        subtitle={todays.length ? `You have ${todays.length} visit${todays.length === 1 ? "" : "s"} scheduled today.` : "Your schedule is clear today — check the open queue for new requests."}
        actions={
          <>
            <Link className="btn btn-primary" to="/records/new"><FilePlus2 size={16} /> New assessment</Link>
            <Link className="btn btn-glass" to="/appointments"><CalendarClock size={16} /> Appointment desk</Link>
          </>
        }
      />
      <div className="stat-grid">
        <StatCard icon={CalendarCheck2} tone="teal" label="Today" value={todays.length} hint="Visits on your schedule" to="/appointments" />
        <StatCard icon={Hourglass} tone="rose" label="Open queue" value={open.length} hint="Requests waiting for a doctor" to="/appointments" />
        <StatCard icon={ClipboardList} tone="violet" label="My records" value={myRecords.length} hint="Assessments written" to="/records" />
        <StatCard icon={CalendarClock} tone="amber" label="Follow-ups" value={followUps.length} hint="Upcoming reviews" />
      </div>
      <div className="dashboard-grid">
        <Card title="My upcoming visits" eyebrow="Schedule" className="span-2" padded={false} actions={<Link to="/appointments" className="text-link">Full schedule <ArrowRight size={14} /></Link>}>
          {appointments.loading ? <SkeletonRows rows={3} /> : mine.length === 0 ? (
            <EmptyState icon={CalendarCheck2} title="Nothing scheduled">Take a request from the open queue to fill your schedule.</EmptyState>
          ) : (
            <div className="appointment-list">{mine.slice(0, 5).map((item) => <AppointmentRow key={item.id} appointment={item} compact />)}</div>
          )}
        </Card>
        <Card title="Open queue" eyebrow="Unassigned" padded={false}>
          {open.length === 0 ? (
            <EmptyState icon={CalendarCheck2} title="All caught up">No patients are waiting.</EmptyState>
          ) : (
            <div className="appointment-list">{open.slice(0, 4).map((item) => <AppointmentRow key={item.id} appointment={item} compact />)}</div>
          )}
        </Card>
        <Card title="Visits this week" eyebrow="Practice-wide" className="span-2">
          <WeekBarChart appointments={appointments.items} />
        </Card>
        <Card title="Recent assessments" eyebrow="Written by you" padded={false}>
          {myRecords.length === 0 ? <EmptyState icon={FileHeart} title="No assessments yet" /> : (
            <div className="record-list">{myRecords.slice(0, 3).map((record) => <RecordItem key={record.id} record={record} />)}</div>
          )}
        </Card>
      </div>
    </>
  );
}

function PatientDashboard() {
  const { profile } = useAuth();
  const appointments = useAppointments();
  const records = useRecords();
  const next = upcoming(appointments.items)[0];
  const latest = records.data?.[0];
  const followUp = (records.data ?? []).find((record) => record.followUpDate && record.followUpDate >= todayISO());

  return (
    <>
      <Hero
        subtitle="Your health, appointments and records — all in one secure place."
        actions={
          <>
            <Link className="btn btn-primary" to="/appointments"><CalendarPlus size={16} /> Book a visit</Link>
            <Link className="btn btn-glass" to="/records"><FileHeart size={16} /> My records</Link>
          </>
        }
      />
      <div className="dashboard-grid">
        <section className="card next-visit span-2">
          <div className="eyebrow">Your next appointment</div>
          {appointments.loading ? <SkeletonRows rows={2} /> : next ? (
            <div className="next-visit-body">
              <div className="date-tile large">
                <small>{formatDate(next.date, { month: "short" })}</small>
                <strong>{new Date(`${next.date}T12:00:00`).getDate()}</strong>
                <small>{formatDate(next.date, { weekday: "short" })}</small>
              </div>
              <div>
                <h2>{next.reason || "Consultation"}</h2>
                <p>{formatTime(next.time)} · {next.visitType || "In person"}</p>
                <p className={next.doctorEmail ? "" : "muted"}>
                  <Stethoscope size={14} /> {next.doctorName || (next.doctorEmail ? next.doctorEmail : "A doctor will confirm your visit shortly")}
                </p>
              </div>
            </div>
          ) : (
            <EmptyState icon={CalendarPlus} title="No upcoming visits" action={<Link className="btn btn-primary" to="/appointments">Request an appointment</Link>}>
              Need to see someone? Request a visit and we'll match you with a doctor.
            </EmptyState>
          )}
        </section>
        <Card title="My health profile" eyebrow="Summary">
          <dl className="detail-list">
            <div><dt><Droplet size={13} /> Blood group</dt><dd>{profile?.bloodGroup || "Not recorded"}</dd></div>
            <div><dt><AlertTriangle size={13} /> Allergies</dt><dd>{profile?.allergies || "None recorded"}</dd></div>
            <div><dt><CalendarClock size={13} /> Follow-up</dt><dd>{followUp ? formatDate(followUp.followUpDate) : "None scheduled"}</dd></div>
          </dl>
          <p className="muted small">Something wrong? Let your care team know at your next visit.</p>
        </Card>
        <Card title="Latest record" eyebrow="From your care team" className="span-2" padded={false} actions={<Link to="/records" className="text-link">All records <ArrowRight size={14} /></Link>}>
          {records.loading ? <SkeletonRows rows={2} /> : latest ? (
            <div className="record-list"><RecordItem record={latest} showPatient={false} /></div>
          ) : (
            <EmptyState icon={FileHeart} title="No records yet">After your first visit, your doctor's notes will appear here.</EmptyState>
          )}
        </Card>
        <Card title="Your privacy" eyebrow="How we protect you">
          <ul className="privacy-list">
            <li><ShieldCheck size={15} /> Only you and your clinicians can read your records.</li>
            <li><ShieldCheck size={15} /> Every access is logged in a tamper-proof audit trail.</li>
            <li><ShieldCheck size={15} /> Sessions end automatically after 15 minutes idle.</li>
          </ul>
          <div className="chip-row"><RoleBadge role="PATIENTS" /></div>
        </Card>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { role } = useAuth();
  if (role === "ADMINS") return <AdminDashboard />;
  if (role === "DOCTORS") return <DoctorDashboard />;
  return <PatientDashboard />;
}
