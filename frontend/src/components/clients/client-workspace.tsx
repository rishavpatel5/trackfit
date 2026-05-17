"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClientProgressTab } from "@/components/clients/client-progress-tab";
import { DietPlanSection, WorkoutPlanSection } from "@/components/clients/plan-editors";
import { ReportsTabToolbar } from "@/components/clients/reports-tab-content";

type ClientDetail = {
  id: string;
  goal: string | null;
  medicalNotes: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  age: number | null;
  gender: string | null;
  membershipStart: string | null;
  membershipEnd: string | null;
  totalSessions: number;
  sessionsCompleted: number;
  user: { email: string; phone: string | null; firstName: string; lastName: string };
  trainer: { user: { firstName: string; lastName: string } };
};

export function ClientWorkspace({
  clientId,
  canEdit,
  initialTab = "overview",
}: {
  clientId: string;
  canEdit: boolean;
  initialTab?: string;
}) {
  const [client, setClient] = useState<ClientDetail | null>(null);

  useEffect(() => {
    api
      .get<ClientDetail>(`/clients/${clientId}`)
      .then((res) => setClient(res.data))
      .catch(() => toast.error("Unable to load profile"));
  }, [clientId]);

  if (!client) {
    return <Skeleton className="h-96 w-full" />;
  }

  const remaining = Math.max(client.totalSessions - client.sessionsCompleted, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Client dossier</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {client.user.firstName} {client.user.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{client.user.email}</p>
        </div>
        <Badge variant="success">{remaining} sessions remaining</Badge>
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="workouts">Workout plan</TabsTrigger>
          <TabsTrigger value="diet">Diet plan</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border/70 lg:col-span-2">
              <CardHeader>
                <CardTitle>Membership intelligence</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Coach</p>
                  <p className="text-lg font-semibold">
                    {client.trainer.user.firstName} {client.trainer.user.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Goal</p>
                  <p>{client.goal ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Membership window</p>
                  <p>
                    {client.membershipStart ? new Date(client.membershipStart).toLocaleDateString() : "—"} →{" "}
                    {client.membershipEnd ? new Date(client.membershipEnd).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sessions</p>
                  <p>
                    {client.sessionsCompleted} completed · {remaining} remaining · {client.totalSessions} allocated
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Medical notes</p>
                  <p className="text-muted-foreground">{client.medicalNotes ?? "No notes captured."}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>Emergency</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Contact</p>
                  <p>{client.emergencyContact ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p>{client.emergencyPhone ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Athlete metrics</p>
                  <p>
                    Age {client.age ?? "—"} · {client.gender ?? "Gender N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceTab clientId={clientId} />
        </TabsContent>

        <TabsContent value="workouts">
          <Card className="border-border/70">
            <CardHeader>
              <div className="space-y-1">
                <CardTitle>Periodized resistance roadmap</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Build mesocycles from scratch — add days, prescribe loading parameters, revise anytime. Weeks stay on record (trainers cannot
                  delete locked history; admins can intervene if corrections are mandatory).
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <WorkoutPlanSection clientId={clientId} canEdit={canEdit} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diet">
          <Card className="border-border/70">
            <CardHeader>
              <div className="space-y-1">
                <CardTitle>Nutrition architecture</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Engineer meal-by-meal prescriptions with automatic macro rollup per day inside each week accordion.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <DietPlanSection clientId={clientId} canEdit={canEdit} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress">
          <ClientProgressTab clientId={clientId} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTabToolbar clientId={clientId} canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AttendanceTab({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<
    {
      id: string;
      sessionDate: string;
      trainerStatus: string;
      clientStatus: string;
      sessionCompleted: boolean;
    }[]
  >([]);

  useEffect(() => {
    api.get<{ data: typeof rows }>(`/attendance?clientId=${clientId}&pageSize=40`).then((res) => setRows(res.data.data));
  }, [clientId]);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Attendance ledger</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session day</TableHead>
              <TableHead>Trainer</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Complete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{new Date(r.sessionDate).toLocaleDateString()}</TableCell>
                <TableCell>{r.trainerStatus}</TableCell>
                <TableCell>{r.clientStatus}</TableCell>
                <TableCell>{r.sessionCompleted ? "Yes" : "No"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
