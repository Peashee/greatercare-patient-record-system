#!/usr/bin/env node
/**
 * Bootstraps the first GreaterCare administrator.
 *
 * Self sign-up is disabled, so the very first ADMINS account has to be created
 * out-of-band. After that, administrators provision everyone else from the
 * portal (Admin → People).
 *
 * Usage (uses your local AWS credentials, e.g. the profile used by `ampx sandbox`):
 *   node scripts/create-admin.mjs admin@example.com Ada Lovelace
 */
import { readFile } from 'node:fs/promises';
import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

const [email, givenName = 'System', familyName = 'Administrator'] = process.argv.slice(2);
if (!email) {
  console.error('Usage: node scripts/create-admin.mjs <email> [givenName] [familyName]');
  process.exit(1);
}

const outputs = JSON.parse(await readFile(new URL('../amplify_outputs.json', import.meta.url), 'utf8'));
const { user_pool_id: UserPoolId, aws_region: region } = outputs.auth;
const cognito = new CognitoIdentityProviderClient({ region });
const Username = email.trim().toLowerCase();

try {
  await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId,
      Username,
      DesiredDeliveryMediums: ['EMAIL'],
      UserAttributes: [
        { Name: 'email', Value: Username },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: givenName },
        { Name: 'family_name', Value: familyName },
      ],
    })
  );
  console.log(`Invitation email sent to ${Username}.`);
} catch (error) {
  if (error.name !== 'UsernameExistsException') throw error;
  console.log(`${Username} already exists — ensuring it is an administrator.`);
}

await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId, Username, GroupName: 'ADMINS' }));
console.log(`${Username} is now in the ADMINS group. Sign in with the temporary password from the email.`);
