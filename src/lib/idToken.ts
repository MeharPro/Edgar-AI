import { NextResponse } from "next/server";

type GoogleTokenInfo = {
  azp?: string;
  aud?: string;
  sub?: string;
  scope?: string;
  email?: string;
  email_verified?: string | boolean;
  exp?: string;
  expires_in?: string;
  access_type?: string;
  iss?: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
};

export type VerifiedIdentity = {
  provider: "google";
  subject: string;
  email: string;
  name?: string;
};

export async function verifyProviderIdToken(idToken: string): Promise<VerifiedIdentity> {
  // Minimal support: Google OIDC via tokeninfo endpoint.
  // This performs signature + audience validation server-side by Google.
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID not configured");
  }

  // Attempt Google verification first
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    // Non-OK means the token is invalid or not a Google ID token
    throw new Error("Invalid id_token (google tokeninfo)");
  }
  const data = (await res.json()) as GoogleTokenInfo;
  if (!data.aud || data.aud !== googleClientId) {
    throw new Error("Invalid audience for id_token");
  }
  const iss = data.iss || "";
  if (iss !== "accounts.google.com" && iss !== "https://accounts.google.com") {
    throw new Error("Invalid issuer for id_token");
  }
  const email = data.email;
  const sub = data.sub;
  if (!email || !sub) {
    throw new Error("id_token missing required claims");
  }
  return {
    provider: "google",
    subject: sub,
    email,
    name: data.name,
  };
}

export function authHeaderToBearer(req: Request): string | null {
  const header = (req.headers as unknown as Headers).get("authorization") || "";
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice("bearer ".length);
  return token || null;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

