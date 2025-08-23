"use client";

import { useEffect, useState, useCallback } from "react";

type LeaderboardEntry = {
  id: string;
  name: string;
  email: string;
  tokens: number;
};

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [type, setType] = useState<'lifetime' | 'monthly'>('lifetime');
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/leaderboard?type=${type}`);
      const data = await response.json();
      setLeaderboard(data.data || []);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const getMedal = (index: number) => {
    switch (index) {
      case 0: return "🥇";
      case 1: return "🥈";
      case 2: return "🥉";
      default: return "";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Leaderboard</h1>
          <p className="text-white/70 text-lg">
            See who&apos;s using Edgar the most
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex gap-2 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setType('lifetime')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                type === 'lifetime'
                  ? 'bg-purple-600 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Lifetime
            </button>
            <button
              onClick={() => setType('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                type === 'monthly'
                  ? 'bg-purple-600 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              This Month
            </button>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              {type === 'lifetime' ? 'All Time' : 'This Month'} Top Users
            </h2>
            {leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/60">No data available yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{getMedal(index)}</span>
                      <div>
                        <p className="text-white font-medium">
                          {entry.name || entry.email.split('@')[0]}
                        </p>
                        <p className="text-white/60 text-sm">
                          {entry.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">
                        {formatTokens(entry.tokens)} tokens
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


