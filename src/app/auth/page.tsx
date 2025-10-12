"use client";

import { useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";

export default function AuthEntryPage() {
  const sp = useSearchParams();
  const callbackUrl = sp.get("callback_url");
  const state = sp.get("state");
  const { status } = useSession();

  useEffect(() => {
    // If already authenticated, go straight to completion step to redirect back to IDE
    if (status === "authenticated") {
      const url = new URL("/auth/complete", window.location.origin);
      if (callbackUrl) url.searchParams.set("callback_url", callbackUrl);
      if (state) url.searchParams.set("state", state);
      window.location.replace(url.toString());
    }
  }, [status, callbackUrl, state]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-24">
        <h1 className="text-2xl font-semibold">Sign in to Edgar</h1>
        <p className="mt-2 text-white/70 text-sm">You will be redirected back to your editor after signing in.</p>
        <div className="mt-6">
          <button
            onClick={() => {
              const next = new URL("/auth/complete", window.location.origin);
              if (callbackUrl) next.searchParams.set("callback_url", callbackUrl);
              if (state) next.searchParams.set("state", state);
              signIn("google", { callbackUrl: next.toString() });
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-white text-black font-medium px-4 py-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 c0-6.627,5.373-12,12-12c3.059,0,5.842,1.155,7.961,3.039l5.657-5.657C33.64,6.053,29.04,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.155,7.961,3.039l5.657-5.657 C33.64,6.053,29.04,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.202,0,9.619-3.317,11.274-7.946l-6.512,5.02C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.093,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
            Continue with Google
          </button>
        </div>
        <p className="mt-4 text-xs text-white/60">We’ll round‑trip your state and callback to your IDE.</p>
      </div>
    </div>
  );
}

