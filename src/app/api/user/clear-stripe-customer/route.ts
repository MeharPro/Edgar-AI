import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Clear the stripe_customer_id for this user
    const { error } = await supabaseAdmin
      .from('users')
      .update({ 
        stripe_customer_id: null,
        subscription_status: 'inactive'
      })
      .eq('email', session.user.email);

    if (error) {
      console.error('Error clearing stripe customer ID:', error);
      return NextResponse.json({ error: "Failed to clear customer ID" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Customer ID cleared" });
  } catch (error) {
    console.error('Error in clear-stripe-customer API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
