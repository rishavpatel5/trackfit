"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ClientMini = { id: string; user: { firstName: string; lastName: string } };

export default function TrainerAttendancePage() {
  const [clients, setClients] = useState<ClientMini[]>([]);
  const [clientId, setClientId] = useState("");
  const [session, setSession] = useState<{
    pin: string;
    verifyUrl: string;
    expiresAt: string;
    qrDataUrl?: string;
  } | null>(null);

  useEffect(() => {
    api.get<{ data: ClientMini[] }>("/clients?pageSize=100").then((res) => {
      setClients(res.data.data);
      if (res.data.data[0]) setClientId(res.data.data[0].id);
    });
  }, []);

  async function start() {
    if (!clientId) return;
    try {
      const { data } = await api.post<{ pin: string; verifyUrl: string; expiresAt: string; qrDataUrl: string }>(
        "/attendance/sessions/start",
        { clientId },
      );
      setSession({ pin: data.pin, verifyUrl: data.verifyUrl, expiresAt: data.expiresAt });
      toast.success("Session PIN minted — instruct athlete to verify");
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast.error(msg ?? "Unable to start session");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Attendance orchestration</h1>
        <p className="text-sm text-muted-foreground">Issue ephemeral PIN + QR credentials — clients attest presence securely.</p>
      </div>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Start verified session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <select
            className="flex h-10 w-full max-w-md rounded-md border border-border bg-muted/40 px-3 text-sm"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.user.firstName} {c.user.lastName}
              </option>
            ))}
          </select>
          <Button onClick={start}>Generate PIN & QR</Button>
        </CardContent>
      </Card>

      {session ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
            <CardHeader>
              <CardTitle>PIN · expires {new Date(session.expiresAt).toLocaleTimeString()}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-5xl font-black tracking-[0.3em] text-primary">{session.pin}</div>
              <Badge variant="outline">Share verbally or via secure channel</Badge>
            </CardContent>
          </Card>
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>QR attestation</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="rounded-2xl bg-white p-4">
                <QRCodeSVG value={session.verifyUrl} size={200} />
              </div>
              <p className="text-center text-xs text-muted-foreground break-all">{session.verifyUrl}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
