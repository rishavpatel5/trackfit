"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cachedApiGet, invalidateApiCache } from "@/lib/api-cache";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientBasicEditButton, type EditableClientBasics } from "@/components/clients/client-basic-edit-button";
import {
  NewClientForm,
  buildCreateClientPayload,
  defaultNewClientForm,
  type NewClientFormState,
} from "@/components/clients/new-client-form";

type Row = {
  id: string;
  goal: string | null;
  medicalNotes: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  age: number | null;
  gender: string | null;
  user: { firstName: string; lastName: string; email: string; phone: string | null };
};

export default function TrainerClientsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewClientFormState>(() => defaultNewClientForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await cachedApiGet<{ data: Row[] }>("/clients?pageSize=100", 60_000);
      setRows(res.data);
    } catch {
      toast.error("Unable to load clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/clients", buildCreateClientPayload(form, { omitTrainerId: true }));
      toast.success("Client onboarded");
      setOpen(false);
      setForm(defaultNewClientForm());
      invalidateApiCache("/clients");
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
          <h1 className="text-2xl font-semibold">My athletes</h1>
          <p className="text-sm text-muted-foreground">Precision coaching lanes · immutable programming history.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add client</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[92vh] max-w-2xl sm:max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Client Digital Onboarding</DialogTitle>
            </DialogHeader>
            <NewClientForm form={form} setForm={setForm} trainers={[]} onSubmit={createClient} hideTrainerPicker />
          </DialogContent>
        </Dialog>
      </div>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Roster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <Skeleton className="h-40 w-full" /> : null}
          {rows.map((c) => (
            <div key={c.id} className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-lg font-semibold">
                  {c.user.firstName} {c.user.lastName}
                </div>
                <div className="text-sm text-muted-foreground">{c.user.email}</div>
                <div className="text-xs text-primary">{c.goal}</div>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <ClientBasicEditButton client={c as EditableClientBasics} onChanged={load} />
                <Button asChild>
                  <Link href={`/trainer/clients/${c.id}`}>Open transformation workspace</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
