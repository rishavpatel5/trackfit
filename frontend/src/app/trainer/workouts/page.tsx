"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TrainerWorkoutsHubPage() {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Programming cockpit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>Workouts attach to athletes contextually. Open any roster member to publish mesocycles — weekly blocks cannot be deleted by trainers, preserving audit integrity.</p>
        <Button asChild>
          <Link href="/trainer/clients">Jump to athletes</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
