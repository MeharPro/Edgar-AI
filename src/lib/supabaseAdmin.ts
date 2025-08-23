import { createClient } from "@supabase/supabase-js";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) as string;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE as string;

if (!url || !serviceRole) {
  throw new Error("Supabase configuration missing: ensure NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE are set");
}

export const supabaseAdmin = createClient(
  url,
  serviceRole,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);


