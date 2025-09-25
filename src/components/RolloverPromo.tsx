export default function RolloverPromo() {
  return (
    <section id="rollover" className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-950/50 via-purple-900/30 to-black p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-2">
              <h3 className="text-3xl font-semibold text-white tracking-tight">Token Rollover</h3>
              <p className="mt-3 text-white/80 max-w-2xl">
                Unused tokens automatically roll into your next billing cycle, boosting your monthly allowance. We cap rollover at your plan limit and apply it at cycle start — fully automatic and visible in your dashboard.
              </p>
              <ul className="mt-6 space-y-2 text-white/80 text-sm">
                <li className="flex items-start gap-2"><span className="mt-1 size-1.5 rounded-full bg-purple-400" /> Carries over unused tokens from the previous cycle</li>
                <li className="flex items-start gap-2"><span className="mt-1 size-1.5 rounded-full bg-purple-400" /> Capped at one month of your plan limit</li>
                <li className="flex items-start gap-2"><span className="mt-1 size-1.5 rounded-full bg-purple-400" /> Always-on, no setup required</li>
              </ul>
            </div>
            <div className="md:justify-self-end w-full">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
                <p className="text-white/70 text-sm">Example</p>
                <p className="mt-2 text-white text-2xl font-semibold">Base 5,000 + Rollover 2,300</p>
                <p className="text-white/60 text-sm">Effective limit: 7,300 tokens</p>
                <p className="mt-3 text-xs text-white/50">Rollover reflects unused tokens from the immediately prior cycle.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

