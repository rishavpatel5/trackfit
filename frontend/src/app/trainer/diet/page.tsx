"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TrainerDietHubPage() {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Nutrition command</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>Macros roll up per day automatically inside each athlete workspace. Extend templates without deleting locked historical weeks.</p>
        <Button asChild>
          <Link href="/trainer/clients">Open athlete</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
