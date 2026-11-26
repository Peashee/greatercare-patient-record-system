import { defineFunction } from '@aws-amplify/backend';

/**
 * Privileged identity-management function.
 *
 * It holds the only IAM permissions in the system for the Cognito admin APIs
 * (granted in auth/resource.ts) and is exposed exclusively through GraphQL
 * operations that are restricted to the ADMINS group (data/resource.ts).
 */
export const userAdmin = defineFunction({
  name: 'user-admin',
  entry: './handler.ts',
  timeoutSeconds: 30,
});
