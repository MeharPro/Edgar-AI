import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface UserData {
  id: string;
  plan: string;
  total_tokens: number;
  subscription_status?: string;
  current_period_end?: string;
}

export async function ensureUserByEmail(email: string): Promise<UserData | null> {
  const { data } = await supabaseAdmin
    .from("users")
    .upsert({ email, plan: "starter" }, { onConflict: "email" })
    .select("id, plan, total_tokens, subscription_status, current_period_end")
    .single();
  if (!data) return null;
  
  const userData = data as UserData;
  return { 
    id: userData.id, 
    plan: userData.plan,
    total_tokens: userData.total_tokens || 0,
    subscription_status: userData.subscription_status,
    current_period_end: userData.current_period_end
  };
}


