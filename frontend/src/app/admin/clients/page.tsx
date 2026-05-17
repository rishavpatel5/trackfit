"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ClientRow = {
  id: string;
  membershipEnd: string | null;
  goal: string | null;
  user: { email: string; firstName: string; lastName: string };
  trainer: { user: { firstName: string; lastName: string } };
};

type TrainerMini = { id: string; user: { firstName: string; lastName: string } };

export default function AdminClientsPage() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [trainers, setTrainers] = useState<TrainerMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    trainerId: "",
    goal: "",
    totalSessions: 24,
  });

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
        api.get<{ data: ClientRow[] }>("/clients?pageSize=100"),
        api.get<{ data: TrainerMini[] }>("/trainers?pageSize=100"),
      ]);
      setRows(clientsRes.data.data);
      setTrainers(trainersRes.data.data);
      if (!form.trainerId && trainersRes.data.data[0]) {
        setForm((f) => ({ ...f, trainerId: trainersRes.data.data[0].id }));
      }
    } catch {
      toast.error("Unable to load clients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/clients", form);
      toast.success("Client onboarded");
      setOpen(false);
      load();
    } catch {
      toast.error("Unable to create client");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground">Assign coaching lanes, extend memberships, orchestrate transformations.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add client</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New client</DialogTitle>
            </DialogHeader>
            <form className="space-y-3" onSubmit={createClient}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>First name</Label>
                  <Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div>
                  <Label>Last name</Label>
                  <Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Temporary password</Label>
                <Input required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div>
                <Label>Trainer</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-muted/40 px-3 text-sm"
                  value={form.trainerId}
                  onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
                >
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user.firstName} {t.user.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Goal</Label>
                <Input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
              </div>
              <div>
                <Label>Total sessions</Label>
                <Input
                  type="number"
                  value={form.totalSessions}
                  onChange={(e) => setForm({ ...form, totalSessions: Number(e.target.value) })}
                />
              </div>
              <Button type="submit" className="w-full">
                Create
              </Button>
            </form>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Athlete</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Membership end</TableHead>
                  <TableHead className="text-right">Profile</TableHead>
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
                      {c.trainer.user.firstName} {c.trainer.user.lastName}
                    </TableCell>
                    <TableCell>{c.membershipEnd ? new Date(c.membershipEnd).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/clients/${c.id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
