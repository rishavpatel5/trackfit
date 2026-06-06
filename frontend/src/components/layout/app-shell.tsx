"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Users,
  Utensils,
  Bell,
  Apple,
  LineChart,
  FileText,
  Settings,
  UserCircle,
  ScanLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { useState } from "react";

export type NavItem = { href: string; label: string; icon: React.ReactNode };

const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/admin/trainers", label: "Trainers", icon: <Users className="h-4 w-4" /> },
  { href: "/admin/clients", label: "Clients", icon: <UserCircle className="h-4 w-4" /> },
  { href: "/admin/attendance", label: "Attendance", icon: <Activity className="h-4 w-4" /> },
  { href: "/admin/reports", label: "Reports", icon: <FileText className="h-4 w-4" /> },
  { href: "/admin/audit", label: "Audit logs", icon: <Shield className="h-4 w-4" /> },
  { href: "/admin/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

const trainerNav: NavItem[] = [
  { href: "/trainer", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/trainer/clients", label: "My clients", icon: <Users className="h-4 w-4" /> },
  { href: "/trainer/attendance", label: "Attendance", icon: <ScanLine className="h-4 w-4" /> },
  { href: "/trainer/diet", label: "Diet plans", icon: <Apple className="h-4 w-4" /> },
  { href: "/trainer/progress", label: "Progress", icon: <LineChart className="h-4 w-4" /> },
];

const clientNav: NavItem[] = [
  { href: "/client", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/client/diet", label: "My diet", icon: <Utensils className="h-4 w-4" /> },
  { href: "/client/attendance", label: "Attendance", icon: <ClipboardList className="h-4 w-4" /> },
  { href: "/client/progress", label: "Progress", icon: <LineChart className="h-4 w-4" /> },
  { href: "/client/reports", label: "Reports", icon: <FileText className="h-4 w-4" /> },
  { href: "/client/verify-attendance", label: "Verify session", icon: <ScanLine className="h-4 w-4" /> },
];

export function AppShell({
  variant,
  title,
  children,
}: {
  variant: "admin" | "trainer" | "client";
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  function handleLogout() {
    logout();
    router.replace("/login");
  }
  const nav = variant === "admin" ? adminNav : variant === "trainer" ? trainerNav : clientNav;
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.12),transparent_55%),linear-gradient(180deg,#050505,#080808)]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-card/95 transition-transform max-lg:backdrop-blur-md lg:bg-card/80 lg:backdrop-blur-xl lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black tracking-tighter">
            GV
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Studio OS</div>
            <div className="font-semibold">{title}</div>
          </div>
        </div>
        <nav className="space-y-1 p-4">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors touch-manipulation",
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 min-h-14 items-center justify-between border-b border-border bg-background/95 px-4 pt-[env(safe-area-inset-top)] max-lg:backdrop-blur-md md:h-16 md:px-8 lg:bg-background/80 lg:backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-11 w-11 lg:hidden" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden md:block">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Transformation intelligence</p>
              <p className="text-lg font-semibold">{title}</p>
            </div>
            <p className="text-sm font-semibold md:hidden">{title}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex gap-2 border-border">
              <Bell className="h-4 w-4" />
              Alerts
            </Button>
            <div className="hidden text-right text-sm sm:block">
              <div className="font-medium">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs text-muted-foreground">{user?.role}</div>
            </div>
            <Button variant="ghost" size="icon" className="h-11 w-11" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {open && (
          <button type="button" className="fixed inset-0 z-30 bg-black/60 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)} />
        )}

        <main className="flex-1 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-8">{children}</main>
      </div>
    </div>
  );
}
