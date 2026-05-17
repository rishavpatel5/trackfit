"use client";

import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allow={["CLIENT"]}>
      <AppShell variant="client" title="Athlete lounge">
        {children}
      </AppShell>
    </RoleGate>
  );
}
