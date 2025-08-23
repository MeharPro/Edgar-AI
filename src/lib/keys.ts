import crypto from "crypto";

export function generateProviderApiKey(): string {
  const raw = crypto.randomBytes(24).toString("base64url");
  return `edgar_${raw}`;
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 6) return "******";
  return key.slice(0, 5) + "…" + key.slice(-4);
}


