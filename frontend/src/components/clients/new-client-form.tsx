"use client";

import { useMemo } from "react";
import { membershipEndFromStartAndSessions, formatDisplayDate } from "@/lib/membership";
import type { NewClientFormState } from "@/lib/client-form-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type { NewClientFormState } from "@/lib/client-form-utils";
export { defaultNewClientForm, buildCreateClientPayload } from "@/lib/client-form-utils";

export type TrainerMini = { id: string; user: { firstName: string; lastName: string } };

const selectClass =
  "flex h-10 w-full rounded-md border border-border bg-muted/40 px-3 text-sm";

export function NewClientForm({
  form,
  setForm,
  trainers,
  onSubmit,
  submitLabel = "Create client",
}: {
  form: NewClientFormState;
  setForm: React.Dispatch<React.SetStateAction<NewClientFormState>>;
  trainers: TrainerMini[];
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
}) {
  const computedEnd = useMemo(
    () => membershipEndFromStartAndSessions(form.membershipStart, form.totalSessions),
    [form.membershipStart, form.totalSessions],
  );

  const canSubmit = trainers.length > 0 && Boolean(form.trainerId);

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      {trainers.length === 0 ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Add a trainer before creating clients.
        </p>
      ) : null}

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Account</p>
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
        <div>
          <Label>Temporary password</Label>
          <Input
            required
            minLength={8}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Coaching</p>
        <div>
          <Label>Coach (trainer)</Label>
          <select
            required
            className={selectClass}
            value={form.trainerId}
            onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
            disabled={trainers.length === 0}
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
          <Input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="e.g. Weight loss" />
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Membership window</p>
        <p className="text-xs text-muted-foreground">One session per calendar day — end date is calculated from start + sessions.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Start date</Label>
            <Input
              type="date"
              required
              value={form.membershipStart}
              onChange={(e) => setForm({ ...form, membershipStart: e.target.value })}
            />
          </div>
          <div>
            <Label>Total sessions</Label>
            <Input
              type="number"
              required
              min={1}
              value={form.totalSessions}
              onChange={(e) => setForm({ ...form, totalSessions: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Membership window: </span>
          <span className="font-medium">
            {formatDisplayDate(form.membershipStart)} → {formatDisplayDate(computedEnd)}
          </span>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Athlete metrics</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Age</Label>
            <Input type="number" min={1} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
          </div>
          <div>
            <Label>Gender</Label>
            <select
              className={selectClass}
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as NewClientFormState["gender"] })}
            >
              <option value="">—</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Emergency</p>
        <div>
          <Label>Contact name</Label>
          <Input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />
        </div>
        <div>
          <Label>Emergency phone</Label>
          <Input value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Medical notes</p>
        <Textarea
          rows={3}
          value={form.medicalNotes}
          onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })}
          placeholder="Injuries, conditions, or notes for the coach…"
        />
      </section>

      <Button type="submit" className="w-full" disabled={!canSubmit}>
        {submitLabel}
      </Button>
    </form>
  );
}
