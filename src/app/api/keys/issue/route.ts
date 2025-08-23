import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ensureUserByEmail } from "@/lib/ensureUser";
import { generateProviderApiKey } from "@/lib/keys";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = session.user.email;

  const ensured = await ensureUserByEmail(email);
  const userId = ensured?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Unable to ensure user" }, { status: 500 });
  }

  const apiKey = generateProviderApiKey();
  const hash = await bcrypt.hash(apiKey, 10);
  const prefix = apiKey.slice(0, 10);

  const { error } = await supabaseAdmin.from("api_keys").insert({ user_id: userId, hash, prefix });
  if (error) {
    console.error("Insert api_keys failed:", error.message);
    return NextResponse.json({ error: "Failed to issue key" }, { status: 500 });
  }

  return NextResponse.json({ apiKey });
}


