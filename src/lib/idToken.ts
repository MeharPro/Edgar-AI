import { NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

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
  provider: "google" | "github";
  subject: string;
  email: string;
  name?: string;
};

async function verifyGoogleIdToken(idToken: string): Promise<VerifiedIdentity> {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) throw new Error("GOOGLE_CLIENT_ID not configured");
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error("Invalid id_token (google tokeninfo)");
  const data = (await res.json()) as GoogleTokenInfo;
  if (!data.aud || data.aud !== googleClientId) throw new Error("Invalid audience for id_token");
  const iss = data.iss || "";
  if (iss !== "accounts.google.com" && iss !== "https://accounts.google.com") throw new Error("Invalid issuer for id_token");
  const email = data.email;
  const sub = data.sub;
  if (!email || !sub) throw new Error("id_token missing required claims");
  return { provider: "google", subject: sub, email, name: data.name };
}

async function verifyGithubOIDCIdToken(idToken: string): Promise<VerifiedIdentity> {
  const issuer = process.env.GITHUB_OIDC_ISSUER; // e.g., https://token.actions.githubusercontent.com or your IdP issuer
  const clientId = process.env.GITHUB_OIDC_CLIENT_ID; // your OAuth/OIDC client ID
  if (!issuer || !clientId) throw new Error("GitHub OIDC not configured");

  // Discover JWKS from issuer metadata
  const wellKnown = new URL(".well-known/openid-configuration", issuer.endsWith("/") ? issuer : issuer + "/");
  const confRes = await fetch(wellKnown, { method: "GET" });
  if (!confRes.ok) throw new Error("Failed to fetch OIDC configuration");
  const conf = (await confRes.json()) as { jwks_uri?: string; issuer?: string };
  const jwksUri = conf.jwks_uri || new URL(".well-known/jwks.json", issuer).toString();

  const JWKS = createRemoteJWKSet(new URL(jwksUri));
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer,
    audience: clientId,
    clockTolerance: 300, // seconds of clock skew (5 minutes)
  });

  const sub = payload.sub as string | undefined;
  const email = (payload as JWTPayload & { email?: string }).email;
  const name = (payload as JWTPayload & { name?: string; preferred_username?: string }).name || (payload as { preferred_username?: string }).preferred_username;
  if (!sub || !email) throw new Error("id_token missing required claims");
  return { provider: "github", subject: sub, email, name };
}

export async function verifyProviderIdToken(idToken: string): Promise<VerifiedIdentity> {
  // Try Google first (fast tokeninfo endpoint)
  try {
    return await verifyGoogleIdToken(idToken);
  } catch {}
  // Then try GitHub OIDC if configured
  try {
    return await verifyGithubOIDCIdToken(idToken);
  } catch {}
  throw new Error("Unable to verify id_token");
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
