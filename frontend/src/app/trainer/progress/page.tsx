"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TrainerProgressPage() {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Progress intelligence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>Biometric timelines, qualitative week notes, and transformation media live per athlete profile. Dashboard highlights the freshest measurements for rapid triage.</p>
        <Button asChild>
          <Link href="/trainer/clients">Review athletes</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
