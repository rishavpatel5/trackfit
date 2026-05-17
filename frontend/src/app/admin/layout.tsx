"use client";

import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allow={["ADMIN"]}>
      <AppShell variant="admin" title="Admin console">
        {children}
      </AppShell>
    </RoleGate>
  );
}
