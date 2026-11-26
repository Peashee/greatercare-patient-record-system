import { defineAuth } from '@aws-amplify/backend';
import { userAdmin } from '../functions/user-admin/resource';
import { invitationEmail } from './invitation-email';

/**
 * Identity layer for GreaterCare.
 *
 * - Users sign in with their email address.
 * - Self sign-up is disabled in backend.ts: every account is provisioned by an
 *   administrator, who also assigns exactly one role (Cognito group).
 * - Newly provisioned users receive a branded invitation email containing a
 *   temporary password. On first sign-in Cognito issues a
 *   NEW_PASSWORD_REQUIRED challenge and the portal asks them to set their own.
 * - The `user-admin` function is the only principal allowed to call the
 *   Cognito admin APIs, and it is itself only reachable by the ADMINS group.
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      userInvitation: {
        emailSubject: 'Welcome to GreaterCare — your account is ready',
        emailBody: (username, code) => invitationEmail(username(), code()),
      },
    },
  },
  groups: ['ADMINS', 'DOCTORS', 'PATIENTS'],
  access: (allow) => [
    allow.resource(userAdmin).to([
      'manageUsers',
      'manageGroupMembership',
      'listUsers',
      'listUsersInGroup',
      'listGroupsForUser',
    ]),
  ],
  // To send invitations from your own address (e.g. no-reply@greatercare.health)
  // verify the address in Amazon SES and set GREATERCARE_SES_FROM_EMAIL before deploying.
  ...(process.env.GREATERCARE_SES_FROM_EMAIL
    ? {
        senders: {
          email: {
            fromEmail: process.env.GREATERCARE_SES_FROM_EMAIL,
            fromName: 'GreaterCare',
          },
        },
      }
    : {}),
});
