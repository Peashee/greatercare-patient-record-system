import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { userAdmin } from '../functions/user-admin/resource';

/**
 * GreaterCare data model and authorization rules.
 *
 * Every rule below is enforced server-side by AWS AppSync using the caller's
 * Cognito ID token. The React UI mirrors these rules (src/lib/rbac.js) purely
 * for usability — hiding a button is never the security boundary.
 *
 *   ADMINS   — full control of people, records, appointments; read the audit trail
 *   DOCTORS  — read the directory, manage appointments and clinical records
 *   PATIENTS — read only their own profile/records; request their own appointments
 */
const schema = a.schema({
  Role: a.enum(['ADMINS', 'DOCTORS', 'PATIENTS']),

  UserProfile: a
    .model({
      email: a.string().required(),
      givenName: a.string().required(),
      familyName: a.string().required(),
      role: a.ref('Role').required(),
      phone: a.string(),
      // Clinician details
      specialty: a.string(),
      department: a.string(),
      licenseNumber: a.string(),
      // Patient details
      dateOfBirth: a.date(),
      gender: a.string(),
      bloodGroup: a.string(),
      allergies: a.string(),
      address: a.string(),
      emergencyContact: a.string(),
      invitedBy: a.string(),
    })
    .identifier(['email'])
    .authorization((allow) => [
      allow.groups(['ADMINS']),
      allow.groups(['DOCTORS']).to(['read']),
      allow.ownerDefinedIn('email').identityClaim('email').to(['read']),
    ]),

  PatientRecord: a
    .model({
      patientName: a.string().required(),
      patientEmail: a.string().required(),
      // Clinical content
      assessment: a.string(),
      diagnosis: a.string(),
      treatmentPlan: a.string(),
      prescriptions: a.string(),
      notes: a.string(),
      // Vital signs captured at the encounter
      bloodPressure: a.string(),
      heartRate: a.integer(),
      temperature: a.float(),
      weight: a.float(),
      followUpDate: a.date(),
      // Provenance
      doctorEmail: a.string(),
      doctorName: a.string(),
      appointmentId: a.string(),
      attachments: a.string().array(),
      image: a.string(),
    })
    .authorization((allow) => [
      allow.groups(['ADMINS']),
      allow.groups(['DOCTORS']).to(['create', 'read', 'update']),
      allow.ownerDefinedIn('patientEmail').identityClaim('email').to(['read']),
    ]),

  Appointment: a
    .model({
      patientName: a.string().required(),
      patientEmail: a.string().required(),
      date: a.string().required(),
      time: a.string().required(),
      reason: a.string(),
      visitType: a.string(),
      status: a.string(),
      doctorEmail: a.string(),
      doctorName: a.string(),
    })
    .authorization((allow) => [
      allow.groups(['ADMINS']),
      allow.groups(['DOCTORS']).to(['create', 'read', 'update']),
      allow.ownerDefinedIn('patientEmail').identityClaim('email').to(['create', 'read']),
    ]),

  /**
   * Append-only audit trail. Any signed-in user may *create* an entry, and
   * AppSync stamps the immutable `owner` field with the caller's identity, so
   * entries cannot be attributed to someone else. Nobody can update or delete
   * entries; only administrators can read them.
   */
  AuditLog: a
    .model({
      action: a.string().required(),
      category: a.string().required(),
      summary: a.string().required(),
      actorEmail: a.string(),
      actorRole: a.string(),
      targetId: a.string(),
      owner: a.string(),
    })
    .authorization((allow) => [
      allow.owner().to(['create']),
      allow.groups(['ADMINS']).to(['read']),
    ]),

  // ---- Identity administration (Cognito) — ADMINS only -------------------
  inviteUser: a
    .mutation()
    .arguments({
      email: a.string().required(),
      givenName: a.string().required(),
      familyName: a.string().required(),
      role: a.string().required(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.group('ADMINS')])
    .handler(a.handler.function(userAdmin)),

  listUsers: a
    .query()
    .returns(a.json())
    .authorization((allow) => [allow.group('ADMINS')])
    .handler(a.handler.function(userAdmin)),

  updateUser: a
    .mutation()
    .arguments({
      email: a.string().required(),
      givenName: a.string(),
      familyName: a.string(),
      role: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.group('ADMINS')])
    .handler(a.handler.function(userAdmin)),

  setUserEnabled: a
    .mutation()
    .arguments({ email: a.string().required(), enabled: a.boolean().required() })
    .returns(a.json())
    .authorization((allow) => [allow.group('ADMINS')])
    .handler(a.handler.function(userAdmin)),

  resendInvitation: a
    .mutation()
    .arguments({ email: a.string().required() })
    .returns(a.json())
    .authorization((allow) => [allow.group('ADMINS')])
    .handler(a.handler.function(userAdmin)),

  deleteUser: a
    .mutation()
    .arguments({ email: a.string().required() })
    .returns(a.json())
    .authorization((allow) => [allow.group('ADMINS')])
    .handler(a.handler.function(userAdmin)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
