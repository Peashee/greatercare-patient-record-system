import { client, hasModel, operation, parseJson, unwrap } from "./amplify";
import { audit } from "./audit";
import { ROLES } from "./rbac";

const PROFILE_FIELDS = [
  "phone",
  "specialty",
  "department",
  "licenseNumber",
  "dateOfBirth",
  "gender",
  "bloodGroup",
  "allergies",
  "address",
  "emergencyContact",
];

function cleanProfile(values) {
  const profile = {
    email: values.email.trim().toLowerCase(),
    givenName: values.givenName.trim(),
    familyName: values.familyName.trim(),
    role: values.role,
  };
  for (const field of PROFILE_FIELDS) {
    const value = typeof values[field] === "string" ? values[field].trim() : values[field];
    profile[field] = value ? value : null;
  }
  return profile;
}

/** Cognito status → product language. */
export function accountState(user) {
  if (!user) return { key: "UNKNOWN", label: "No login" };
  if (user.enabled === false) return { key: "DISABLED", label: "Deactivated" };
  if (user.status === "FORCE_CHANGE_PASSWORD") return { key: "INVITED", label: "Invitation pending" };
  if (user.status === "RESET_REQUIRED") return { key: "INVITED", label: "Reset required" };
  if (user.status === "CONFIRMED") return { key: "ACTIVE", label: "Active" };
  return { key: "PENDING", label: user.status };
}

/** Joins Cognito accounts with their GreaterCare profiles by email. */
export function mergeDirectory(cognitoUsers = [], profiles = []) {
  const byEmail = new Map(profiles.map((profile) => [profile.email.toLowerCase(), profile]));
  const merged = cognitoUsers.map((account) => {
    const profile = byEmail.get(account.email);
    byEmail.delete(account.email);
    return {
      ...profile,
      ...account,
      givenName: profile?.givenName || account.givenName,
      familyName: profile?.familyName || account.familyName,
      account,
      profile,
    };
  });
  // Profiles whose login no longer exists (e.g. deleted directly in Cognito).
  for (const profile of byEmail.values()) {
    merged.push({ ...profile, account: null, profile });
  }
  return merged;
}

/**
 * Provisioning flow:
 *   1. Lambda creates the Cognito user → Cognito emails the branded invitation
 *   2. Lambda places the user in exactly one role group
 *   3. The portal stores the person's profile (demographics / clinical details)
 *   4. The action is written to the audit trail
 */
export async function provisionUser(values, invitedBy) {
  const profile = cleanProfile(values);
  const created = parseJson(
    unwrap(
      await operation("mutations", "inviteUser")({
        email: profile.email,
        givenName: profile.givenName,
        familyName: profile.familyName,
        role: profile.role,
      })
    )
  );
  if (hasModel("UserProfile")) {
    unwrap(await client.models.UserProfile.create({ ...profile, invitedBy }));
  }
  await audit(
    "USER_INVITED",
    "USER",
    `Provisioned ${profile.givenName} ${profile.familyName} (${profile.email}) as ${ROLES[profile.role].label}`,
    profile.email
  );
  return created;
}

export async function saveUser(values, { previousRole } = {}) {
  const profile = cleanProfile(values);
  unwrap(
    await operation("mutations", "updateUser")({
      email: profile.email,
      givenName: profile.givenName,
      familyName: profile.familyName,
      role: profile.role,
    })
  );
  const existing = unwrap(await client.models.UserProfile.get({ email: profile.email }));
  unwrap(
    existing
      ? await client.models.UserProfile.update(profile)
      : await client.models.UserProfile.create(profile)
  );
  if (previousRole && previousRole !== profile.role) {
    await audit(
      "ROLE_CHANGED",
      "USER",
      `Changed ${profile.email} from ${ROLES[previousRole]?.label ?? previousRole} to ${ROLES[profile.role].label}`,
      profile.email
    );
  } else {
    await audit("USER_UPDATED", "USER", `Updated profile for ${profile.email}`, profile.email);
  }
}

export async function setUserEnabled(email, enabled) {
  unwrap(await operation("mutations", "setUserEnabled")({ email, enabled }));
  await audit(enabled ? "USER_ENABLED" : "USER_DISABLED", "USER", `${enabled ? "Reactivated" : "Deactivated"} ${email}`, email);
}

export async function resendInvitation(email) {
  unwrap(await operation("mutations", "resendInvitation")({ email }));
  await audit("INVITE_RESENT", "USER", `Re-sent invitation email to ${email}`, email);
}

export async function removeUser(email) {
  unwrap(await operation("mutations", "deleteUser")({ email }));
  if (hasModel("UserProfile")) {
    const result = await client.models.UserProfile.delete({ email });
    if (result.errors?.length) console.warn("Profile could not be removed:", result.errors);
  }
  await audit("USER_DELETED", "USER", `Deleted the account for ${email}`, email);
}
