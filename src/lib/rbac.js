/**
 * Single source of truth for role-based access control in the UI.
 *
 * The UI uses this table to decide which routes, navigation items and actions
 * to show. The *authoritative* enforcement happens in AWS — the `enforcedBy`
 * column documents where. The Access Control page renders this table.
 */

export const ROLE_ORDER = ["ADMINS", "DOCTORS", "PATIENTS"];

export const ROLES = {
  ADMINS: {
    label: "Administrator",
    short: "Admin",
    tone: "violet",
    description: "Provisions accounts, assigns roles and oversees all clinical activity and the audit trail.",
  },
  DOCTORS: {
    label: "Doctor",
    short: "Doctor",
    tone: "teal",
    description: "Runs the appointment desk and writes clinical assessments for patients.",
  },
  PATIENTS: {
    label: "Patient",
    short: "Patient",
    tone: "amber",
    description: "Requests appointments and reviews their own medical record.",
  },
};

export const PERMISSION_GROUPS = [
  {
    title: "Identity & administration",
    permissions: [
      {
        key: "users:manage",
        label: "Provision users and assign roles",
        roles: ["ADMINS"],
        enforcedBy: "AppSync group rule → Lambda (Cognito admin APIs)",
      },
      {
        key: "audit:read",
        label: "Read the audit trail",
        roles: ["ADMINS"],
        enforcedBy: "AppSync group rule (AuditLog: read)",
      },
      {
        key: "audit:write",
        label: "Write own audit events (append-only)",
        roles: ["ADMINS", "DOCTORS", "PATIENTS"],
        enforcedBy: "AppSync owner rule (create only)",
      },
    ],
  },
  {
    title: "Appointments",
    permissions: [
      {
        key: "appointments:request",
        label: "Request own appointment",
        roles: ["PATIENTS"],
        enforcedBy: "AppSync owner rule on patientEmail",
      },
      {
        key: "appointments:schedule",
        label: "Schedule appointments for any patient",
        roles: ["ADMINS", "DOCTORS"],
        enforcedBy: "AppSync group rule",
      },
      {
        key: "appointments:manage",
        label: "Claim, complete and cancel appointments",
        roles: ["ADMINS", "DOCTORS"],
        enforcedBy: "AppSync group rule + conditional write",
      },
      {
        key: "appointments:assign",
        label: "Assign or reassign doctors",
        roles: ["ADMINS"],
        enforcedBy: "AppSync group rule",
      },
      {
        key: "appointments:delete",
        label: "Delete appointments",
        roles: ["ADMINS"],
        enforcedBy: "AppSync group rule (DOCTORS lack delete)",
      },
    ],
  },
  {
    title: "Clinical records",
    permissions: [
      {
        key: "records:read:own",
        label: "Read own medical records",
        roles: ["PATIENTS"],
        enforcedBy: "AppSync owner rule on patientEmail",
      },
      {
        key: "records:read:all",
        label: "Read all patient records",
        roles: ["ADMINS", "DOCTORS"],
        enforcedBy: "AppSync group rule",
      },
      {
        key: "records:write",
        label: "Write and amend clinical assessments",
        roles: ["ADMINS", "DOCTORS"],
        enforcedBy: "AppSync group rule",
      },
      {
        key: "records:delete",
        label: "Delete clinical records",
        roles: ["ADMINS"],
        enforcedBy: "AppSync group rule",
      },
      {
        key: "documents:manage",
        label: "Upload and view clinical documents",
        roles: ["ADMINS", "DOCTORS"],
        enforcedBy: "S3 IAM policy via Cognito Identity Pool role",
      },
      {
        key: "patients:directory",
        label: "Browse the patient directory",
        roles: ["ADMINS", "DOCTORS"],
        enforcedBy: "AppSync group rule (UserProfile: read)",
      },
    ],
  },
];

export const PERMISSIONS = PERMISSION_GROUPS.flatMap((group) => group.permissions);

const permissionIndex = new Map(PERMISSIONS.map((permission) => [permission.key, permission]));

/** Whether the role holds the permission. Unknown permissions are denied. */
export function can(role, key) {
  return permissionIndex.get(key)?.roles.includes(role) ?? false;
}

/** Resolves the effective role from Cognito groups (highest privilege wins). */
export function resolveRole(groups = []) {
  return ROLE_ORDER.find((role) => groups.includes(role)) ?? null;
}
