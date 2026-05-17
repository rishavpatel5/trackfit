"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"request" | "reset">("request");
  const [loading, setLoading] = useState(false);

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post<{ message: string; resetToken?: string }>("/auth/forgot-password", { email });
      toast.message(data.message);
      if (data.resetToken) {
        setToken(data.resetToken);
        setStep("reset");
        toast.info("Development token surfaced — paste is pre-filled.");
      } else {
        toast.info("Check your inbox for reset instructions.");
      }
    } catch {
      toast.error("Unable to process request");
    } finally {
      setLoading(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword });
      toast.success("Password updated — you can sign in");
      setStep("request");
    } catch {
      toast.error("Invalid token or password policy");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="border-border/80 bg-card/90 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Forgot password</CardTitle>
            <CardDescription>Secure recovery flow with audited tokens.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === "request" ? (
              <form className="space-y-4" onSubmit={requestReset}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  Send reset link
                </Button>
                <Button type="button" variant="outline" className="w-full border-border" asChild>
                  <Link href="/login">Back to login</Link>
                </Button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={reset}>
                <div className="space-y-2">
                  <Label htmlFor="token">Reset token</Label>
                  <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw">New password</Label>
                  <Input id="pw" type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  Update password
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("request")}>
                  Cancel
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
