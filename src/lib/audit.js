import { client, hasModel } from "./amplify";

let actor = { email: "", role: "" };

/** Called by AuthContext whenever the signed-in user changes. */
export function setAuditActor(next) {
  actor = { email: next?.email ?? "", role: next?.role ?? "" };
}

/**
 * Appends an entry to the immutable audit trail. AppSync stamps the `owner`
 * field with the caller's identity, so the actor cannot be spoofed. Auditing
 * must never break the user's workflow, so failures are only logged.
 */
export async function audit(action, category, summary, targetId) {
  if (!hasModel("AuditLog")) return;
  try {
    await client.models.AuditLog.create({
      action,
      category,
      summary,
      targetId: targetId ?? null,
      actorEmail: actor.email,
      actorRole: actor.role,
    });
  } catch (error) {
    console.warn("Audit event could not be recorded:", error);
  }
}

export const AUDIT_CATEGORIES = {
  AUTH: "Authentication",
  USER: "User management",
  APPOINTMENT: "Appointments",
  RECORD: "Clinical records",
};
