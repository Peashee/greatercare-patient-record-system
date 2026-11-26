import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'amplifyNotesDrive',
  access: (allow) => ({
    'records/*': [
      allow.groups(['ADMINS']).to(['read', 'write', 'delete']),
      allow.groups(['DOCTORS']).to(['read', 'write']),
    ],
  }),
});