"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportPdfViewer } from "@/components/clients/report-pdf-viewer";

type ClientMini = {
  id: string;
  user: { firstName: string; lastName: string };
};

type ReportMeta = {
  token: string;
  publicPath: string;
};

const apiBase = () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function AdminReportsPage() {
  const [clients, setClients] = useState<ClientMini[]>([]);
  const [selected, setSelected] = useState("");
  const [meta, setMeta] = useState<ReportMeta | null>(null);
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

  useEffect(() => {
    if (!selected) return;
    api
      .get<ReportMeta>(`/reports/clients/${selected}`)
      .then((res) => setMeta(res.data))
      .catch(() => {
        setMeta(null);
        toast.error("Unable to load report link");
      });
  }, [selected]);

  const urls = useMemo(() => {
    if (!meta) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${origin}${meta.publicPath}`;
    const viewUrl = `${apiBase()}/reports/public/${meta.token}`;
    return { publicUrl, viewUrl, downloadUrl: `${viewUrl}?download=1` };
  }, [meta]);

  async function copyLink() {
    if (!urls) return;
    try {
      await navigator.clipboard.writeText(urls.publicUrl);
      toast.success("Report link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Each client has one permanent dossier link. Opening or downloading always uses the latest data — no stored PDF files.
        </p>
      </div>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Client transformation dossier</CardTitle>
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
              {urls ? (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input readOnly value={urls.publicUrl} className="font-mono text-xs" />
                    <Button type="button" variant="secondary" onClick={copyLink}>
                      Copy link
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                      <a href={urls.publicUrl} target="_blank" rel="noreferrer">
                        Open dossier page
                      </a>
                    </Button>
                    <Button asChild>
                      <a href={urls.downloadUrl} target="_blank" rel="noreferrer">
                        Download PDF
                      </a>
                    </Button>
                  </div>
                  <ReportPdfViewer viewUrl={urls.viewUrl} heightClassName="h-[min(60vh,640px)]" />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select a client to load their dossier link.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
