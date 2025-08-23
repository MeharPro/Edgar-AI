import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Edgar - Unified AI API",
  description: "Access GPT-5, Claude, and Gemini through a single API",
  icons: {
    icon: "/edgar-logo-nav-svg.svg",
    shortcut: "/edgar-logo-nav-svg.svg",
    apple: "/edgar-logo-nav-svg.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-gradient-radial min-h-screen`}>
        <Providers>
          <div className="relative min-h-screen text-white">
            <div
              aria-hidden
              className="pointer-events-none fixed inset-0 -z-10 bg-grid-purple/10 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
            />
            <Navbar />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
