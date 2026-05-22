"use client";

import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function VerifyAttendancePage() {
  const [pin, setPin] = useState("");

  async function verifyPin(e: React.FormEvent) {
    e.preventDefault();
    const digits = pin.replace(/\D/g, "");
    if (digits.length !== 6) {
      toast.error("Enter the 6-digit PIN from your coach");
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-lg flex-col gap-6 p-6"
    >
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Verify session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your coach will share a six-digit PIN when they start your session. Enter that PIN here to confirm your
            attendance — verification is not possible without it.
          </p>
          <form className="space-y-3" onSubmit={verifyPin}>
            <motion.div layout>
              <Label htmlFor="attendance-pin">Session PIN</Label>
              <Input
                id="attendance-pin"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="000000"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </motion.div>
            <Button type="submit" className="w-full" disabled={pin.length !== 6}>
              Confirm attendance
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
