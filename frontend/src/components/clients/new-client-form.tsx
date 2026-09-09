"use client";

import { useMemo, useState } from "react";
import {
  membershipEndFromStartAndSessions,
  formatDisplayDate,
} from "@/lib/membership";
import type { NewClientFormState } from "@/lib/client-form-utils";
import { isParqCleared } from "@/lib/client-form-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SignaturePad } from "@/components/ui/signature-pad";
import { GymRulesModal } from "@/components/clients/onboarding/gym-rules-modal";
import {
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  FileCheck,
  HeartPulse,
  UserCheck,
  Copy,
} from "lucide-react";

export type { NewClientFormState } from "@/lib/client-form-utils";
export { defaultNewClientForm, buildCreateClientPayload } from "@/lib/client-form-utils";

export type TrainerMini = { id: string; user: { firstName: string; lastName: string } };

const selectClass =
  "flex h-10 w-full rounded-md border border-border bg-muted/40 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500";

const PARQ_QUESTIONS = [
  {
    key: "parqHeartCondition" as const,
    num: 1,
    question:
      "Has your doctor ever said that you have a heart condition AND that you should only do physical activity recommended by a doctor?",
  },
  {
    key: "parqChestPainActivity" as const,
    num: 2,
    question: "Do you feel pain in your chest when you do physical activity?",
  },
  {
    key: "parqChestPainRest" as const,
    num: 3,
    question:
      "In the past month, have you had chest pain when you were not doing physical activity?",
  },
  {
    key: "parqDizziness" as const,
    num: 4,
    question:
      "Do you lose your balance because of dizziness or do you ever lose consciousness?",
  },
  {
    key: "parqBoneJoint" as const,
    num: 5,
    question:
      "Do you have a bone or joint problem (for example, back, knee or hip) that could be made worse by a change in your physical activity?",
  },
  {
    key: "parqBloodPressureDrugs" as const,
    num: 6,
    question:
      "Is your doctor currently prescribing drugs (for example, water pills) for your blood pressure or heart condition?",
  },
  {
    key: "parqOtherReason" as const,
    num: 7,
    question: "Do you know of any other reason why you should not do physical activity?",
  },
];

export function NewClientForm({
  form,
  setForm,
  trainers,
  onSubmit,
  submitLabel = "Onboard client & save forms",
  hideTrainerPicker = false,
}: {
  form: NewClientFormState;
  setForm: React.Dispatch<React.SetStateAction<NewClientFormState>>;
  trainers: TrainerMini[];
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  hideTrainerPicker?: boolean;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const computedEnd = useMemo(
    () => membershipEndFromStartAndSessions(form.membershipStart, form.totalSessions),
    [form.membershipStart, form.totalSessions]
  );

  const cleared = useMemo(() => isParqCleared(form), [form]);

  // Compute if client is under 18 based on age or DOB
  const isMinor = useMemo(() => {
    if (form.age && Number(form.age) < 18) return true;
    if (form.dob) {
      const birth = new Date(form.dob);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age < 18;
    }
    return false;
  }, [form.age, form.dob]);

  const canSubmit =
    (hideTrainerPicker || (trainers.length > 0 && Boolean(form.trainerId))) &&
    Boolean(form.firstName) &&
    Boolean(form.lastName) &&
    Boolean(form.email) &&
    Boolean(form.password);

  const copyRegSignatureToParq = () => {
    if (form.registrationSignature) {
      setForm((prev) => ({ ...prev, parqSignature: prev.registrationSignature }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Wizard Steps Header */}
      <div className="grid grid-cols-3 gap-2 border-b border-border/60 pb-4">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`flex items-center gap-2 rounded-md p-2 text-left text-xs transition-all ${
            step === 1
              ? "bg-emerald-500/10 font-semibold text-emerald-400 border border-emerald-500/30"
              : "text-muted-foreground hover:bg-muted/30"
          }`}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold">
            1
          </span>
          <span className="hidden sm:inline">1. Registration Form</span>
          <span className="sm:hidden">1. Register</span>
        </button>

        <button
          type="button"
          onClick={() => setStep(2)}
          className={`flex items-center gap-2 rounded-md p-2 text-left text-xs transition-all ${
            step === 2
              ? "bg-emerald-500/10 font-semibold text-emerald-400 border border-emerald-500/30"
              : "text-muted-foreground hover:bg-muted/30"
          }`}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold">
            2
          </span>
          <span className="hidden sm:inline">2. PAR-Q Questionnaire</span>
          <span className="sm:hidden">2. PAR-Q</span>
        </button>

        <button
          type="button"
          onClick={() => setStep(3)}
          className={`flex items-center gap-2 rounded-md p-2 text-left text-xs transition-all ${
            step === 3
              ? "bg-emerald-500/10 font-semibold text-emerald-400 border border-emerald-500/30"
              : "text-muted-foreground hover:bg-muted/30"
          }`}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold">
            3
          </span>
          <span className="hidden sm:inline">3. Review & Submit</span>
          <span className="sm:hidden">3. Review</span>
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* ========================================================================= */}
        {/* STEP 1: REGISTRATION FORM */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    GV FITNESS, RECREATION AND CULTURAL RESOURCES
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Open Gym Registration Form • Surat, Gujarat
                  </p>
                </div>
                <GymRulesModal />
              </div>
            </div>

            {!hideTrainerPicker && trainers.length === 0 ? (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                Add a trainer before creating clients.
              </p>
            ) : null}

            {/* Applicant Identity */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Applicant Information
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>First name *</Label>
                  <Input
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="e.g. Hardik"
                  />
                </div>
                <div>
                  <Label>Last name *</Label>
                  <Input
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="e.g. Khatos"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Age</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    placeholder="e.g. 24"
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <select
                    className={selectClass}
                    value={form.gender}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        gender: e.target.value as NewClientFormState["gender"],
                      })
                    }
                  >
                    <option value="">Select gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Contact & Credentials */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Contact & Account
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Primary Phone *</Label>
                  <Input
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. 9924144494"
                  />
                </div>
                <div>
                  <Label>Additional Phone</Label>
                  <Input
                    value={form.secondaryPhone}
                    onChange={(e) => setForm({ ...form, secondaryPhone: e.target.value })}
                    placeholder="e.g. 9377644494"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. member@example.com"
                  />
                </div>
                <div>
                  <Label>Additional Email</Label>
                  <Input
                    type="email"
                    value={form.secondaryEmail}
                    onChange={(e) => setForm({ ...form, secondaryEmail: e.target.value })}
                    placeholder="Optional secondary email"
                  />
                </div>
              </div>

              <div>
                <Label>Temporary Account Password *</Label>
                <Input
                  required
                  minLength={8}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 8 characters"
                />
              </div>
            </section>

            {/* Address */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Residential Address
              </p>
              <div>
                <Label>Street Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. 201, Sai Vittorio, Bhimrad-Althan Rd"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>City</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Surat"
                  />
                </div>
                <div>
                  <Label>State</Label>
                  <Input
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="Gujarat"
                  />
                </div>
                <div>
                  <Label>Zipcode</Label>
                  <Input
                    value={form.zipcode}
                    onChange={(e) => setForm({ ...form, zipcode: e.target.value })}
                    placeholder="395017"
                  />
                </div>
              </div>
            </section>

            {/* Emergency Contact */}
            <section className="space-y-3">
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                  Emergency Contact
                </p>
                <span className="text-[11px] text-muted-foreground">
                  (Other than parent of minors)
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Emergency Contact Name</Label>
                  <Input
                    value={form.emergencyContact}
                    onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                    placeholder="Name of contact"
                  />
                </div>
                <div>
                  <Label>Emergency Phone</Label>
                  <Input
                    value={form.emergencyPhone}
                    onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
                    placeholder="e.g. 7228844494"
                  />
                </div>
              </div>
            </section>

            {/* Membership, Fee & Coach */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Membership & Coaching
              </p>
              {!hideTrainerPicker ? (
                <div>
                  <Label>Assigned Coach (Trainer) *</Label>
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
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    required
                    value={form.membershipStart}
                    onChange={(e) => setForm({ ...form, membershipStart: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Total Sessions *</Label>
                  <Input
                    type="number"
                    required
                    min={1}
                    value={form.totalSessions}
                    onChange={(e) =>
                      setForm({ ...form, totalSessions: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Registration Fee / Amount (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.amountPaid}
                    onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
                    placeholder="e.g. 8000"
                  />
                </div>
              </div>

              <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Calculated Window: </span>
                <span className="font-semibold text-emerald-400">
                  {formatDisplayDate(form.membershipStart)} → {formatDisplayDate(computedEnd)}
                </span>
              </div>

              <div>
                <Label>Primary Fitness Goal</Label>
                <Input
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                  placeholder="e.g. Fat loss, Strength conditioning"
                />
              </div>
            </section>

            {/* Rules Acceptance & Digital Signature */}
            <section className="space-y-4 rounded-lg border border-border/70 bg-muted/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Gym Rules Acceptance & Signature
              </p>

              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="rulesAccepted"
                  checked={form.rulesAccepted}
                  onChange={(e) =>
                    setForm({ ...form, rulesAccepted: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-border accent-emerald-500 cursor-pointer"
                />
                <label
                  htmlFor="rulesAccepted"
                  className="text-xs leading-relaxed text-muted-foreground cursor-pointer"
                >
                  I acknowledge and agree to comply with the 16 standard Gym Rules, Personal Safety,
                  Hygiene, and Equipment Usage regulations of GV Fitness.
                </label>
              </div>

              {isMinor && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                  <Label className="text-xs text-amber-200">
                    Parent or Guardian Name (Required for under 18 years of age) *
                  </Label>
                  <Input
                    value={form.guardianName}
                    onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                    placeholder="Parent or Guardian full name"
                    className="mt-1.5 border-amber-500/40 bg-black/40 text-amber-100"
                  />
                </div>
              )}

              <SignaturePad
                label="Applicant Signature (Parent/Guardian if under 18)"
                value={form.registrationSignature}
                onChange={(sig) => setForm({ ...form, registrationSignature: sig })}
              />
            </section>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={() => setStep(2)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                Next: PAR-Q Questionnaire <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: PAR-Q QUESTIONNAIRE */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <HeartPulse className="h-5 w-5" />
                <h3 className="text-sm font-semibold tracking-tight">
                  PAR-Q (Physical Activity Readiness Questionnaire)
                </h3>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Before becoming much more physically active, it is important to verify with a doctor
                that it is safe. Answer each of the 7 questions below honestly:
              </p>
            </div>

            {/* Clearance Alert Banner */}
            {cleared ? (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                <div>
                  <p className="font-semibold">Cleared for Physical Activity</p>
                  <p className="text-emerald-300/80">
                    All 7 questions answered NO. The athlete can begin physical training and build up
                    gradually.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <p className="font-semibold">Medical Clearance Recommended</p>
                  <p className="text-amber-200/80">
                    One or more questions answered YES. The athlete should consult a doctor before
                    fitness appraisal or intense exercise.
                  </p>
                </div>
              </div>
            )}

            {/* 7 Questions List */}
            <div className="space-y-3">
              {PARQ_QUESTIONS.map((q) => {
                const val = form[q.key];
                return (
                  <div
                    key={q.key}
                    className={`rounded-lg border p-3.5 transition-colors ${
                      val
                        ? "border-amber-500/50 bg-amber-500/5"
                        : "border-border/60 bg-muted/10 hover:border-border"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                          {q.num}
                        </span>
                        <p className="text-xs text-foreground/90 leading-relaxed">
                          {q.question}
                        </p>
                      </div>

                      {/* YES / NO Toggle buttons */}
                      <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, [q.key]: false })}
                          className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                            !val
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "border border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          NO
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, [q.key]: true })}
                          className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                            val
                              ? "bg-amber-600 text-white shadow-sm"
                              : "border border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          YES
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Additional Medical Notes */}
            <div>
              <Label>Additional Medical Notes / Doctor Recommendations</Label>
              <Textarea
                rows={2}
                value={form.parqNotes}
                onChange={(e) => setForm({ ...form, parqNotes: e.target.value })}
                placeholder="Details of any injuries, surgeries, or specific conditions..."
                className="text-xs"
              />
            </div>

            {/* PAR-Q Signature */}
            <section className="space-y-4 rounded-lg border border-border/70 bg-muted/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                  PAR-Q Digital Signature
                </p>
                {form.registrationSignature && !form.parqSignature && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyRegSignatureToParq}
                    className="h-7 border-emerald-500/40 text-xs text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <Copy className="mr-1 h-3 w-3" /> Same as Registration Signature
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                The PAR-Q is not meant to replace medical evaluation. If you are over the age of 69
                and not used to being very active, check with your doctor.
              </p>

              <SignaturePad
                label="Participant Signature (Parent/Guardian if under 18)"
                value={form.parqSignature}
                onChange={(sig) => setForm({ ...form, parqSignature: sig })}
              />
            </section>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="text-xs"
              >
                <ChevronLeft className="mr-1.5 h-4 w-4" /> Back to Registration
              </Button>
              <Button
                type="button"
                onClick={() => setStep(3)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                Next: Review Summary <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: REVIEW & CONFIRM */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <FileCheck className="h-5 w-5" />
                <h3 className="text-sm font-semibold tracking-tight">
                  Review & Onboarding Confirmation
                </h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Please verify all client details, PAR-Q status, and digital signatures before
                saving.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Member Card */}
              <div className="rounded-lg border border-border/70 bg-card p-4 space-y-2.5 text-xs">
                <p className="font-semibold uppercase tracking-wider text-emerald-400">
                  Athlete Details
                </p>
                <div>
                  <span className="text-muted-foreground">Name: </span>
                  <span className="font-medium text-foreground">
                    {form.firstName} {form.lastName}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email: </span>
                  <span className="font-medium text-foreground">{form.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone: </span>
                  <span className="font-medium text-foreground">{form.phone}</span>
                </div>
                {form.dob && (
                  <div>
                    <span className="text-muted-foreground">Date of Birth: </span>
                    <span className="font-medium text-foreground">{form.dob}</span>
                  </div>
                )}
                {form.address && (
                  <div>
                    <span className="text-muted-foreground">Address: </span>
                    <span className="font-medium text-foreground">
                      {form.address}, {form.city}, {form.state} {form.zipcode}
                    </span>
                  </div>
                )}
                {form.emergencyContact && (
                  <div>
                    <span className="text-muted-foreground">Emergency Contact: </span>
                    <span className="font-medium text-foreground">
                      {form.emergencyContact} ({form.emergencyPhone})
                    </span>
                  </div>
                )}
              </div>

              {/* Membership Card */}
              <div className="rounded-lg border border-border/70 bg-card p-4 space-y-2.5 text-xs">
                <p className="font-semibold uppercase tracking-wider text-emerald-400">
                  Membership & Safety
                </p>
                <div>
                  <span className="text-muted-foreground">Membership: </span>
                  <span className="font-medium text-foreground">
                    {form.totalSessions} sessions ({formatDisplayDate(form.membershipStart)} →{" "}
                    {formatDisplayDate(computedEnd)})
                  </span>
                </div>
                {form.amountPaid && (
                  <div>
                    <span className="text-muted-foreground">Registration Fee: </span>
                    <span className="font-semibold text-emerald-400">₹{form.amountPaid}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-muted-foreground">PAR-Q Status: </span>
                  {cleared ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 font-semibold text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> CLEARED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 font-semibold text-amber-300">
                      <AlertTriangle className="h-3 w-3" /> CLEARANCE ADVISED
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Gym Rules: </span>
                  <span className="font-medium text-emerald-400">
                    {form.rulesAccepted ? "Acknowledged & Agreed" : "Pending"}
                  </span>
                </div>
                {isMinor && form.guardianName && (
                  <div>
                    <span className="text-muted-foreground">Guardian: </span>
                    <span className="font-medium text-amber-300">{form.guardianName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Signatures Preview */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-card p-3 space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase">
                  Registration Signature
                </p>
                {form.registrationSignature ? (
                  <div className="rounded border border-border/40 bg-black/40 p-2 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.registrationSignature}
                      alt="Registration Signature"
                      className="h-14 object-contain"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-rose-400 italic">Signature missing</p>
                )}
              </div>

              <div className="rounded-lg border border-border/70 bg-card p-3 space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase">
                  PAR-Q Signature
                </p>
                {form.parqSignature ? (
                  <div className="rounded border border-border/40 bg-black/40 p-2 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.parqSignature}
                      alt="PAR-Q Signature"
                      className="h-14 object-contain"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-rose-400 italic">Signature missing</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                className="text-xs"
              >
                <ChevronLeft className="mr-1.5 h-4 w-4" /> Back to PAR-Q
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 shadow-md shadow-emerald-950"
              >
                <UserCheck className="mr-2 h-4 w-4" />
                {submitLabel}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
