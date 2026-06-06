"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { useAuthHydrated } from "@/hooks/use-auth-hydrated";
import { useAuthStore, type AuthUser } from "@/store/auth-store";

/**
 * Validates persisted JWT on startup and refreshes user profile from the backend.
 * Does not block rendering — RoleGate handles route protection after hydration.
 */
export function AuthBootstrap() {
  const hydrated = useAuthHydrated();
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!hydrated || !token) return;

    let cancelled = false;

    api
      .get<AuthUser & { active?: boolean }>("/auth/me")
      .then(({ data }) => {
        if (cancelled) return;
        if (data.active === false) {
          logout();
          return;
        }
        setAuth(token, {
          id: data.id,
          email: data.email,
          role: data.role,
          firstName: data.firstName,
          lastName: data.lastName,
          trainerId: data.trainerId,
          clientId: data.clientId,
        });
      })
      .catch(() => {
        if (!cancelled) logout();
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, token, setAuth, logout]);

  return null;
}
