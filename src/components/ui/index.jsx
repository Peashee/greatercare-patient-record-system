import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { ROLES } from "../../lib/rbac";
import { initials } from "../../lib/format";

const AVATAR_TONES = ["teal", "violet", "amber", "rose", "sky", "lime"];

function toneFor(seed = "") {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function Logo({ compact = false, inverted = false }) {
  return (
    <span className={`logo${inverted ? " logo-inverted" : ""}`}>
      <span className="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeLinecap="round">
          <path d="M19.4 8.2A8.4 8.4 0 1 0 20.4 12h-4.6" strokeWidth="2.6" />
          <path d="M12 8.6v6.8M8.6 12h6.8" strokeWidth="2.4" />
        </svg>
      </span>
      {!compact && (
        <span className="logo-text">
          GreaterCare
          <small>Care, connected</small>
        </span>
      )}
    </span>
  );
}

export function Avatar({ name, email, size = "md" }) {
  const label = name || email || "?";
  return (
    <span className={`avatar avatar-${size} avatar-${toneFor(email || name)}`} aria-hidden="true">
      {initials(label)}
    </span>
  );
}

export function RoleBadge({ role }) {
  if (!role) return <span className="badge badge-neutral">No role</span>;
  const meta = ROLES[role];
  return <span className={`badge badge-${meta?.tone ?? "neutral"}`}>{meta?.label ?? role}</span>;
}

const STATUS_TONES = {
  PENDING: "amber",
  CONFIRMED: "teal",
  COMPLETED: "sky",
  CANCELLED: "rose",
  ACTIVE: "teal",
  INVITED: "amber",
  DISABLED: "rose",
};

export function StatusBadge({ status, label }) {
  const key = (status || "PENDING").toUpperCase();
  return (
    <span className={`badge badge-dot badge-${STATUS_TONES[key] ?? "neutral"}`}>
      {label ?? key.charAt(0) + key.slice(1).toLowerCase()}
    </span>
  );
}

export function Spinner({ label = "Loading…", inline = false }) {
  return (
    <div className={inline ? "spinner-inline" : "spinner-block"} role="status">
      <Loader2 className="spin" size={inline ? 16 : 22} />
      <span>{label}</span>
    </div>
  );
}

export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton-row" key={index}>
          <span className="skeleton skeleton-circle" />
          <span className="skeleton-lines">
            <span className="skeleton" style={{ width: `${55 + ((index * 17) % 35)}%` }} />
            <span className="skeleton" style={{ width: `${30 + ((index * 11) % 25)}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty-state">
      {Icon && (
        <span className="empty-icon">
          <Icon size={22} />
        </span>
      )}
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="alert alert-error" role="alert">
      <span>{error?.message ?? String(error ?? "Something went wrong.")}</span>
      {onRetry && (
        <button className="btn btn-sm btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function StatCard({ icon: Icon, label, value, hint, tone = "teal", to }) {
  const body = (
    <>
      <span className={`stat-icon tone-${tone}`}>{Icon && <Icon size={19} />}</span>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <small className="stat-hint">{hint}</small>}
    </>
  );
  return to ? (
    <Link className="stat-card stat-card-link" to={to}>
      {body}
    </Link>
  ) : (
    <div className="stat-card">{body}</div>
  );
}

export function Card({ title, eyebrow, actions, children, className = "", padded = true }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-header">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h2>{title}</h2>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className={padded ? "card-body" : ""}>{children}</div>
    </section>
  );
}

export function Field({ label, hint, error, children, className = "" }) {
  return (
    <label className={`field ${error ? "field-invalid" : ""} ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          className={`tab${value === tab.value ? " tab-active" : ""}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
          {tab.count !== undefined && <span className="tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}
