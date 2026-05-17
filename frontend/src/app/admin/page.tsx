"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { api } from "@/lib/api";
import { StatCards } from "@/components/dashboard/stat-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Stats = {
  totalTrainers: number;
  totalClients: number;
  activeClients: number;
  todayAttendance: number;
  expiringMemberships: number;
  totalSessionsCompleted: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<Stats>("/dashboard/admin").then((res) => setStats(res.data)).catch(() => setStats(null));
  }, []);

  if (!stats) {
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
    <div className="space-y-8">
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
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.15 }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  borderRadius: 12,
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
