import { z } from "zod";

const uuid = z.string().uuid();

export function paramId(params: Record<string, string | string[] | undefined>, key: string) {
  const raw = params[key];
  const val = Array.isArray(raw) ? raw[0] : raw;
  return uuid.parse(val);
}

export function paramClientId(params: Record<string, string | string[] | undefined>) {
  return paramId(params, "clientId");
}
