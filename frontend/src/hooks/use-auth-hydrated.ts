"use client";

import { useSyncExternalStore } from "react";
import { useAuthStore } from "@/store/auth-store";

/**
 * Zustand `persist` rehydrates from localStorage after the first paint.
 * Wait for this before treating missing token as logged-out.
 */
export function useAuthHydrated(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (useAuthStore.persist.hasHydrated()) {
        queueMicrotask(onStoreChange);
      }
      return useAuthStore.persist.onFinishHydration(() => {
        onStoreChange();
      });
    },
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  );
}
