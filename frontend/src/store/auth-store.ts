"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "ADMIN" | "TRAINER" | "CLIENT";

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  trainerId?: string;
  clientId?: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: "gvtrainer-auth" },
  ),
);
