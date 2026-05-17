"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Brand, billing, integrations — extend here as your deployment matures.</p>
      </div>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Configure SMTP for password resets, tune session PIN TTL via `ATTENDANCE_PIN_EXPIRY_MINUTES`, and wire Cloudinary for
          uploads + PDF vaulting.
        </CardContent>
      </Card>
    </div>
  );
}
