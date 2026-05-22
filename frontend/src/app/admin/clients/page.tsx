"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cachedApiGet } from "@/lib/api-cache";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminClientActions } from "@/components/clients/admin-client-actions";
import { formatDateIST } from "@/lib/datetime";
import {
  NewClientForm,
  buildCreateClientPayload,
  defaultNewClientForm,
  type NewClientFormState,
  type TrainerMini,
} from "@/components/clients/new-client-form";

type ClientRow = {
  id: string;
  membershipStart: string | null;
  membershipEnd: string | null;
  totalSessions: number;
  goal: string | null;
  user: { email: string; firstName: string; lastName: string };
  trainer: { user: { firstName: string; lastName: string } };
};

export default function AdminClientsPage() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [trainers, setTrainers] = useState<TrainerMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<NewClientFormState>(() => defaultNewClientForm());

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (c) =>
        c.user.email.toLowerCase().includes(q) ||
        `${c.user.firstName} ${c.user.lastName}`.toLowerCase().includes(q),
    );
  }, [rows, search]);

  async function load() {
    setLoading(true);
    try {
      const [clientsRes, trainersRes] = await Promise.all([
        cachedApiGet<{ data: ClientRow[] }>("/clients?pageSize=100", 60_000),
        cachedApiGet<{ data: TrainerMini[] }>("/trainers?pageSize=100", 60_000),
      ]);
      setRows(clientsRes.data);
      setTrainers(trainersRes.data);
      const firstTrainer = trainersRes.data[0]?.id ?? "";
      setForm((f) => (f.trainerId ? f : { ...f, trainerId: firstTrainer }));
    } catch {
      toast.error("Unable to load clients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/clients", buildCreateClientPayload(form));
      toast.success("Client onboarded");
      setOpen(false);
      setForm(defaultNewClientForm(trainers[0]?.id ?? ""));
      load();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast.error(msg ?? "Unable to create client");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground">Full profiles aligned with the dossier overview — membership dates from session count.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add client</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New client</DialogTitle>
            </DialogHeader>
            <NewClientForm form={form} setForm={setForm} trainers={trainers} onSubmit={createClient} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/70">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Clients</CardTitle>
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Athlete</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Membership</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">
                        {c.user.firstName} {c.user.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">{c.user.email}</div>
                    </TableCell>
                    <TableCell>
                      {c.trainer?.user
                        ? `${c.trainer.user.firstName} ${c.trainer.user.lastName}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateIST(c.membershipStart)} → {formatDateIST(c.membershipEnd)}
                    </TableCell>
                    <TableCell>{c.totalSessions}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-2">
                        <AdminClientActions
                          clientId={c.id}
                          clientName={`${c.user.firstName} ${c.user.lastName}`}
                          membershipStart={c.membershipStart}
                          membershipEnd={c.membershipEnd}
                          totalSessions={c.totalSessions}
                          onChanged={load}
                          redirectAfterRemove="/admin/clients"
                        />
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/clients/${c.id}`}>Open profile</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
