"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthHydrated } from "@/hooks/use-auth-hydrated";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore, type AuthUser } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function homeForRole(role: AuthUser["role"]) {
  if (role === "ADMIN") return "/admin";
  if (role === "TRAINER") return "/trainer";
  return "/client";
}

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated || !token || !user) return;
    router.replace(homeForRole(user.role));
  }, [hydrated, token, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post<{ token: string; user: AuthUser }>("/auth/login", { email, password });
      setAuth(data.token, data.user);
      toast.success("Welcome back");
      router.replace(homeForRole(data.user.role));
    } catch {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(220,38,38,0.25),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.06),transparent_40%)]" />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-black text-primary-foreground shadow-glow">
            GV
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">GVTrainer Studio OS</h1>
          <p className="mt-2 text-sm text-muted-foreground">Trainer accountability · Client transformations · Elite ops</p>
        </div>
        <Card className="border-border/80 bg-card/90 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use your assigned workspace credentials.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@yourdomain.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Continue"}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                <Link href="/forgot-password" className="underline-offset-4 hover:text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
