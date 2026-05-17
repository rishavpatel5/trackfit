"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCards } from "@/components/dashboard/stat-cards";
import { Skeleton } from "@/components/ui/skeleton";

type Dashboard = {
  client: {
    membershipEnd: string | null;
    sessionsCompleted: number;
    totalSessions: number;
    goal: string | null;
  };
  membershipDaysRemaining: number | null;
  pendingVerification: { verifyToken: string; expiresAt: string } | null;
};

export default function ClientDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    api.get<Dashboard>("/dashboard/client").then((res) => setData(res.data));
  }, []);

  if (!data) return <Skeleton className="h-64 w-full" />;

  const remaining = Math.max(data.client.totalSessions - data.client.sessionsCompleted, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Transformation cockpit</h1>
        <p className="text-sm text-muted-foreground">{data.client.goal}</p>
      </div>

      <StatCards
        items={[
          { label: "Sessions remaining", value: remaining },
          { label: "Sessions completed", value: data.client.sessionsCompleted },
          {
            label: "Membership runway",
            value: data.membershipDaysRemaining ?? "—",
            hint: data.client.membershipEnd ? `Ends ${new Date(data.client.membershipEnd).toLocaleDateString()}` : "",
          },
        ]}
      />

      {data.pendingVerification ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle>Session awaiting verification</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">
              Your coach started a session — confirm before {new Date(data.pendingVerification.expiresAt).toLocaleTimeString()}.
            </p>
            <Button asChild>
              <Link href={`/client/verify-attendance?token=${data.pendingVerification.verifyToken}`}>Verify now</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Button asChild variant="outline" className="h-auto flex-col gap-2 py-6 border-border">
          <Link href="/client/workouts">Workouts</Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-2 py-6 border-border">
          <Link href="/client/diet">Nutrition</Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-2 py-6 border-border">
          <Link href="/client/progress">Progress</Link>
        </Button>
      </div>
    </div>
  );
}
