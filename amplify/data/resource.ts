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
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});