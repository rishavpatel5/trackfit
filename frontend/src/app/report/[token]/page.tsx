"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ReportPdfViewer } from "@/components/clients/report-pdf-viewer";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function PublicReportPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const urls = useMemo(() => {
    if (!token) return null;
    const viewUrl = `${apiBase()}/reports/public/${token}`;
    return { viewUrl, downloadUrl: `${viewUrl}?download=1` };
  }, [token]);

  if (!urls) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center p-6">
        <p className="text-muted-foreground">Invalid report link.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-4 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Transformation dossier</p>
          <h1 className="text-2xl font-semibold">Live client report</h1>
          <p className="text-sm text-muted-foreground">
            Generated on each view with the latest program data.
          </p>
        </div>
        <Button asChild size="lg">
          <a href={urls.downloadUrl}>Download PDF</a>
        </Button>
      </header>
      <ReportPdfViewer
        viewUrl={urls.viewUrl}
        heightClassName="h-[calc(100vh-10rem)]"
        className="flex-1 rounded-xl shadow-sm"
        title="Transformation report"
      />
    </main>
  );
}
