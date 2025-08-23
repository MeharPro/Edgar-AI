import Hero from "@/components/Hero";
import FeatureGrid from "@/components/FeatureGrid";
import Pricing from "@/components/Pricing";

export default function Home() {
  return (
    <>
      <Hero />
      <FeatureGrid />
      <Pricing />
      <section id="security" className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-semibold text-white">Security, reliability, and speed</h3>
          <p className="mt-3 text-white/70 max-w-3xl mx-auto">
            Semgrep checks, dependency audits, checkpoints with rollback, and budgets for predictable runs.
          </p>
        </div>
      </section>
    </>
  );
}
