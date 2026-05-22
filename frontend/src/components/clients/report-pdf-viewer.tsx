"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ReportPdfViewerProps = {
  viewUrl: string;
  className?: string;
  heightClassName?: string;
  title?: string;
};

export function ReportPdfViewer({
  viewUrl,
  className,
  heightClassName = "h-[min(70vh,720px)]",
  title = "Client transformation report",
}: ReportPdfViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setStatus("loading");
    setBlobUrl(null);

    fetch(viewUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Report request failed");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [viewUrl]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-muted/20",
        heightClassName,
        className,
      )}
    >
      {status === "loading" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/30">
          <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
          <p className="text-sm font-medium text-foreground">Generating report…</p>
          <p className="text-xs text-muted-foreground">This may take a few seconds</p>
        </div>
      ) : null}
      {status === "error" ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <p className="text-center text-sm text-muted-foreground">
            Could not generate the report. Check that the API is running and try again.
          </p>
        </div>
      ) : null}
      {status === "ready" && blobUrl ? (
        <embed src={blobUrl} type="application/pdf" className="h-full w-full" title={title} />
      ) : null}
    </div>
  );
}
