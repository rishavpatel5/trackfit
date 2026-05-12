import { z } from "zod";
const uuid = z.string().uuid();
export function paramId(params, key) {
    const raw = params[key];
    const val = Array.isArray(raw) ? raw[0] : raw;
    return uuid.parse(val);
}
export function paramClientId(params) {
    return paramId(params, "clientId");
}
//# sourceMappingURL=params.js.map