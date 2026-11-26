import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  PatientRecord: a
    .model({
      patientName: a.string().required(),
      patientEmail: a.string().required(),
      notes: a.string(),
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
      status: a.string(),
    })
    .authorization((allow) => [
      allow.groups(['ADMINS']),
      allow.groups(['DOCTORS']).to(['create', 'read', 'update']),
      allow.ownerDefinedIn('patientEmail').identityClaim('email').to(['create', 'read']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});