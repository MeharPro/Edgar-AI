"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import UsageGraph from "@/components/UsageGraph";

interface UsageSummary {
  total_calls: number;
  total_charged: number;
  total_prompt: number;
  total_completion: number;
  billing_cycle_start: string;
  billing_charge_date: string;
}

interface UserInfo {
  plan: string;
  lifetime_usage: number;
  subscription_status?: string;
  current_period_end?: string;
  stripe_customer_id?: string;
}

interface UsageDetails {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  charged_tokens: number;
}

interface ProviderSplit {
  provider: string;
  percent: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [usageDetails, setUsageDetails] = useState<UsageDetails[]>([]);
  const [providerSplit, setProviderSplit] = useState<ProviderSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [previousPlan, setPreviousPlan] = useState<string | null>(null);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [fullKey, setFullKey] = useState<string | null>(null);
  const [optIn, setOptIn] = useState<boolean>(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/signin");
      return;
    }
    fetchDashboardData();
    
    // Refresh data every 5 seconds for the first minute after page load
    // This helps catch webhook updates
    const refreshInterval = setInterval(() => {
      fetchDashboardData();
    }, 5000);
    
    // Stop refreshing after 1 minute
    const stopRefresh = setTimeout(() => {
      clearInterval(refreshInterval);
    }, 60000);
    
    return () => {
      clearInterval(refreshInterval);
      clearTimeout(stopRefresh);
    };
  }, [session, status, router]);

  const handleManageSubscription = async () => {
    try {
      console.log('Manage subscription clicked. User info:', userInfo);
      
      // Check if user has a Stripe customer ID
      if (!userInfo?.stripe_customer_id) {
        throw new Error('No stripe_customer_id available');
      }

      // TEMPORARY: No silent fallback - force error to surface
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`create-portal-session failed: ${response.status} ${text}`);
      }

      const { url } = await response.json();
      console.log('Portal session created successfully, redirecting to:', url);
      window.location.href = url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to open subscription management: ${errorMessage}`);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const [usageRes, userRes, detailsRes, splitRes, keysRes, leaderboardRes] = await Promise.all([
        fetch("/api/usage"),
        fetch("/api/user/info", { cache: 'no-store' }),
        fetch("/api/usage/details"),
        fetch("/api/usage/split"),
        fetch("/api/keys/me"),
        fetch("/api/leaderboard/opt-in"),
      ]);

      if (usageRes.ok) setUsageSummary(await usageRes.json());
      if (userRes.ok) {
        const newUserInfo = await userRes.json();
        
        // Debug logging
        console.log('User info received:', newUserInfo);
        console.log('Plan:', newUserInfo.plan);
        console.log('Subscription status:', newUserInfo.subscription_status);
        console.log('Current period end:', newUserInfo.current_period_end);
        console.log('Stripe customer ID:', newUserInfo.stripe_customer_id);
        
        // Check if user just upgraded to Pro or Max
        if (previousPlan === "starter" && (newUserInfo.plan === "pro" || newUserInfo.plan === "max")) {
          setShowWelcomePopup(true);
        }
        
        setPreviousPlan(newUserInfo.plan);
        setUserInfo(newUserInfo);
      }
      if (detailsRes.ok) {
        const detailsData = await detailsRes.json();
        setUsageDetails(detailsData.details || []);
        if (detailsData.summary) setUsageSummary(detailsData.summary);
      }
      if (splitRes.ok) {
        const splitData = await splitRes.json();
        setProviderSplit(splitData.split || []);
      }
      if (keysRes.ok) {
        const keysData = await keysRes.json();
        setMaskedKey(keysData.apiKeyMasked);
      }
      if (leaderboardRes.ok) {
        const leaderboardData = await leaderboardRes.json();
        setOptIn(Boolean(leaderboardData.enabled));
      }
      
      // Load full key from localStorage if available
      try {
        const storedKey = localStorage.getItem("edgar_provider_key");
        if (storedKey) setFullKey(storedKey);
      } catch {}
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [previousPlan]);

  const isSubscriptionActive = () => {
    // Starter plan is always active (free tier)
    if (userInfo?.plan === "starter") return true;
    
    if (!userInfo?.subscription_status) return false;
    if (!userInfo?.current_period_end) return false;
    
    const activeStatuses = ["active", "trialing"];
    const isActive = activeStatuses.includes(userInfo.subscription_status);
    const isNotExpired = new Date(userInfo.current_period_end) > new Date();
    
    return isActive && isNotExpired;
  };

  const isPaidSubscriptionActive = () => {
    // Only check for Pro/Max subscriptions
    if (userInfo?.plan === "starter") return false;
    
    if (!userInfo?.subscription_status) return false;
    if (!userInfo?.current_period_end) return false;
    
    const activeStatuses = ["active", "trialing"];
    const isActive = activeStatuses.includes(userInfo.subscription_status);
    const isNotExpired = new Date(userInfo.current_period_end) > new Date();
    
    return isActive && isNotExpired;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPlanLimit = (plan: string) => {
    switch (plan) {
      case "starter": return "5,000";
      case "pro": return "2M";
      case "max": return "10M";
      default: return "5,000";
    }
  };

  const getPlanPrice = (plan: string) => {
    switch (plan) {
      case "starter": return "Free";
      case "pro": return "$20";
      case "max": return "$100";
      default: return "Free";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
        <div className="flex space-x-3">
          {userInfo?.plan === "starter" && (
            <>
              <a
                href={`https://buy.stripe.com/8x28wQ7Qwa6zgps1KJ4Vy01?prefilled_email=${encodeURIComponent(session?.user?.email || '')}&client_reference_id=${session?.user?.email || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2"
              >
                Upgrade to Pro
              </a>
              <a
                href={`https://buy.stripe.com/7sYcN63AgceHb588974Vy02?prefilled_email=${encodeURIComponent(session?.user?.email || '')}&client_reference_id=${session?.user?.email || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium px-4 py-2"
              >
                Upgrade to Max
              </a>
            </>
          )}
          {userInfo?.plan === "pro" && (
            <a
              href={`https://buy.stripe.com/7sYcN63AgceHb588974Vy02?prefilled_email=${encodeURIComponent(session?.user?.email || '')}&client_reference_id=${session?.user?.email || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium px-4 py-2"
            >
              Upgrade to Max
            </a>
          )}
        </div>
      </div>
      {/* Subscription Status */}
      {userInfo && userInfo.plan !== "starter" && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white text-lg font-medium">Subscription Status</h2>
            <div className="flex items-center gap-2">
              {!userInfo.stripe_customer_id && (
                <span className="text-yellow-400 text-xs">Setting up billing...</span>
              )}
              <button
                onClick={handleManageSubscription}
                className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Manage Subscription
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex justify-between text-white/80 text-sm">
              <span>Plan:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                userInfo.plan === "max" ? "bg-yellow-900/30 text-yellow-400 border border-yellow-500/30" :
                userInfo.plan === "pro" ? "bg-purple-900/30 text-purple-400 border border-purple-500/30" :
                "bg-blue-900/30 text-blue-400 border border-blue-500/30"
              }`}>
                {userInfo.plan.charAt(0).toUpperCase() + userInfo.plan.slice(1)} ({getPlanPrice(userInfo.plan)})
              </span>
            </div>
            <div className="flex justify-between text-white/80 text-sm">
              <span>Status:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                isSubscriptionActive() ? "bg-green-900/30 text-green-400 border border-green-500/30" :
                "bg-red-900/30 text-red-400 border border-red-500/30"
              }`}>
                {isSubscriptionActive() ? "Active" : (userInfo.subscription_status || "Inactive")}
              </span>
            </div>
            {userInfo.current_period_end && (
              <div className="flex justify-between text-white/80 text-sm">
                <span>Renews:</span>
                <span className="text-white">{formatDate(userInfo.current_period_end)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-white/70 text-sm">This billing cycle</p>
          <p className="mt-2 text-3xl font-semibold text-white">{usageSummary?.total_charged?.toLocaleString() || "0"}</p>
          <p className="text-white/60 text-sm">Tokens used</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-white/70 text-sm">Plan</p>
          <p className="mt-2 text-3xl font-semibold text-white">{userInfo?.plan || "—"}</p>
          <p className="text-white/60 text-sm">Current plan</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-white/70 text-sm">Total usage</p>
          <p className="mt-2 text-3xl font-semibold text-white">{userInfo?.lifetime_usage?.toLocaleString() || "0"}</p>
          <p className="text-white/60 text-sm">Lifetime tokens</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-white/70 text-sm">Plan limit</p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {getPlanLimit(userInfo?.plan || "starter")}
          </p>
          <p className="text-white/60 text-sm">Per billing cycle</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-white text-lg font-medium mb-4">Provider split</h2>
          <div className="space-y-2">
            {providerSplit.length === 0 && <p className="text-white/60 text-sm">No usage yet</p>}
            {providerSplit.map((s) => (
              <div key={s.provider} className="flex items-center gap-2 text-white/80 text-sm">
                <div className="w-24 capitalize">{s.provider}</div>
                <div className="flex-1 bg-white/10 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${s.percent}%` }}
                  />
                </div>
                <div className="w-12 text-right">{s.percent}%</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-white text-lg font-medium mb-4">Token breakdown</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-white/80 text-sm">
              <span>Prompt tokens:</span>
              <span>{usageSummary?.total_prompt || 0}</span>
            </div>
            <div className="flex justify-between text-white/80 text-sm">
              <span>Completion tokens:</span>
              <span>{usageSummary?.total_completion || 0}</span>
            </div>
            <div className="flex justify-between text-white/80 text-sm">
              <span>Total tokens:</span>
              <span>{(usageSummary?.total_prompt || 0) + (usageSummary?.total_completion || 0)}</span>
            </div>
            <div className="flex justify-between text-purple-400 font-medium">
              <span>Total charged:</span>
              <span>{usageSummary?.total_charged?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-white text-lg font-medium mb-4">Billing Cycle Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between text-white/80 text-sm">
            <span>Cycle Start:</span>
            <span>{usageSummary?.billing_cycle_start ? new Date(usageSummary.billing_cycle_start).toLocaleDateString() : '—'}</span>
          </div>
          <div className="flex justify-between text-white/80 text-sm">
            <span>Next Charge:</span>
            <span>{usageSummary?.billing_charge_date ? new Date(usageSummary.billing_charge_date).toLocaleDateString() : '—'}</span>
          </div>
        </div>
      </div>

      <UsageGraph />

      <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-white text-lg font-medium">Recent API calls</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/60 border-b border-white/10">
                <th className="text-left py-2">Time</th>
                <th className="text-left py-2">Provider</th>
                <th className="text-left py-2">Model</th>
                <th className="text-right py-2">Prompt</th>
                <th className="text-right py-2">Completion</th>
                <th className="text-right py-2">Charged</th>
              </tr>
            </thead>
            <tbody>
              {usageDetails.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-white/60">No API calls yet</td>
                </tr>
              )}
              {usageDetails.map((detail, idx) => (
                <tr key={idx} className="border-b border-white/5">
                  <td className="py-2 text-white/80">{new Date(detail.timestamp).toLocaleString()}</td>
                  <td className="py-2 text-white/80 capitalize">{detail.provider}</td>
                  <td className="py-2 text-white/80">{detail.model}</td>
                  <td className="py-2 text-right text-white/60">{detail.prompt_tokens}</td>
                  <td className="py-2 text-right text-white/60">{detail.completion_tokens}</td>
                  <td className="py-2 text-right font-medium text-purple-400">
                    {detail.charged_tokens}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-white text-lg font-medium">Leaderboard</h2>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">Feature me on the public usage leaderboard</p>
            <p className="text-white/60 text-xs">We show masked email, plan, and monthly tokens</p>
          </div>
          <button
            onClick={async () => {
              const next = !optIn;
              setOptIn(next);
              await fetch("/api/leaderboard/opt-in", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: next }) });
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${optIn ? "bg-purple-600" : "bg-white/20"}`}
            aria-pressed={optIn}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${optIn ? "translate-x-5" : "translate-x-1"}`} />
          </button>
        </div>
        <a href="/leaderboard" className="mt-4 inline-block text-sm text-purple-400 hover:text-purple-300">View leaderboard →</a>
      </div>

      <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-white text-lg font-medium">API Keys</h2>
        <div className="mt-4 grid grid-cols-1 gap-4">
          <div>
            <label className="text-sm text-white/80">Edgar Provider Key</label>
            <div className="mt-1 flex gap-2">
              <input
                readOnly
                value={fullKey ?? maskedKey ?? "No key yet"}
                className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-white placeholder-white/40"
              />
              <button
                onClick={async () => {
                  const r = await fetch("/api/keys/issue", { method: "POST" });
                  const d = await r.json();
                  if (d.apiKey) {
                    await navigator.clipboard.writeText(d.apiKey);
                    setFullKey(d.apiKey);
                    setMaskedKey(d.apiKey.slice(0, 6) + "…" + d.apiKey.slice(-4));
                    try { localStorage.setItem("edgar_provider_key", d.apiKey); } catch {}
                  }
                }}
                className="rounded-md bg-purple-600 hover:bg-purple-500 text-white px-3 text-sm"
              >
                Generate
              </button>
              <button
                onClick={async () => {
                  if (!fullKey) return;
                  await navigator.clipboard.writeText(fullKey);
                }}
                className="rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-white px-3 text-sm"
              >
                Copy
              </button>
            </div>
            <p className="mt-2 text-xs text-white/60">We never show past keys again for security. The latest generated key is saved only in your browser.</p>
            <p className="mt-1 text-xs text-purple-400">New endpoint: <code className="bg-purple-900/50 px-1 rounded">/api/chat</code></p>
          </div>
        </div>
      </div>

      {/* Welcome Popup for New Pro/Max Users */}
      {showWelcomePopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md mx-4 border border-white/10">
            <div className="text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Welcome to {userInfo?.plan === "max" ? "Max" : "Pro"}!
              </h2>
              <p className="text-white/80 mb-6">
                You now have access to {userInfo?.plan === "max" ? "10 million" : "2 million"} tokens per month!
              </p>
              <div className="space-y-3 mb-6 text-left">
                <div className="flex items-center text-white/80">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Higher token limits</span>
                </div>
                <div className="flex items-center text-white/80">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Priority support</span>
                </div>
                <div className="flex items-center text-white/80">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Advanced features</span>
                </div>
              </div>
              <button
                onClick={() => setShowWelcomePopup(false)}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


