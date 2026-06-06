"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { cachedApiGet } from "@/lib/api-cache";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportsTabToolbar } from "@/components/clients/reports-tab-content";
import { AdminClientActions } from "@/components/clients/admin-client-actions";
import { formatDateIST } from "@/lib/datetime";

const ClientProgressTab = dynamic(
  () => import("@/components/clients/client-progress-tab").then((m) => ({ default: m.ClientProgressTab })),
  { loading: () => <Skeleton className="h-96 w-full" /> },
);

const DietPlanSection = dynamic(
  () => import("@/components/clients/plan-editors").then((m) => ({ default: m.DietPlanSection })),
  { loading: () => <Skeleton className="h-64 w-full" /> },
);

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
  showAdminActions = false,
  initialTab = "overview",
}: {
  clientId: string;
  canEdit: boolean;
  /** Renew / remove client — admin only */
  showAdminActions?: boolean;
  initialTab?: string;
}) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [tab, setTab] = useState(initialTab);

  const loadClient = useCallback(() => {
    cachedApiGet<ClientDetail>(`/clients/${clientId}`, 30_000)
      .then(setClient)
      .catch(() => toast.error("Unable to load profile"));
  }, [clientId]);

  useEffect(() => {
    setClient(null);
    loadClient();
  }, [loadClient]);

  if (!client) {
    return <Skeleton className="h-96 w-full" />;
  }

  const remaining = Math.max(client.totalSessions - client.sessionsCompleted, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Client dossier</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {client.user.firstName} {client.user.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{client.user.email}</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <Badge variant="success">{remaining} sessions remaining</Badge>
          {showAdminActions ? (
            <AdminClientActions
              clientId={client.id}
              clientName={`${client.user.firstName} ${client.user.lastName}`}
              membershipStart={client.membershipStart}
              membershipEnd={client.membershipEnd}
              totalSessions={client.totalSessions}
              size="default"
              onChanged={loadClient}
              redirectAfterRemove="/admin/clients"
            />
          ) : null}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="max-sm:flex-nowrap max-sm:gap-1 max-sm:overflow-x-auto max-sm:overscroll-x-contain max-sm:p-1 max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="overview" className="max-sm:snap-start max-sm:px-2.5 max-sm:text-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="attendance" className="max-sm:snap-start max-sm:px-2.5 max-sm:text-xs">
            Attendance
          </TabsTrigger>
          <TabsTrigger value="diet" className="max-sm:snap-start max-sm:px-2.5 max-sm:text-xs">
            Diet plan
          </TabsTrigger>
          <TabsTrigger value="progress" className="max-sm:snap-start max-sm:px-2.5 max-sm:text-xs">
            Progress
          </TabsTrigger>
          <TabsTrigger value="reports" className="max-sm:snap-start max-sm:px-2.5 max-sm:text-xs">
            Reports
          </TabsTrigger>
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
                    {formatDateIST(client.membershipStart)} → {formatDateIST(client.membershipEnd)}
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
          {tab === "attendance" ? <AttendanceTab clientId={clientId} /> : null}
        </TabsContent>

        <TabsContent value="diet">
          {tab === "diet" ? (
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
          ) : null}
        </TabsContent>

        <TabsContent value="progress">
          {tab === "progress" ? <ClientProgressTab clientId={clientId} canEdit={canEdit} /> : null}
        </TabsContent>

        <TabsContent value="reports">
          {tab === "reports" ? <ReportsTabToolbar clientId={clientId} canEdit={canEdit} /> : null}
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
      sessionCharged: boolean;
    }[]
  >([]);

  useEffect(() => {
    cachedApiGet<{ data: typeof rows }>(`/attendance?clientId=${clientId}&pageSize=40`, 30_000).then((res) =>
      setRows(res.data),
    );
  }, [clientId]);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Attendance ledger</CardTitle>
        <p className="text-sm text-muted-foreground">
          One row per gym calendar day (midnight–midnight). Past unverified days are marked client absent automatically.
        </p>
      </CardHeader>
      <CardContent>
        <div className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session day</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Attended</TableHead>
                <TableHead>Package charged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formatDateIST(r.sessionDate)}</TableCell>
                  <TableCell>{r.trainerStatus}</TableCell>
                  <TableCell>{r.clientStatus}</TableCell>
                  <TableCell>{r.sessionCompleted ? "Yes" : "No"}</TableCell>
                  <TableCell>{r.sessionCharged ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
