"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import Logo from "./Logo";
import { useState } from "react";

export function Navbar() {
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Don't render until session is loaded
  if (status === "loading") {
    return (
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <Logo src="/edgar-logo-nav-svg.svg" className="h-8 w-auto invert" />
              </Link>
            </div>
            <div className="text-white/60 text-sm">Loading...</div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Logo src="/edgar-logo-nav-svg.svg" className="h-8 w-auto invert" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                href="/"
                className="text-white/60 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Home
              </Link>
              <Link
                href="/docs"
                className="text-white/60 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Documentation
              </Link>
              <Link
                href="/leaderboard"
                className="text-white/60 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Leaderboard
              </Link>
              <a
                href="https://marketplace.visualstudio.com/items?itemName=DaybotSolutionsInc.edgar-vibe-coding-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Download Extension
              </a>
              {session && (
                <Link
                  href="/dashboard"
                  className="text-white/60 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center">
            {session ? (
              <div className="flex items-center space-x-4">
                <span className="text-white/80 text-sm">{session.user?.name || session.user?.email}</span>
                <Link
                  href="/signout"
                  className="rounded-md bg-white/10 hover:bg-white/20 text-white px-3 py-2 text-sm font-medium transition-colors"
                >
                  Sign out
                </Link>
              </div>
            ) : (
              <Link
                href="/signin"
                className="rounded-md bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 text-sm font-medium transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white/60 hover:text-white p-2 rounded-md"
              aria-label="Toggle mobile menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-black/50 backdrop-blur-xl rounded-lg mt-2">
              <Link
                href="/"
                className="text-white/60 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/docs"
                className="text-white/60 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Documentation
              </Link>
              <Link
                href="/leaderboard"
                className="text-white/60 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Leaderboard
              </Link>
              <a
                href="https://marketplace.visualstudio.com/items?itemName=DaybotSolutionsInc.edgar-vibe-coding-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Download Extension
              </a>
              {session && (
                <Link
                  href="/dashboard"
                  className="text-white/60 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}
              
              {/* Mobile Auth */}
              <div className="border-t border-white/10 pt-3 mt-3">
                {session ? (
                  <div className="space-y-2">
                    <div className="px-3 py-2 text-white/80 text-sm">
                      {session.user?.name || session.user?.email}
                    </div>
                    <Link
                      href="/signout"
                      className="text-white/60 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign out
                    </Link>
                  </div>
                ) : (
                  <Link
                    href="/signin"
                    className="rounded-md bg-purple-600 hover:bg-purple-500 text-white block px-3 py-2 text-base font-medium transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

