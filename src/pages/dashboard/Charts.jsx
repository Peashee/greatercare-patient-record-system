import { useState } from "react";
import { addDaysISO, formatDate, todayISO } from "../../lib/format";

/** Appointments per day for the next 7 days — single series, hover for detail. */
export function WeekBarChart({ appointments }) {
  const [active, setActive] = useState(null);
  const start = todayISO();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDaysISO(start, index);
    const count = appointments.filter((item) => item.date === date && item.status !== "CANCELLED").length;
    return { date, count };
  });
  const max = Math.max(4, ...days.map((day) => day.count));

  return (
    <div className="bar-chart" role="img" aria-label={`Appointments over the next 7 days: ${days.map((d) => `${formatDate(d.date, { weekday: "short" })} ${d.count}`).join(", ")}`}>
      <div className="bar-chart-plot">
        {[1, 0.5, 0].map((ratio) => (
          <span key={ratio} className="grid-line" style={{ bottom: `${ratio * 100}%` }}>
            <small>{Math.round(max * ratio)}</small>
          </span>
        ))}
        {days.map((day, index) => (
          <div
            key={day.date}
            className={`bar-slot${active === index ? " active" : ""}`}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
            tabIndex={0}
          >
            <span className="bar" style={{ height: `${(day.count / max) * 100}%` }} />
            {active === index && (
              <span className="chart-tooltip">
                <strong>{day.count} visit{day.count === 1 ? "" : "s"}</strong>
                {formatDate(day.date, { weekday: "long", day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="bar-chart-axis">
        {days.map((day, index) => (
          <span key={day.date} className={index === 0 ? "today" : ""}>
            {index === 0 ? "Today" : formatDate(day.date, { weekday: "short" })}
          </span>
        ))}
      </div>
    </div>
  );
}

const STATUS_SERIES = [
  { key: "PENDING", label: "Pending", className: "seg-pending" },
  { key: "CONFIRMED", label: "Confirmed", className: "seg-confirmed" },
  { key: "COMPLETED", label: "Completed", className: "seg-completed" },
  { key: "CANCELLED", label: "Cancelled", className: "seg-cancelled" },
];

/** Share of appointments by status: segmented bar + legend with counts. */
export function StatusBreakdown({ appointments }) {
  const total = appointments.length;
  const series = STATUS_SERIES.map((item) => ({
    ...item,
    count: appointments.filter((appointment) => (appointment.status || "PENDING") === item.key).length,
  }));
  if (!total) return <p className="muted">No appointments to summarise yet.</p>;
  return (
    <div className="status-breakdown">
      <div className="segmented-bar" role="img" aria-label={series.map((item) => `${item.label} ${item.count}`).join(", ")}>
        {series.filter((item) => item.count).map((item) => (
          <span key={item.key} className={item.className} style={{ flexGrow: item.count }} title={`${item.label}: ${item.count}`} />
        ))}
      </div>
      <ul className="legend">
        {series.map((item) => (
          <li key={item.key}>
            <span className={`legend-swatch ${item.className}`} />
            <span>{item.label}</span>
            <strong>{item.count}</strong>
            <small>{Math.round((item.count / total) * 100)}%</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
