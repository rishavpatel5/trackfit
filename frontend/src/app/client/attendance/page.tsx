"use client";

import { ClientWorkspace } from "@/components/clients/client-workspace";
import { useAuthStore } from "@/store/auth-store";

export default function ClientAttendancePage() {
  const clientId = useAuthStore((s) => s.user?.clientId);
  if (!clientId) return null;
  return <ClientWorkspace clientId={clientId} canEdit={false} initialTab="attendance" />;
}
