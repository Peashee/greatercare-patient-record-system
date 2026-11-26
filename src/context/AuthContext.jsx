import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Hub } from "aws-amplify/utils";
import { fetchAuthSession, getCurrentUser, signOut as amplifySignOut } from "aws-amplify/auth";
import { client, hasModel } from "../lib/amplify";
import { audit, setAuditActor } from "../lib/audit";
import { resolveRole } from "../lib/rbac";
import { fullName } from "../lib/format";

const AuthContext = createContext(null);

async function readSession({ forceRefresh = false } = {}) {
  await getCurrentUser();
  const session = await fetchAuthSession({ forceRefresh });
  const idPayload = session.tokens?.idToken?.payload ?? {};
  const groups = session.tokens?.accessToken?.payload?.["cognito:groups"] ?? [];
  const email = String(idPayload.email ?? "").toLowerCase();
  return {
    sub: String(idPayload.sub ?? ""),
    email,
    groups,
    role: resolveRole(groups),
    givenName: String(idPayload.given_name ?? ""),
    familyName: String(idPayload.family_name ?? ""),
    authTime: idPayload.auth_time ? new Date(Number(idPayload.auth_time) * 1000) : null,
    expiresAt: idPayload.exp ? new Date(Number(idPayload.exp) * 1000) : null,
  };
}

async function readProfile(email) {
  if (!email || !hasModel("UserProfile")) return null;
  try {
    const { data } = await client.models.UserProfile.get({ email });
    return data ?? null;
  } catch (error) {
    console.warn("Profile could not be loaded:", error);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const load = useCallback(async (options) => {
    try {
      const sessionUser = await readSession(options);
      setUser(sessionUser);
      setAuditActor(sessionUser);
      setProfile(await readProfile(sessionUser.email));
      setStatus("signedIn");
      return sessionUser;
    } catch {
      setUser(null);
      setProfile(null);
      setAuditActor(null);
      setStatus("signedOut");
      return null;
    }
  }, []);

  useEffect(() => {
    load({ forceRefresh: true });
    return Hub.listen("auth", ({ payload }) => {
      switch (payload.event) {
        case "signedIn":
          load({ forceRefresh: true });
          break;
        case "signedOut":
        case "tokenRefresh_failure":
          setUser(null);
          setProfile(null);
          setAuditActor(null);
          setStatus("signedOut");
          break;
        default:
          break;
      }
    });
  }, [load]);

  const signOut = useCallback(async ({ global = false, reason } = {}) => {
    await audit("SIGN_OUT", "AUTH", reason ?? "Signed out");
    await amplifySignOut({ global });
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.email) setProfile(await readProfile(user.email));
  }, [user]);

  const value = useMemo(() => {
    const displayName =
      fullName(profile) || fullName(user) || user?.email?.split("@")[0] || "there";
    return {
      status,
      user,
      profile,
      role: user?.role ?? null,
      displayName,
      firstName: profile?.givenName || user?.givenName || displayName.split(" ")[0],
      reload: load,
      refreshProfile,
      signOut,
    };
  }, [status, user, profile, load, refreshProfile, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
