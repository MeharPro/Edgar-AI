"use client";

import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignOutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      // Already signed out, redirect to home
      router.push("/");
      return;
    }

    // Sign out and redirect to home
    signOut({ callbackUrl: "/" });
  }, [session, status, router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Signing out...</h1>
        <p className="text-white/70">Please wait while we sign you out.</p>
      </div>
    </div>
  );
}
