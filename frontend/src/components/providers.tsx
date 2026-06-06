"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { AuthBootstrap } from "@/components/auth/auth-bootstrap";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
      <AuthBootstrap />
      {children}
      <Toaster richColors theme="dark" position="top-center" />
    </ThemeProvider>
  );
}
