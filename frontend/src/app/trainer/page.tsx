"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StatCards } from "@/components/dashboard/stat-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Dashboard = {
  assignedClients: number;
  todaySessions: number;
  pendingAttendance: number;
  upcomingMembershipExpiry: number;
  recentMeasurements: {
    recordedAt: string;
    weight: number | null;
    bodyFat: number | null;
    client: { user: { firstName: string; lastName: string } };
  }[];
};

export default function TrainerDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    api.get<Dashboard>("/dashboard/trainer").then((res) => setData(res.data));
  }, []);

  if (!data) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Floor intelligence</h1>
        <p className="text-sm text-muted-foreground">Session density, accountability, and recovery signals.</p>
      </div>
      <StatCards
        items={[
          { label: "Assigned athletes", value: data.assignedClients },
          { label: "Today's sessions", value: data.todaySessions },
          { label: "Pending client verifications", value: data.pendingAttendance },
          { label: "Membership renewals (14d)", value: data.upcomingMembershipExpiry },
        ]}
      />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Latest measurements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {data.recentMeasurements.length === 0 ? <p className="text-muted-foreground">No fresh biometrics.</p> : null}
          {data.recentMeasurements.map((m) => (
            <div key={m.recordedAt + m.client.user.firstName} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                {m.client.user.firstName} {m.client.user.lastName}
              </div>
              <div className="text-muted-foreground">
                {m.weight ? `${m.weight} kg` : "—"} · BF {m.bodyFat ?? "—"}%
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
