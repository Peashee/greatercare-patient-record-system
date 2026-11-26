import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  AdminRemoveUserFromGroupCommand,
  AdminUpdateUserAttributesCommand,
  AdminUserGlobalSignOutCommand,
  CognitoIdentityProviderClient,
  ListUsersInGroupCommand,
  type AttributeType,
  type UserType,
} from '@aws-sdk/client-cognito-identity-provider';
/**
 * Amplify Gen 2 invokes `a.handler.function(...)` handlers with this payload
 * (see the generated "Invoke AWS Lambda data source" resolver): the operation
 * name is a top-level `fieldName`, not `info.fieldName` as with direct AppSync
 * Lambda resolvers. Both are accepted.
 */
type AmplifyFunctionEvent = {
  typeName?: string;
  fieldName?: string;
  info?: { fieldName?: string };
  arguments?: Args;
  identity?: unknown;
};

const ROLES = ['ADMINS', 'DOCTORS', 'PATIENTS'] as const;
type Role = (typeof ROLES)[number];

const cognito = new CognitoIdentityProviderClient({});
const userPoolId = process.env.AMPLIFY_AUTH_USERPOOL_ID;

type Args = {
  email?: string;
  givenName?: string;
  familyName?: string;
  role?: string;
  enabled?: boolean;
};

type CallerIdentity = {
  sub?: string;
  groups?: string[] | null;
  claims?: Record<string, unknown>;
  username?: string;
};

class UserFacingError extends Error {}

function requirePoolId(): string {
  if (!userPoolId) throw new Error('AMPLIFY_AUTH_USERPOOL_ID is not configured for this function.');
  return userPoolId;
}

function normalizeEmail(value: unknown): string {
  const email = String(value ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new UserFacingError('A valid email address is required.');
  }
  return email;
}

function normalizeRole(value: unknown): Role {
  const role = String(value ?? '').trim().toUpperCase();
  if (!ROLES.includes(role as Role)) {
    throw new UserFacingError(`Role must be one of ${ROLES.join(', ')}.`);
  }
  return role as Role;
}

function attribute(attributes: AttributeType[] | undefined, name: string): string {
  return attributes?.find((item) => item.Name === name)?.Value ?? '';
}

function callerEmail(identity: CallerIdentity): string {
  const email = identity.claims?.email;
  return typeof email === 'string' ? email.toLowerCase() : '';
}

/** Defence in depth: AppSync already restricts these operations to ADMINS. */
function assertAdmin(identity: CallerIdentity | null | undefined): CallerIdentity {
  if (!identity?.groups?.includes('ADMINS')) {
    throw new UserFacingError('Only administrators can manage user accounts.');
  }
  return identity;
}

function assertNotSelf(identity: CallerIdentity, email: string, action: string) {
  if (callerEmail(identity) === email) {
    throw new UserFacingError(`You cannot ${action} your own account.`);
  }
}

function serializeUser(user: UserType, role: Role | null) {
  const attributes = user.Attributes;
  return {
    sub: attribute(attributes, 'sub'),
    email: attribute(attributes, 'email'),
    givenName: attribute(attributes, 'given_name'),
    familyName: attribute(attributes, 'family_name'),
    role,
    enabled: user.Enabled ?? true,
    status: user.UserStatus ?? 'UNKNOWN',
    createdAt: user.UserCreateDate?.toISOString() ?? null,
    updatedAt: user.UserLastModifiedDate?.toISOString() ?? null,
  };
}

async function currentRoles(email: string): Promise<Role[]> {
  const result = await cognito.send(
    new AdminListGroupsForUserCommand({ UserPoolId: requirePoolId(), Username: email })
  );
  return (result.Groups ?? [])
    .map((group) => group.GroupName)
    .filter((name): name is Role => ROLES.includes(name as Role));
}

async function setSingleRole(email: string, role: Role) {
  const poolId = requirePoolId();
  for (const existing of await currentRoles(email)) {
    if (existing !== role) {
      await cognito.send(
        new AdminRemoveUserFromGroupCommand({ UserPoolId: poolId, Username: email, GroupName: existing })
      );
    }
  }
  await cognito.send(
    new AdminAddUserToGroupCommand({ UserPoolId: poolId, Username: email, GroupName: role })
  );
}

async function inviteUser(args: Args) {
  const email = normalizeEmail(args.email);
  const role = normalizeRole(args.role);
  const givenName = String(args.givenName ?? '').trim();
  const familyName = String(args.familyName ?? '').trim();
  if (!givenName || !familyName) throw new UserFacingError('First and last name are required.');

  try {
    const created = await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: requirePoolId(),
        Username: email,
        DesiredDeliveryMediums: ['EMAIL'],
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'given_name', Value: givenName },
          { Name: 'family_name', Value: familyName },
        ],
      })
    );
    await setSingleRole(email, role);
    return serializeUser(created.User ?? {}, role);
  } catch (error) {
    if ((error as Error).name === 'UsernameExistsException') {
      throw new UserFacingError(`An account for ${email} already exists.`);
    }
    throw error;
  }
}

async function listUsers() {
  const poolId = requirePoolId();
  const users = new Map<string, ReturnType<typeof serializeUser>>();
  // Walk every role group. A user is shown with the highest-privilege group
  // they belong to; ROLES is ordered by privilege.
  for (const role of [...ROLES].reverse()) {
    let nextToken: string | undefined;
    do {
      const page = await cognito.send(
        new ListUsersInGroupCommand({ UserPoolId: poolId, GroupName: role, Limit: 60, NextToken: nextToken })
      );
      for (const user of page.Users ?? []) {
        const serialized = serializeUser(user, role);
        users.set(serialized.email, serialized);
      }
      nextToken = page.NextToken;
    } while (nextToken);
  }
  return [...users.values()].sort((a, b) => a.email.localeCompare(b.email));
}

async function updateUser(identity: CallerIdentity, args: Args) {
  const email = normalizeEmail(args.email);
  const poolId = requirePoolId();
  const attributes: AttributeType[] = [];
  if (args.givenName?.trim()) attributes.push({ Name: 'given_name', Value: args.givenName.trim() });
  if (args.familyName?.trim()) attributes.push({ Name: 'family_name', Value: args.familyName.trim() });
  if (attributes.length) {
    await cognito.send(
      new AdminUpdateUserAttributesCommand({ UserPoolId: poolId, Username: email, UserAttributes: attributes })
    );
  }
  if (args.role) {
    const role = normalizeRole(args.role);
    const roles = await currentRoles(email);
    if (!(roles.length === 1 && roles[0] === role)) {
      assertNotSelf(identity, email, 'change the role of');
      await setSingleRole(email, role);
      // Revoke refresh tokens so the new role takes effect on next sign-in.
      await cognito.send(new AdminUserGlobalSignOutCommand({ UserPoolId: poolId, Username: email }));
    }
  }
  const user = await cognito.send(new AdminGetUserCommand({ UserPoolId: poolId, Username: email }));
  const [role] = await currentRoles(email);
  return serializeUser(
    {
      Attributes: user.UserAttributes,
      Enabled: user.Enabled,
      UserStatus: user.UserStatus,
      UserCreateDate: user.UserCreateDate,
      UserLastModifiedDate: user.UserLastModifiedDate,
    },
    role ?? null
  );
}

async function setUserEnabled(identity: CallerIdentity, args: Args) {
  const email = normalizeEmail(args.email);
  const poolId = requirePoolId();
  if (args.enabled) {
    await cognito.send(new AdminEnableUserCommand({ UserPoolId: poolId, Username: email }));
  } else {
    assertNotSelf(identity, email, 'disable');
    await cognito.send(new AdminDisableUserCommand({ UserPoolId: poolId, Username: email }));
    await cognito.send(new AdminUserGlobalSignOutCommand({ UserPoolId: poolId, Username: email }));
  }
  return { email, enabled: Boolean(args.enabled) };
}

async function resendInvitation(args: Args) {
  const email = normalizeEmail(args.email);
  const poolId = requirePoolId();
  const user = await cognito.send(new AdminGetUserCommand({ UserPoolId: poolId, Username: email }));
  if (user.UserStatus !== 'FORCE_CHANGE_PASSWORD') {
    throw new UserFacingError('This user has already activated their account. Ask them to use "Forgot password" instead.');
  }
  await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: poolId,
      Username: email,
      MessageAction: 'RESEND',
      DesiredDeliveryMediums: ['EMAIL'],
    })
  );
  return { email, resent: true };
}

async function deleteUser(identity: CallerIdentity, args: Args) {
  const email = normalizeEmail(args.email);
  assertNotSelf(identity, email, 'delete');
  await cognito.send(new AdminDeleteUserCommand({ UserPoolId: requirePoolId(), Username: email }));
  return { email, deleted: true };
}

export const handler = async (event: AmplifyFunctionEvent) => {
  const identity = assertAdmin(event.identity as CallerIdentity | null);
  const args = event.arguments ?? {};
  const field = event.fieldName ?? event.info?.fieldName ?? '';
  console.log(JSON.stringify({ operation: field, actor: callerEmail(identity), target: args.email ?? null }));

  try {
    switch (field) {
      case 'inviteUser':
        return await inviteUser(args);
      case 'listUsers':
        return await listUsers();
      case 'updateUser':
        return await updateUser(identity, args);
      case 'setUserEnabled':
        return await setUserEnabled(identity, args);
      case 'resendInvitation':
        return await resendInvitation(args);
      case 'deleteUser':
        return await deleteUser(identity, args);
      default:
        throw new UserFacingError(`Unsupported operation ${field}.`);
    }
  } catch (error) {
    if (error instanceof UserFacingError) throw error;
    const name = (error as Error).name;
    if (name === 'UserNotFoundException') throw new Error('That user no longer exists.');
    console.error(`user-admin ${field} failed`, error);
    throw new Error(`The identity service could not complete ${field}: ${(error as Error).message}`);
  }
};
