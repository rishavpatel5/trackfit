"use client";

import Link from "next/link";
import { useCachedGet } from "@/hooks/use-cached-get";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCards } from "@/components/dashboard/stat-cards";
import { formatDateIST, formatTimeIST } from "@/lib/datetime";
import { Skeleton } from "@/components/ui/skeleton";

type Dashboard = {
  client: {
    membershipEnd: string | null;
    sessionsCompleted: number;
    totalSessions: number;
    goal: string | null;
  };
  membershipDaysRemaining: number | null;
  pendingVerification: { expiresAt: string } | null;
};

export default function ClientDashboardPage() {
  const { data, loading } = useCachedGet<Dashboard>("/dashboard/client", 60_000);

  if (loading || !data) return <Skeleton className="h-64 w-full" />;

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
            hint: data.client.membershipEnd ? `Ends ${formatDateIST(data.client.membershipEnd)}` : "",
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
              Your coach started a session — enter their six-digit PIN before{" "}
              {formatTimeIST(data.pendingVerification.expiresAt)} to verify.
            </p>
            <Button asChild>
              <Link href="/client/verify-attendance">Enter PIN to verify</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
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
