"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TrainerRow = {
  id: string;
  bio: string | null;
  specialization: string | null;
  user: { email: string; firstName: string; lastName: string; active: boolean; phone: string | null };
  _count?: { clients: number };
};

export default function AdminTrainersPage() {
  const [rows, setRows] = useState<TrainerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    specialization: "",
    bio: "",
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (t) =>
        t.user.email.toLowerCase().includes(q) ||
        t.user.firstName.toLowerCase().includes(q) ||
        t.user.lastName.toLowerCase().includes(q),
    );
  }, [rows, search]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<{ data: TrainerRow[] }>("/trainers?pageSize=100");
      setRows(data.data);
    } catch {
      toast.error("Unable to load trainers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createTrainer(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/trainers", form);
      toast.success("Trainer provisioned");
      setOpen(false);
      setForm({ email: "", password: "", firstName: "", lastName: "", phone: "", specialization: "", bio: "" });
      load();
    } catch {
      toast.error("Unable to create trainer");
    }
  }

  async function toggleActive(trainer: TrainerRow, active: boolean) {
    try {
      await api.patch(`/trainers/${trainer.id}`, { active });
      toast.success(active ? "Trainer activated" : "Trainer deactivated");
      load();
    } catch {
      toast.error("Update failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Trainers</h1>
          <p className="text-sm text-muted-foreground">Provision coaches, tune activation, audit roster capacity.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add trainer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New trainer</DialogTitle>
            </DialogHeader>
            <form className="space-y-3" onSubmit={createTrainer}>
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
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Specialization</Label>
                <Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
              </div>
              <div>
                <Label>Bio</Label>
                <Input value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
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
          <CardTitle>Roster</CardTitle>
          <Input placeholder="Search roster..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Clients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.user.firstName} {t.user.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.user.email}</TableCell>
                    <TableCell>{t._count?.clients ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={t.user.active ? "success" : "outline"}>{t.user.active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => toggleActive(t, !t.user.active)}>
                        {t.user.active ? "Deactivate" : "Activate"}
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
