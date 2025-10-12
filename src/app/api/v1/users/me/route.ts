import { NextResponse } from "next/server";
import { ensureUserByEmail } from "@/lib/ensureUser";
import { authHeaderToBearer, verifyProviderIdToken, jsonError } from "@/lib/idToken";

export const runtime = "nodejs";

function planToTier(plan: string | null | undefined): "free" | "pro" | "team" | "enterprise" {
  switch ((plan || "starter").toLowerCase()) {
    case "starter":
      return "free";
    case "pro":
      return "pro";
    case "team":
      return "team";
    case "max":
    case "enterprise":
      return "enterprise";
    default:
      return "free";
  }
}

export async function GET(req: Request) {
  try {
    const token = authHeaderToBearer(req);
    if (!token) return jsonError("Missing Authorization Bearer token", 401);

    const identity = await verifyProviderIdToken(token);
    const email = identity.email;
    if (!email) return jsonError("Email not found in id_token", 401);

    const user = await ensureUserByEmail(email);
    if (!user) return jsonError("Unable to ensure user", 500);

    const response = {
      id: user.id,
      email,
      displayName: identity.name || email,
      tier: planToTier(user.plan),
      organizations: [] as Array<{ organizationId: string; name: string; roles: string[]; active: boolean }>,
    };
    return NextResponse.json(response);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return jsonError(`User info error: ${msg}`, 401);
  }
}

