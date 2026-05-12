import jwt from "jsonwebtoken";
export function signToken(payload, secret, expiresIn) {
    return jwt.sign(payload, secret, { expiresIn });
}
export function verifyToken(token, secret) {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded !== "object" || decoded === null || !("sub" in decoded) || !("role" in decoded)) {
        throw new Error("Invalid token payload");
    }
    return decoded;
}
//# sourceMappingURL=jwt.js.map