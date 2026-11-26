import { Field } from "../../components/ui";
import { todayISO } from "../../lib/format";
import { BLOOD_GROUPS, SPECIALTIES } from "../../lib/profileOptions";

/** Basic identity fields shared by every role. */
export function IdentityFields({ values, onChange, emailLocked = false }) {
  const set = (field) => (event) => onChange({ ...values, [field]: event.target.value });
  return (
    <div className="form-grid">
      <Field label="First name">
        <input value={values.givenName} onChange={set("givenName")} placeholder="e.g. Amara" autoComplete="off" required />
      </Field>
      <Field label="Last name">
        <input value={values.familyName} onChange={set("familyName")} placeholder="e.g. Obi" autoComplete="off" required />
      </Field>
      <Field label="Email address" hint={emailLocked ? "Sign-in email can't be changed." : "Their sign-in username — the invitation is sent here."}>
        <input type="email" value={values.email} onChange={set("email")} placeholder="name@example.com" autoComplete="off" readOnly={emailLocked} required />
      </Field>
      <Field label="Phone number" hint="Optional">
        <input type="tel" value={values.phone ?? ""} onChange={set("phone")} placeholder="+44 7700 900123" autoComplete="off" />
      </Field>
    </div>
  );
}

/** Extra details that depend on the role being assigned. */
export function RoleFields({ values, onChange }) {
  const set = (field) => (event) => onChange({ ...values, [field]: event.target.value });

  if (values.role === "DOCTORS") {
    return (
      <div className="form-grid">
        <Field label="Specialty">
          <select value={values.specialty ?? ""} onChange={set("specialty")}>
            <option value="">Select a specialty</option>
            {SPECIALTIES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Department" hint="Optional">
          <input value={values.department ?? ""} onChange={set("department")} placeholder="e.g. Outpatients" />
        </Field>
        <Field label="Medical licence number" hint="Optional">
          <input value={values.licenseNumber ?? ""} onChange={set("licenseNumber")} placeholder="e.g. GMC 7123456" />
        </Field>
      </div>
    );
  }

  if (values.role === "PATIENTS") {
    return (
      <div className="form-grid">
        <Field label="Date of birth">
          <input type="date" value={values.dateOfBirth ?? ""} max={todayISO()} onChange={set("dateOfBirth")} />
        </Field>
        <Field label="Gender">
          <select value={values.gender ?? ""} onChange={set("gender")}>
            <option value="">Prefer not to say</option>
            <option>Female</option>
            <option>Male</option>
            <option>Non-binary</option>
          </select>
        </Field>
        <Field label="Blood group">
          <select value={values.bloodGroup ?? ""} onChange={set("bloodGroup")}>
            <option value="">Unknown</option>
            {BLOOD_GROUPS.map((group) => <option key={group}>{group}</option>)}
          </select>
        </Field>
        <Field label="Known allergies" hint="Separate with commas">
          <input value={values.allergies ?? ""} onChange={set("allergies")} placeholder="e.g. Penicillin, peanuts" />
        </Field>
        <Field label="Home address" className="span-2">
          <input value={values.address ?? ""} onChange={set("address")} placeholder="Street, city, postcode" />
        </Field>
        <Field label="Emergency contact" className="span-2">
          <input value={values.emergencyContact ?? ""} onChange={set("emergencyContact")} placeholder="Name · relationship · phone" />
        </Field>
      </div>
    );
  }

  return <p className="muted">Administrators don't need any additional details.</p>;
}
