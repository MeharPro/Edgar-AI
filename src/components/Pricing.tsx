type Tier = {
  name: string;
  price: string;
  tagline: string;
  tokens: string;
  features: string[];
  highlight?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Starter",
    price: "$0",
    tagline: "Free to start",
    tokens: "5K tokens/mo",
    features: [
      "GPT‑5, Claude 4.1 Opus, Gemini 2.5 Pro",
      "Model routing controls",
      "Security guardrails",
    ],
  },
  {
    name: "Pro",
    price: "$20",
    tagline: "Scale confidently",
            tokens: "2M tokens/mo",
    features: [
      "Priority capacity",
      "Faster plan/act cycles",
      "Checkpoints & rollback",
    ],
    highlight: true,
  },
  {
    name: "Max",
    price: "$100",
    tagline: "Everything, unlimited",
    tokens: "Unlimited tokens",
    features: [
      "Unlimited usage",
      "Enterprise readiness",
      "Premium support",
    ],
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold text-white tracking-tight text-center">
          Simple API pricing
        </h2>
        <p className="mt-3 text-center text-white/70 max-w-2xl mx-auto">
          One provider. Premium models. Predictable tokens. Cancel anytime.
        </p>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border p-6 bg-white/5 ${
                tier.highlight
                  ? "border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.35)]"
                  : "border-white/10 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-white text-lg font-medium">{tier.name}</h3>
                <span className="text-white/70 text-sm">{tier.tagline}</span>
              </div>
              <div className="mt-4 flex items-end gap-2">
                <p className="text-4xl font-semibold text-white">{tier.price}</p>
                <span className="text-white/60">/mo</span>
              </div>
              <p className="mt-2 text-white/80">{tier.tokens}</p>
              <ul className="mt-6 space-y-2 text-white/75 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/signin"
                className={`mt-6 inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  tier.highlight
                    ? "bg-purple-600 hover:bg-purple-500 text-white"
                    : "border border-white/15 bg-white/5 hover:bg-white/10 text-white"
                }`}
              >
                {tier.name === "Starter" ? "Get started free" : `Choose ${tier.name}`}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


