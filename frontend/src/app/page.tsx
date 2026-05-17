"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useAuthHydrated } from "@/hooks/use-auth-hydrated";

export default function Home() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthHydrated();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    if (user.role === "ADMIN") router.replace("/admin");
    else if (user.role === "TRAINER") router.replace("/trainer");
    else router.replace("/client");
  }, [hasHydrated, token, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
