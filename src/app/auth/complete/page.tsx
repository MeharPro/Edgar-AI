import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AuthCompletePage({
  searchParams,
}: {
  searchParams: { callback_url?: string; state?: string };
}) {
  const session = await getServerSession(authOptions);
  const idToken = (session as unknown as { idToken?: string })?.idToken;
  const provider = (session as unknown as { provider?: string })?.provider || "google";

  const callbackUrlRaw = searchParams?.callback_url || "";
  const state = searchParams?.state || "";

  let destination = "";
  try {
    if (callbackUrlRaw && idToken) {
      const url = new URL(callbackUrlRaw);
      url.searchParams.set("idToken", idToken);
      url.searchParams.set("provider", provider);
      if (state) url.searchParams.set("state", state);
      destination = url.toString();
    }
  } catch {
    // ignore malformed callback URLs
  }

  return (
    <html>
      <body className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center space-y-2">
            <div className="text-white/80">Finalizing sign‑in…</div>
            {destination ? (
              <>
                <div className="text-white/50 text-sm">Redirecting back to your IDE</div>
                <script dangerouslySetInnerHTML={{ __html: `window.location.replace(${JSON.stringify(destination)});` }} />
                <a className="underline text-purple-300 text-sm" href={destination}>Click here if not redirected</a>
              </>
            ) : (
              <div className="text-rose-300 text-sm">
                Unable to complete sign‑in. Please close this tab and try again.
              </div>
            )}
            {!idToken && (
              <div className="text-amber-300 text-xs mt-2">
                Tip: Ensure cookies are enabled and that you completed Google sign‑in.
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
