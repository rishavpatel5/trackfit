"use client";

import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allow={["TRAINER"]}>
      <AppShell variant="trainer" title="Trainer workspace">
        {children}
      </AppShell>
    </RoleGate>
  );
}
