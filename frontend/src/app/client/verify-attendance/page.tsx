"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function VerifyAttendanceInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenFromUrl = params.get("token");
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (!tokenFromUrl) return;
    const storageKey = `gvtrainer-attendance-token-${tokenFromUrl}`;
    if (sessionStorage.getItem(storageKey) === "verified") return;

    let cancelled = false;
    sessionStorage.setItem(storageKey, "pending");
    void (async () => {
      try {
        await api.post("/attendance/sessions/verify-token", { token: tokenFromUrl });
        if (cancelled) return;
        sessionStorage.setItem(storageKey, "verified");
        toast.success("Attendance verified via secure link");
        router.replace("/client/verify-attendance");
      } catch {
        if (!cancelled) {
          sessionStorage.removeItem(storageKey);
          toast.error("Link expired or invalid");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (sessionStorage.getItem(storageKey) === "pending") {
        sessionStorage.removeItem(storageKey);
      }
    };
  }, [tokenFromUrl]);

  async function verifyPin(e: React.FormEvent) {
    e.preventDefault();
    const digits = pin.replace(/\D/g, "");
    if (digits.length !== 6) {
      toast.error("Enter the 6-digit PIN");
      return;
    }
    try {
      await api.post("/attendance/sessions/verify-pin", { pin: digits });
      toast.success("Attendance verified");
      setPin("");
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast.error(msg ?? "Could not verify PIN");
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Verify session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If your coach shared a link, open it first — that verifies automatically. Otherwise enter the six-digit PIN
              they show on their screen. Do not enter the PIN after the link has already checked you in, or you will see
              &quot;already used&quot;.
            </p>
            <form className="space-y-3" onSubmit={verifyPin}>
              <div>
                <Label>PIN</Label>
                <Input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">
                Confirm attendance
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function VerifyAttendancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading verifier…</div>}>
      <VerifyAttendanceInner />
    </Suspense>
  );
}
