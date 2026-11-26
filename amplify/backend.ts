import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { userAdmin } from './functions/user-admin/resource';

/**
 * GreaterCare backend: Cognito (identity + RBAC groups), AppSync/DynamoDB
 * (data with per-model authorization), S3 (clinical documents) and a Lambda
 * function for administrator-driven account provisioning.
 * @see https://docs.amplify.aws/react/build-a-backend/
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  userAdmin,
});

const { cfnUserPool } = backend.auth.resources.cfnResources;

// Accounts can only be created by an administrator — public self sign-up is disabled.
cfnUserPool.addPropertyOverride('AdminCreateUserConfig.AllowAdminCreateUserOnly', true);
// Temporary passwords in invitation emails expire after 7 days.
cfnUserPool.addPropertyOverride('Policies.PasswordPolicy.TemporaryPasswordValidityDays', 7);
