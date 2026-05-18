"use client";

import { useParams } from "next/navigation";
import { ClientWorkspace } from "@/components/clients/client-workspace";

export default function AdminClientDetailPage() {
  const params = useParams();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  if (!clientId) return null;
  return <ClientWorkspace clientId={clientId} canEdit showAdminActions />;
}
