"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore, type Role } from "@/store/auth-store";
import { useAuthHydrated } from "@/hooks/use-auth-hydrated";
import { Skeleton } from "@/components/ui/skeleton";

function homeFor(role: Role) {
  if (role === "ADMIN") return "/admin";
  if (role === "TRAINER") return "/trainer";
  return "/client";
}

export function RoleGate({
  allow,
  children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthHydrated();

  const allowKey = allow.join("|");

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    if (!allow.includes(user.role)) {
      router.replace(homeFor(user.role));
    }
  }, [hasHydrated, token, user, allowKey, router]); // eslint-disable-line react-hooks/exhaustive-deps -- allowKey summaries roles

  if (!hasHydrated) {
    return (
      <div className="space-y-3 p-8">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!token || !user || !allow.includes(user.role)) {
    return (
      <div className="space-y-3 p-8">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
