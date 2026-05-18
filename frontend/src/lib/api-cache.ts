import { api } from "@/lib/api";

type CacheEntry = { data: unknown; expiresAt: number };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 45_000;

function cacheKey(url: string) {
  return `GET:${url}`;
}

export function invalidateApiCache(urlPrefix?: string) {
  for (const key of cache.keys()) {
    if (!urlPrefix || key.includes(urlPrefix)) {
      cache.delete(key);
    }
  }
}

export function clearApiCache() {
  cache.clear();
  inflight.clear();
}

export async function cachedApiGet<T>(url: string, ttlMs = DEFAULT_TTL_MS): Promise<T> {
  const key = cacheKey(url);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.data as T;
  }

  const pending = inflight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = api
    .get<T>(url)
    .then((res) => {
      cache.set(key, { data: res.data, expiresAt: now + ttlMs });
      inflight.delete(key);
      return res.data;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}
