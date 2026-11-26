import { Activity, CalendarCheck2, FileLock2, HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";
import { Logo } from "../../components/ui";

const FEATURES = [
  { icon: ShieldCheck, title: "Role-based access", text: "Admins, doctors and patients each see exactly what they should — enforced by AWS." },
  { icon: FileLock2, title: "Protected records", text: "Clinical notes and documents encrypted at rest in DynamoDB and S3." },
  { icon: CalendarCheck2, title: "Live appointment desk", text: "Requests, assignments and visits update in real time." },
];

export default function AuthLayout({ children }) {
  return (
    <div className="auth-shell">
      <section className="auth-showcase" aria-hidden="true">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-grid-lines" />
        <div className="auth-showcase-inner">
          <Logo inverted />
          <div className="auth-headline">
            <span className="auth-kicker">
              <HeartPulse size={15} /> Secure patient record system
            </span>
            <h1>
              Every patient.
              <br />
              Every record.
              <br />
              <em>One trusted place.</em>
            </h1>
            <p>GreaterCare connects your care team, appointments and clinical records behind enterprise-grade identity on AWS.</p>
          </div>

          <div className="auth-floating">
            <div className="float-card float-card-a">
              <span className="float-icon"><Stethoscope size={16} /></span>
              <div>
                <strong>Dr. Amara Obi</strong>
                <small>Claimed 10:30 consultation</small>
              </div>
              <span className="float-badge">Confirmed</span>
            </div>
            <div className="float-card float-card-b">
              <span className="float-icon float-icon-rose"><Activity size={16} /></span>
              <div>
                <strong>Vitals recorded</strong>
                <small>BP 118/76 · HR 72 bpm</small>
              </div>
            </div>
            <svg className="float-pulse" viewBox="0 0 300 60" preserveAspectRatio="none">
              <path d="M0 30 H80 L95 30 L105 8 L118 52 L130 18 L140 30 H300" />
            </svg>
          </div>

          <ul className="auth-features">
            {FEATURES.map((feature) => (
              <li key={feature.title}>
                <span><feature.icon size={17} /></span>
                <div>
                  <strong>{feature.title}</strong>
                  <small>{feature.text}</small>
                </div>
              </li>
            ))}
          </ul>
          <footer className="auth-showcase-footer">Built on AWS Amplify · Amazon Cognito · AWS AppSync</footer>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-mobile-logo"><Logo /></div>
          {children}
        </div>
        <footer className="auth-legal">© {new Date().getFullYear()} GreaterCare. Access is monitored and audited.</footer>
      </section>
    </div>
  );
}
