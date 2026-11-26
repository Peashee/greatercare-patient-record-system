export function fullName(person) {
  if (!person) return "";
  const name = [person.givenName, person.familyName].filter(Boolean).join(" ").trim();
  return name || person.name || person.email || "";
}

export function initials(nameOrEmail = "") {
  const parts = nameOrEmail.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}

export function todayISO() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export function addDaysISO(iso, days) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
  if (!value) return "—";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", options).format(date);
}

export function formatDateTime(value) {
  return formatDate(value, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatTime(value) {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes ?? 0);
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function relativeTime(value) {
  if (!value) return "";
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function ageFrom(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(`${dateOfBirth}T12:00:00`);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function appointmentDateTime(appointment) {
  return new Date(`${appointment.date}T${appointment.time || "00:00"}:00`);
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function fileNameFromPath(path = "") {
  return path.split("/").pop().replace(/^\d+-[0-9a-f-]{8,}-/i, "").replace(/^\d+-/, "");
}

export function downloadCsv(filename, rows) {
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}
