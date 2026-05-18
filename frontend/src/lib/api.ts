import axios from "axios";
import { clearApiCache } from "@/lib/api-cache";
import { useAuthStore } from "@/store/auth-store";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    const method = res.config.method?.toUpperCase();
    if (method && method !== "GET" && method !== "HEAD") {
      clearApiCache();
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      // Avoid clearing persisted auth before zustand rehydrates (would look like "logout on refresh").
      if (typeof window !== "undefined" && useAuthStore.persist.hasHydrated()) {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(err);
  },
);
