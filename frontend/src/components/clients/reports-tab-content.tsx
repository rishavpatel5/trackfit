"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReportPdfViewer } from "@/components/clients/report-pdf-viewer";

type ReportMeta = {
  token: string;
  publicPath: string;
  live: boolean;
  description: string;
};

const apiBase = () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function ReportsTabToolbar({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const urls = useMemo(() => {
    if (!meta) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${origin}${meta.publicPath}`;
    const viewUrl = `${apiBase()}/reports/public/${meta.token}`;
    const downloadUrl = `${viewUrl}?download=1`;
    return { publicUrl, viewUrl, downloadUrl };
  }, [meta]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ReportMeta>(`/reports/clients/${clientId}`);
      setMeta(data);
    } catch {
      toast.error("Unable to load report link");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

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
    <Card className="border-border/70">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Live transformation dossier</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            One permanent link per client. Each view rebuilds the PDF with the latest attendance, plans, and progress.
          </p>
        </div>
        {urls ? (
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button variant="outline" onClick={copyLink}>
                Copy link
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <a href={urls.publicUrl} target="_blank" rel="noreferrer">
                Open full page
              </a>
            </Button>
            <Button asChild>
              <a href={urls.downloadUrl} target="_blank" rel="noreferrer">
                Download PDF
              </a>
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading report…</p>
        ) : !meta || !urls ? (
          <p className="text-sm text-muted-foreground">Report unavailable.</p>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input readOnly value={urls.publicUrl} className="font-mono text-xs" />
              {canEdit ? (
                <Button type="button" variant="secondary" onClick={copyLink} className="shrink-0">
                  Copy
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{meta.description}</p>
            <ReportPdfViewer viewUrl={urls.viewUrl} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
