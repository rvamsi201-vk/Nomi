import { createHash, randomBytes } from "node:crypto";

export function hashApiToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateApiToken() {
  const raw = `nomi_${randomBytes(32).toString("hex")}`;
  return {
    token: raw,
    tokenHash: hashApiToken(raw),
    prefix: raw.slice(0, 12),
  };
}
