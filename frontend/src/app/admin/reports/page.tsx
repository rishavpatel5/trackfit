"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type ClientMini = {
  id: string;
  user: { firstName: string; lastName: string };
};

export default function AdminReportsPage() {
  const [clients, setClients] = useState<ClientMini[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: ClientMini[] }>("/clients?pageSize=100")
      .then((res) => {
        setClients(res.data.data);
        if (res.data.data[0]) setSelected(res.data.data[0].id);
      })
      .catch(() => toast.error("Unable to load clients"))
      .finally(() => setLoading(false));
  }, []);

  async function generate() {
    if (!selected) return;
    try {
      const res = await api.post(`/reports/clients/${selected}/pdf`, {}, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      window.open(url, "_blank");
      toast.success("PDF opened in a new tab");
      setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch {
      toast.error("Unable to generate PDF — ensure the API is reachable.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Puppeteer renders on the API and streams the PDF to your browser — nothing is stored on disk or in the database.
        </p>
      </div>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Generate transformation dossier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <>
              <select
                className="flex h-10 w-full max-w-md rounded-md border border-border bg-muted/40 px-3 text-sm"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.user.firstName} {c.user.lastName}
                  </option>
                ))}
              </select>
              <Button onClick={generate}>Generate PDF</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
