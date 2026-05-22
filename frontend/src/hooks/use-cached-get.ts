"use client";

import { useEffect, useState } from "react";
import { cachedApiGet } from "@/lib/api-cache";

export function useCachedGet<T>(url: string | null, ttlMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(url));

  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    cachedApiGet<T>(url, ttlMs)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url, ttlMs]);

  return { data, loading };
}
