"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useSession } from "next-auth/react";

export const dynamic = "force-dynamic";

function AuthCompleteInner() {
  const sp = useSearchParams();
  const callbackUrl = sp.get("callback_url");
  const state = sp.get("state") || "";
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session) {
      const idToken = (session as unknown as { idToken?: string }).idToken;
      const provider = (session as unknown as { provider?: string }).provider || "google";
      if (!callbackUrl || !idToken) return;
      const url = new URL(callbackUrl);
      url.searchParams.set("idToken", idToken);
      url.searchParams.set("provider", provider);
      if (state) url.searchParams.set("state", state);
      window.location.replace(url.toString());
    }
  }, [status, session, callbackUrl, state]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <div className="text-white/80">Finalizing sign‑in…</div>
          <div className="text-white/50 text-sm mt-2">Redirecting back to your IDE</div>
        </div>
      </div>
    </div>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white"><div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-24"><div className="text-center">Loading…</div></div></div>}>
      <AuthCompleteInner />
    </Suspense>
  );
}
