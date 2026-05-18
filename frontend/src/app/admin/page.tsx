"use client";

import dynamic from "next/dynamic";
import { useCachedGet } from "@/hooks/use-cached-get";
import { StatCards } from "@/components/dashboard/stat-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AdminDashboardChart = dynamic(
  () => import("@/components/dashboard/admin-dashboard-chart").then((m) => m.AdminDashboardChart),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

type Stats = {
  totalTrainers: number;
  totalClients: number;
  activeClients: number;
  todayAttendance: number;
  expiringMemberships: number;
  totalSessionsCompleted: number;
};

export default function AdminDashboardPage() {
  const { data: stats, loading } = useCachedGet<Stats>("/dashboard/admin", 60_000);

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const chartData = [
    { name: "Trainers", value: stats.totalTrainers },
    { name: "Clients", value: stats.totalClients },
    { name: "Active", value: stats.activeClients },
    { name: "Today", value: stats.todayAttendance },
    { name: "Sessions", value: stats.totalSessionsCompleted },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Command overview</h1>
        <p className="text-sm text-muted-foreground">Enterprise-grade telemetry across trainers, clients, and accountability.</p>
      </div>

      <StatCards
        items={[
          { label: "Total trainers", value: stats.totalTrainers },
          { label: "Total clients", value: stats.totalClients },
          { label: "Active memberships", value: stats.activeClients },
          { label: "Today's attendance logs", value: stats.todayAttendance },
          {
            label: "Membership renewals (14d)",
            value: stats.expiringMemberships,
            hint: "Clients nearing expiry window",
          },
          { label: "Lifetime sessions completed", value: stats.totalSessionsCompleted },
        ]}
      />

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Operational pulse</CardTitle>
        </CardHeader>
        <CardContent className="h-56 sm:h-72">
          <AdminDashboardChart chartData={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}
