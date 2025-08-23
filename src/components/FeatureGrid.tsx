type Feature = {
  title: string;
  points: string[];
};

const FEATURES: Feature[] = [
  {
    title: "Cross‑platform app creation",
    points: [
      "Web (React/Next/HTML/CSS/JS)",
      "Desktop (Tauri for macOS/Windows/Linux)",
      "Mobile (Expo/Flutter)",
    ],
  },
  {
    title: "Vast UI options & customization",
    points: [
      "Agent theme selector & palettes",
      "Rich settings: API, Features, Browser, Terminal, Debug",
      "Model routing & UX toggles",
    ],
  },
  {
    title: "Smart coding core",
    points: [
      "Symbol memory — no duplicate variables/functions",
      "AST‑safe editing & precise refactors",
      "Regression locks & invariants",
    ],
  },
  {
    title: "Powerful workflows & interaction",
    points: [
      "Plan & Act with strict mode",
      "@ Mentions from files, terminal, git, URLs",
      "Slash commands, shortcuts, and quick actions",
    ],
  },
  {
    title: "Reliability & safety",
    points: [
      "Security guardrails (Semgrep, deps audits)",
      "Checkpoints & rollback",
      "Budgets & plans with progress",
    ],
  },
  {
    title: "Integrations & readiness",
    points: [
      "MCP ecosystem & marketplace tools",
      "Multi‑provider models & browsers",
      "Enterprise docs & remote connections",
    ],
  },
];

export default function FeatureGrid() {
  return (
    <section id="features" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold text-white tracking-tight text-center">
          Build anything: web, desktop, mobile
        </h2>
        <p className="mt-3 text-center text-white/70 max-w-3xl mx-auto">
          Edgar plans, acts, and ships real artifacts with premium guardrails and developer ergonomics.
        </p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/7.5 transition-colors shadow-[0_0_25px_rgba(168,85,247,0.15)]"
            >
              <h3 className="text-white font-medium text-lg">{f.title}</h3>
              <ul className="mt-3 space-y-2 text-white/75 text-sm">
                {f.points.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


