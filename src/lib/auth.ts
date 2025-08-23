import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
    signOut: "/signout",
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account) token.provider = account.provider;
      if (profile && "email" in profile && typeof profile.email === "string") {
        token.email = profile.email;
      }
      if (user && (user as { name?: string }).name) {
        token.name = (user as { name?: string }).name as string;
      }
      return token;
    },
    async session({ session, token }) {
      session.provider = token.provider as string | undefined;
      if (session.user && token.email) session.user.email = token.email as string;
      if (session.user && (token as { name?: string }).name) session.user.name = (token as { name?: string }).name as string;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.email) return;
      const { error } = await supabaseAdmin
        .from("users")
        .upsert({ email: user.email, name: user.name ?? null, plan: "starter" }, { onConflict: "email" });
      if (error) {
        // Surface in logs to diagnose why rows are not written
        console.error("Supabase upsert users failed on signIn:", error.message);
      }
    },
  },
};


