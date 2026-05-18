"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cachedApiGet } from "@/lib/api-cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { formatTimeIST } from "@/lib/datetime";

type ClientMini = { id: string; user: { firstName: string; lastName: string } };

type TodaySession = {
  attendanceId: string;
  pin: string;
  verifyUrl: string;
  expiresAt: string;
};

type TrainerDayStatus = "PRESENT" | "ABSENT" | "RESCHEDULED";

const AttendanceQrCode = dynamic(
  () => import("qrcode.react").then((m) => m.QRCodeSVG),
  { ssr: false, loading: () => <div className="h-[200px] w-[200px] animate-pulse rounded-2xl bg-muted" /> },
);

export default function TrainerAttendancePage() {
  const [clients, setClients] = useState<ClientMini[]>([]);
  const [clientId, setClientId] = useState("");
  const [trainerDayStatus, setTrainerDayStatus] = useState<TrainerDayStatus>("PRESENT");
  const [session, setSession] = useState<TodaySession | null>(null);
  const [trainerAbsentNotice, setTrainerAbsentNotice] = useState<string | null>(null);

  useEffect(() => {
    cachedApiGet<{ data: ClientMini[] }>("/clients?pageSize=100", 60_000).then((res) => {
      setClients(res.data);
      if (res.data[0]) setClientId(res.data[0].id);
    });
  }, []);

  async function start() {
    if (!clientId) return;
    setTrainerAbsentNotice(null);
    setSession(null);
    try {
      const { data } = await api.post<{
        pin?: string;
        verifyUrl?: string;
        expiresAt?: string;
        attendanceId: string;
        trainerAbsent?: boolean;
        refreshed?: boolean;
        message?: string;
      }>("/attendance/sessions/start", { clientId, trainerStatus: trainerDayStatus });

      if (data.refreshed) {
        toast.message(data.message ?? "New PIN issued for today");
      }

      if (data.trainerAbsent) {
        setTrainerAbsentNotice(data.message ?? "Trainer absent — client package not charged for today.");
        toast.success("Day logged — no package charge");
        return;
      }

      if (!data.pin || !data.verifyUrl || !data.expiresAt) {
        toast.error("Unexpected response from server");
        return;
      }

      setSession({
        attendanceId: data.attendanceId,
        pin: data.pin,
        verifyUrl: data.verifyUrl,
        expiresAt: data.expiresAt,
      });
      toast.success("Today's session started — share PIN with athlete");
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast.error(msg ?? "Unable to start session");
    }
  }

  async function markClientAbsent() {
    if (!session?.attendanceId) return;
    try {
      await api.post(`/attendance/sessions/${session.attendanceId}/mark-client-absent`);
      toast.success("Client marked absent — session counts against their package");
      setSession(null);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast.error(msg ?? "Could not update attendance");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Attendance orchestration</h1>
        <p className="text-sm text-muted-foreground">
          One session per calendar day (midnight to midnight in gym time — not a 24-hour gap). Yesterday 7pm and today 7am
          are separate days. Unverified past days auto-mark client absent.
        </p>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Today&apos;s session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Client</Label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-muted/40 px-3 text-sm"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.user.firstName} {c.user.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Your attendance today</Label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-muted/40 px-3 text-sm"
                value={trainerDayStatus}
                onChange={(e) => setTrainerDayStatus(e.target.value as TrainerDayStatus)}
              >
                <option value="PRESENT">Present — normal session</option>
                <option value="ABSENT">Absent — client package not charged</option>
                <option value="RESCHEDULED">Rescheduled — client package not charged</option>
              </select>
            </div>
          </div>
          <Button onClick={start}>Log today&apos;s session</Button>
          {trainerAbsentNotice ? (
            <p className="rounded-md border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
              {trainerAbsentNotice}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {session ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
            <CardHeader>
              <CardTitle>PIN · valid until {formatTimeIST(session.expiresAt)} IST today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-5xl font-black tracking-[0.3em] text-primary">{session.pin}</div>
              <Badge variant="outline">Client must enter this PIN — no auto check-in</Badge>
              <Button type="button" variant="destructive" className="w-full" onClick={markClientAbsent}>
                Mark client absent (charges their package)
              </Button>
            </CardContent>
          </Card>
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>QR — opens verify page only</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="rounded-2xl bg-white p-4">
                <AttendanceQrCode value={session.verifyUrl} size={200} />
              </div>
              <p className="text-center text-xs text-muted-foreground break-all">{session.verifyUrl}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
