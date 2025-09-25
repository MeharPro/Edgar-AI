import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-white/60 text-sm">© {new Date().getFullYear()} Edgar. All rights reserved.</p>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/tos" className="text-white/70 hover:text-white">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}

