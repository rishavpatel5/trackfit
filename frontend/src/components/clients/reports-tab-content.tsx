"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ReportsTabToolbar({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const [items, setItems] = useState<{ id: string; url: string; createdAt: string }[]>([]);

  useEffect(() => {
    api.get<typeof items>(`/reports/clients/${clientId}`).then((res) => setItems(res.data));
  }, [clientId]);

  async function gen() {
    try {
      const { data } = await api.post<{ url: string }>(`/reports/clients/${clientId}/pdf`);
      toast.success("Report ready");
      window.open(data.url, "_blank");
      const list = await api.get<typeof items>(`/reports/clients/${clientId}`);
      setItems(list.data);
    } catch {
      toast.error("PDF host not configured");
    }
  }

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <CardTitle>Professional PDF exports</CardTitle>
        {canEdit ? (
          <Button variant="outline" onClick={gen}>
            Generate new dossier
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {items.length === 0 ? <p className="text-muted-foreground">No exports yet.</p> : null}
        {items.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
            <span>{new Date(r.createdAt).toLocaleString()}</span>
            <Button size="sm" variant="ghost" asChild>
              <a href={r.url} target="_blank" rel="noreferrer">
                Download
              </a>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
