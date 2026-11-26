import { useCallback, useEffect, useState } from "react";
import { client, hasModel, listAll, operation, parseJson, unwrap } from "../lib/amplify";
import { appointmentDateTime } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "./useAsync";

const byDateTime = (a, b) => appointmentDateTime(a) - appointmentDateTime(b);
const newestFirst = (a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0);

/**
 * Appointments visible to the current user. AppSync returns only what the
 * caller's role permits. Staff get a live subscription (observeQuery) so the
 * appointment desk updates in real time when patients book or colleagues
 * claim visits.
 */
export function useAppointments() {
  const { role } = useAuth();
  const [state, setState] = useState({ items: [], loading: true, error: null, live: false });

  const reload = useCallback(async () => {
    try {
      const items = await listAll(client.models.Appointment);
      setState((current) => ({ ...current, items: items.sort(byDateTime), loading: false, error: null }));
    } catch (error) {
      console.error("Could not load appointments:", error);
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, []);

  useEffect(() => {
    if (role === "PATIENTS" || !role) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      reload();
      return undefined;
    }
    const subscription = client.models.Appointment.observeQuery().subscribe({
      next: ({ items, isSynced }) => {
        setState({ items: [...items].sort(byDateTime), loading: !isSynced && items.length === 0, error: null, live: true });
      },
      error: (error) => {
        console.warn("Live updates unavailable, falling back to polling:", error);
        setState((current) => ({ ...current, live: false }));
        reload();
      },
    });
    return () => subscription.unsubscribe();
  }, [role, reload]);

  return { ...state, reload };
}

export function useRecords() {
  return useAsync(async () => (await listAll(client.models.PatientRecord)).sort(newestFirst), []);
}

/** User profiles (staff see everyone, patients see only themselves). */
export function useProfiles() {
  return useAsync(async () => {
    if (!hasModel("UserProfile")) return [];
    return listAll(client.models.UserProfile);
  }, []);
}

/** Cognito directory — administrators only. */
export function useDirectoryUsers() {
  return useAsync(async () => {
    const result = await operation("queries", "listUsers")();
    return parseJson(unwrap(result)) ?? [];
  }, []);
}

export function useAuditLog() {
  return useAsync(async () => {
    if (!hasModel("AuditLog")) return [];
    return (await listAll(client.models.AuditLog)).sort(newestFirst);
  }, []);
}
