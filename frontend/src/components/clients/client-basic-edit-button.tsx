"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { invalidateApiCache } from "@/lib/api-cache";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type EditableClientBasics = {
  id: string;
  goal: string | null;
  medicalNotes: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  age: number | null;
  gender: string | null;
  user: {
    email: string;
    phone: string | null;
    firstName: string;
    lastName: string;
  };
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: string;
  gender: "" | "MALE" | "FEMALE" | "OTHER";
  goal: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalNotes: string;
};

function formFromClient(client: EditableClientBasics): FormState {
  return {
    firstName: client.user.firstName,
    lastName: client.user.lastName,
    email: client.user.email,
    phone: client.user.phone ?? "",
    age: client.age == null ? "" : String(client.age),
    gender: (client.gender as FormState["gender"]) ?? "",
    goal: client.goal ?? "",
    emergencyContact: client.emergencyContact ?? "",
    emergencyPhone: client.emergencyPhone ?? "",
    medicalNotes: client.medicalNotes ?? "",
  };
}

function apiErrorMessage(e: unknown, fallback: string) {
  if (e && typeof e === "object" && "response" in e) {
    const err = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
    if (err) return err;
  }
  return fallback;
}

export function ClientBasicEditButton({
  client,
  size = "sm",
  onChanged,
}: {
  client: EditableClientBasics;
  size?: "sm" | "default";
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(() => formFromClient(client));

  useEffect(() => {
    if (!open) setForm(formFromClient(client));
  }, [client, open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/clients/${client.id}`, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        age: form.age.trim() ? Number(form.age) : undefined,
        gender: form.gender || undefined,
        goal: form.goal.trim() || undefined,
        emergencyContact: form.emergencyContact.trim() || undefined,
        emergencyPhone: form.emergencyPhone.trim() || undefined,
        medicalNotes: form.medicalNotes.trim() || undefined,
      });
      toast.success("Client details updated");
      invalidateApiCache("/clients");
      invalidateApiCache(`/clients/${client.id}`);
      setOpen(false);
      onChanged?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Unable to update client"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size={size} variant="outline">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit client details</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={save}>
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
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Age</Label>
              <Input type="number" min={1} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </div>
            <div>
              <Label>Gender</Label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-muted/40 px-3 text-sm"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as FormState["gender"] })}
              >
                <option value="">-</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Goal</Label>
            <Input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Emergency contact</Label>
              <Input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />
            </div>
            <div>
              <Label>Emergency phone</Label>
              <Input value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Medical notes</Label>
            <Textarea rows={3} value={form.medicalNotes} onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
