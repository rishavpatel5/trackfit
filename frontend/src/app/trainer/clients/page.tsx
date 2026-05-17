"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Row = {
  id: string;
  goal: string | null;
  user: { firstName: string; lastName: string; email: string };
};

export default function TrainerClientsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: Row[] }>("/clients?pageSize=100")
      .then((res) => setRows(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My athletes</h1>
        <p className="text-sm text-muted-foreground">Precision coaching lanes · immutable programming history.</p>
      </div>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Roster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <Skeleton className="h-40 w-full" /> : null}
          {rows.map((c) => (
            <div key={c.id} className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-lg font-semibold">
                  {c.user.firstName} {c.user.lastName}
                </div>
                <div className="text-sm text-muted-foreground">{c.user.email}</div>
                <div className="text-xs text-primary">{c.goal}</div>
              </div>
              <Button asChild>
                <Link href={`/trainer/clients/${c.id}`}>Open transformation workspace</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
