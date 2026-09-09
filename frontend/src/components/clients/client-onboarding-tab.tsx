"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateIST } from "@/lib/datetime";
import { Printer, CheckCircle2, AlertTriangle, ShieldCheck, FileCheck } from "lucide-react";

export type OnboardingData = {
  id: string;
  clientId: string;
  dob: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  secondaryPhone: string | null;
  secondaryEmail: string | null;
  amountPaid: number | null;
  rulesAccepted: boolean;
  rulesAcceptedAt: string;
  registrationSignature: string | null;
  registrationSignedAt: string | null;
  parqHeartCondition: boolean;
  parqChestPainActivity: boolean;
  parqChestPainRest: boolean;
  parqDizziness: boolean;
  parqBoneJoint: boolean;
  parqBloodPressureDrugs: boolean;
  parqOtherReason: boolean;
  parqCleared: boolean;
  parqNotes: string | null;
  parqSignature: string | null;
  parqSignedAt: string | null;
  isMinor: boolean;
  guardianName: string | null;
  createdAt: string;
};

interface ClientOnboardingTabProps {
  client: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
    };
    age: number | null;
    gender: string | null;
    dob?: string | null;
    emergencyContact: string | null;
    emergencyPhone: string | null;
    goal: string | null;
    onboarding?: OnboardingData | null;
  };
}

const PARQ_QUESTIONS = [
  {
    key: "parqHeartCondition" as const,
    num: 1,
    text: "Has your doctor ever said that you have a heart condition AND that you should only do physical activity recommended by a doctor?",
  },
  {
    key: "parqChestPainActivity" as const,
    num: 2,
    text: "Do you feel pain in your chest when you do physical activity?",
  },
  {
    key: "parqChestPainRest" as const,
    num: 3,
    text: "In the past month, have you had chest pain when you were not doing physical activity?",
  },
  {
    key: "parqDizziness" as const,
    num: 4,
    text: "Do you lose your balance because of dizziness or do you ever lose consciousness?",
  },
  {
    key: "parqBoneJoint" as const,
    num: 5,
    text: "Do you have a bone or joint problem (for example, back, knee or hip) that could be made worse by a change in your physical activity?",
  },
  {
    key: "parqBloodPressureDrugs" as const,
    num: 6,
    text: "Is your doctor currently prescribing drugs (for example, water pills) for your blood pressure or heart condition?",
  },
  {
    key: "parqOtherReason" as const,
    num: 7,
    text: "Do you know of any other reason why you should not do physical activity?",
  },
];

export function ClientOnboardingTab({ client }: ClientOnboardingTabProps) {
  const ob = client.onboarding;

  const handlePrint = () => {
    window.print();
  };

  const isCleared = useMemo(() => {
    if (!ob) return true;
    return ob.parqCleared;
  }, [ob]);

  if (!ob) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 p-12 text-center">
        <FileCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-3 text-base font-semibold text-foreground">
          No Digital Onboarding Record
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          This client was created prior to the digital registration system or has not completed
          the forms.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action bar (Hidden when printing) */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Digital Forms Verified
          </Badge>
          {isCleared ? (
            <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-300">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> PAR-Q Cleared
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-300">
              <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Medical Clearance Advised
            </Badge>
          )}
        </div>

        <Button
          onClick={handlePrint}
          variant="outline"
          size="sm"
          className="border-border hover:bg-muted text-xs font-medium"
        >
          <Printer className="mr-1.5 h-3.5 w-3.5" /> Print / Save PDF
        </Button>
      </div>

      {/* ========================================================================= */}
      {/* FORM 1: OPEN GYM REGISTRATION FORM (Exact Physical Replica) */}
      {/* ========================================================================= */}
      <Card className="border-border/80 bg-card/90 shadow-sm print:border-black print:bg-white print:text-black print:shadow-none">
        <CardContent className="p-6 space-y-5 print:p-0">
          {/* Header */}
          <div className="border-b border-border/80 pb-4 text-center space-y-1 print:border-black">
            <h2 className="text-xl font-bold tracking-tight text-foreground print:text-black">
              GV FITNESS, RECREATION AND CULTURAL RESOURCES
            </h2>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400 print:text-black">
              Open Gym Registration Form
            </p>
            <p className="text-xs text-muted-foreground print:text-neutral-700">
              Applications Are Processed At The Gv Fitness
            </p>
            <p className="text-[11px] text-muted-foreground print:text-neutral-600">
              Mon-Saturday: 6:00am to 10:30pm • Sunday: 8:00am to 12:00pm
            </p>
            <p className="text-[11px] text-muted-foreground print:text-neutral-600">
              201, 201a, Sai Vittorio, Bhimrad-althan Rd, Opp. Atlanta Shopping Mall, Surat, Gujarat
              395017 | gvfitnesssurat23@gmail.com
            </p>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="border-b border-border/50 pb-1.5 print:border-neutral-300">
              <span className="font-semibold text-muted-foreground print:text-black">Applicant Name: </span>
              <span className="font-medium text-foreground print:text-black">
                {client.user.firstName} {client.user.lastName}
              </span>
            </div>
            <div className="border-b border-border/50 pb-1.5 print:border-neutral-300">
              <span className="font-semibold text-muted-foreground print:text-black">Date of Birth: </span>
              <span className="font-medium text-foreground print:text-black">
                {ob.dob ? formatDateIST(ob.dob) : "N/A"} (Age: {client.age ?? "N/A"})
              </span>
            </div>

            <div className="col-span-2 border-b border-border/50 pb-1.5 print:border-neutral-300">
              <span className="font-semibold text-muted-foreground print:text-black">Address: </span>
              <span className="font-medium text-foreground print:text-black">
                {ob.address || "N/A"}, {ob.city || "Surat"}, {ob.state || "Gujarat"} - {ob.zipcode || "395017"}
              </span>
            </div>

            <div className="border-b border-border/50 pb-1.5 print:border-neutral-300">
              <span className="font-semibold text-muted-foreground print:text-black">Primary Phone: </span>
              <span className="font-medium text-foreground print:text-black">
                {client.user.phone || "N/A"}
              </span>
            </div>
            <div className="border-b border-border/50 pb-1.5 print:border-neutral-300">
              <span className="font-semibold text-muted-foreground print:text-black">Additional Phone: </span>
              <span className="font-medium text-foreground print:text-black">
                {ob.secondaryPhone || "N/A"}
              </span>
            </div>

            <div className="border-b border-border/50 pb-1.5 print:border-neutral-300">
              <span className="font-semibold text-muted-foreground print:text-black">Email Address: </span>
              <span className="font-medium text-foreground print:text-black">
                {client.user.email}
              </span>
            </div>
            <div className="border-b border-border/50 pb-1.5 print:border-neutral-300">
              <span className="font-semibold text-muted-foreground print:text-black">Additional Email: </span>
              <span className="font-medium text-foreground print:text-black">
                {ob.secondaryEmail || "N/A"}
              </span>
            </div>

            <div className="border-b border-border/50 pb-1.5 print:border-neutral-300">
              <span className="font-semibold text-muted-foreground print:text-black">
                Emergency Contact{" "}
                <span className="text-[10px] font-normal text-muted-foreground print:text-neutral-600">
                  (Other than parent of minors)
                </span>
                :{" "}
              </span>
              <span className="font-medium text-foreground print:text-black">
                {client.emergencyContact || "N/A"} ({client.emergencyPhone || "N/A"})
              </span>
            </div>
            <div className="border-b border-border/50 pb-1.5 print:border-neutral-300">
              <span className="font-semibold text-muted-foreground print:text-black">Amount / Fee: </span>
              <span className="font-bold text-emerald-400 print:text-black">
                {ob.amountPaid ? `₹${ob.amountPaid}/-` : "N/A"}
              </span>
            </div>
          </div>

          {/* Rules Acknowledgement Snippet */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground print:border-neutral-300 print:bg-neutral-50 print:text-neutral-700">
            <p className="font-semibold text-foreground print:text-black mb-1">
              Gym Rules & Regulations Agreement:
            </p>
            <p>
              The member agrees to adhere to the standard GV Fitness guidelines including: Respecting
              others, time limits, proper personal safety/warm-up, hygiene & equipment sanitization,
              re-racking weights, strict prohibition of smoking/alcohol/outside shoes, and emergency
              preparedness.
            </p>
          </div>

          {/* Registration Signature Area */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-t border-border/80 print:border-black">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground print:text-black">
                Applicant Signature:
              </span>
              {ob.registrationSignature ? (
                <div className="rounded border border-border/60 bg-black/40 p-2 print:border-black print:bg-transparent">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ob.registrationSignature}
                    alt="Registration Signature"
                    className="h-16 object-contain"
                  />
                </div>
              ) : (
                <p className="text-xs italic text-rose-400">Unsigned</p>
              )}
              <p className="text-[10px] text-muted-foreground print:text-neutral-600">
                (Parent or Guardian if under 18 years of Age)
                {ob.guardianName ? ` • Guardian: ${ob.guardianName}` : ""}
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className="text-xs font-semibold text-muted-foreground print:text-black">Date: </span>
              <span className="text-xs font-medium text-foreground print:text-black">
                {ob.registrationSignedAt ? formatDateIST(ob.registrationSignedAt) : formatDateIST(ob.createdAt)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* FORM 2: PAR-Q QUESTIONNAIRE (Exact Physical Replica) */}
      {/* ========================================================================= */}
      <Card className="border-border/80 bg-card/90 shadow-sm print:border-black print:bg-white print:text-black print:shadow-none print:break-before-page">
        <CardContent className="p-6 space-y-5 print:p-0">
          {/* Header */}
          <div className="border-b border-border/80 pb-4 text-center space-y-1 print:border-black">
            <h2 className="text-2xl font-black tracking-tight text-foreground print:text-black">
              PAR-Q
            </h2>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 print:text-black">
              PHYSICAL ACTIVITY READINESS QUESTIONNAIRE
            </p>
            <p className="text-[11px] text-muted-foreground print:text-neutral-600 max-w-2xl mx-auto leading-relaxed">
              Regular physical activity is fun and healthy, and increasingly more people are starting
              to be more active every day. Before you start becoming much more physically active than
              you are now, it is important that you check with your doctor to make sure that it is
              safe for you. Please read the 7 questions below carefully and answer each one honestly:
              check YES or NO.
            </p>
          </div>

          {/* Participant Info Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-b border-border/60 pb-3 print:border-neutral-300">
            <div>
              <span className="font-semibold text-muted-foreground print:text-black">NAME: </span>
              <span className="font-medium text-foreground print:text-black">
                {client.user.firstName} {client.user.lastName}
              </span>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground print:text-black">AGE: </span>
              <span className="font-medium text-foreground print:text-black">
                {client.age ?? "N/A"}
              </span>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground print:text-black">GENDER: </span>
              <span className="font-medium text-foreground print:text-black">
                {client.gender || "N/A"}
              </span>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground print:text-black">PHONE: </span>
              <span className="font-medium text-foreground print:text-black">
                {client.user.phone || "N/A"}
              </span>
            </div>
          </div>

          {/* 7 Questions Table */}
          <div className="overflow-hidden rounded-lg border border-border/80 print:border-black">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 font-semibold text-foreground print:bg-neutral-100 print:text-black border-b border-border/80 print:border-black">
                <tr>
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5">PLEASE ANSWER YES OR NO TO THE FOLLOWING QUESTIONS</th>
                  <th className="p-2.5 w-16 text-center">YES</th>
                  <th className="p-2.5 w-16 text-center">NO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 print:divide-neutral-300">
                {PARQ_QUESTIONS.map((q) => {
                  const isYes = Boolean(ob[q.key]);
                  return (
                    <tr
                      key={q.key}
                      className={isYes ? "bg-amber-500/5 print:bg-neutral-100" : ""}
                    >
                      <td className="p-2.5 text-center font-medium text-muted-foreground print:text-black">
                        {q.num}.
                      </td>
                      <td className="p-2.5 leading-relaxed text-foreground print:text-black">
                        {q.text}
                      </td>
                      <td className="p-2.5 text-center font-bold">
                        {isYes ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 print:text-black">
                            ✓ YES
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30 print:text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-bold">
                        {!isYes ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 print:text-black">
                            ✓ NO
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30 print:text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Evaluation Box */}
          <div
            className={`rounded-lg border p-3.5 text-xs leading-relaxed ${
              isCleared
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 print:border-neutral-400 print:bg-transparent print:text-black"
                : "border-amber-500/40 bg-amber-500/10 text-amber-200 print:border-neutral-400 print:bg-transparent print:text-black"
            }`}
          >
            <p className="font-semibold mb-1">
              {isCleared
                ? "If you answered NO to all 7 questions:"
                : "If you answered YES to one or more questions:"}
            </p>
            {isCleared ? (
              <p>
                ✓ You can be reasonably sure that you can start becoming much more physically
                active — start slowly and build up gradually. This is the safest and easiest way to
                go.
              </p>
            ) : (
              <p>
                ✓ Talk with your doctor by phone or in person BEFORE you start becoming much more
                physically active or BEFORE you have a fitness appraisal. Tell your doctor which
                questions you answered YES.
              </p>
            )}
            {ob.parqNotes && (
              <p className="mt-2 text-[11px] pt-1.5 border-t border-border/40">
                <strong>Medical Notes: </strong>
                {ob.parqNotes}
              </p>
            )}
          </div>

          {/* PAR-Q Signature Area */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-t border-border/80 print:border-black">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground print:text-black">
                SIGNATURE:
              </span>
              {ob.parqSignature ? (
                <div className="rounded border border-border/60 bg-black/40 p-2 print:border-black print:bg-transparent">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ob.parqSignature}
                    alt="PAR-Q Signature"
                    className="h-16 object-contain"
                  />
                </div>
              ) : (
                <p className="text-xs italic text-rose-400">Unsigned</p>
              )}
              <p className="text-[10px] text-muted-foreground print:text-neutral-600">
                (Parent/Guardian signature required if under 18 years of age)
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className="text-xs font-semibold text-muted-foreground print:text-black">DATE: </span>
              <span className="text-xs font-medium text-foreground print:text-black">
                {ob.parqSignedAt ? formatDateIST(ob.parqSignedAt) : formatDateIST(ob.createdAt)}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground print:text-neutral-500 italic text-center pt-2">
            The PAR-Q is not meant to replace medical evaluation. If you are over the age of 69 and
            you are not used to being very active, check with your doctor.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
