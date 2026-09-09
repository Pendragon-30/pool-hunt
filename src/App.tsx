import { Link } from 'react-router-dom'
import LeadForm from './components/LeadForm'
import SiteHeader from './components/SiteHeader'
import SiteFooter from './components/SiteFooter'
import Reveal from './components/Reveal'

const TRUST_ITEMS = ['100% free to use', 'No obligation to buy', 'Vetted local builders only']

const STEPS = [
  {
    title: 'Tell us about your pool',
    body: "Shape, size, materials, and the extras you want — takes about two minutes, no account required.",
    icon: (
      <path d="M4 17l6-6 4 4 6-8M4 17v3h16v-3" />
    ),
  },
  {
    title: "Get a free photorealistic preview",
    body: 'See a realistic rendering of your exact pool — shape, size, and every feature — before you talk pricing with anyone.',
    icon: <path d="M4 5h16v14H4zM4 15l4-4 4 4 4-6 4 4" />,
  },
  {
    title: 'Get matched with a trusted builder',
    body: "We connect you with a reputable, vetted dealer in your area who already knows exactly what you're looking for.",
    icon: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
  },
]

const BENEFITS = [
  {
    title: 'Unbiased, exhaustive comparisons',
    body: 'Every shape, size, material, and feature combination — laid out clearly so you know exactly what you’re choosing between.',
  },
  {
    title: 'See it before you buy',
    body: 'A free photorealistic rendering of your exact pool configuration, generated just for you — not a generic stock photo.',
  },
  {
    title: 'Reputable dealers only',
    body: 'We connect you with builders who’ve earned their spot — not the highest bidder, and never a shared lead sold to five competitors.',
  },
  {
    title: 'No pressure, ever',
    body: 'Submit your info once, hear from a real local builder, and decide on your own timeline. No spam, no cold-call bombardment.',
  },
]

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12.5 10 17 19 7" />
    </svg>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-navy-800 text-white">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-40 h-80 w-80 animate-float rounded-full bg-sky-400/10 blur-3xl" />

          <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-16 text-center sm:pb-28 sm:pt-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-sky-200">
              The definitive pool-shopping comparison tool
            </span>

            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
              Get matched with a pool builder <span className="text-sky-400">you can trust.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg text-navy-200 sm:text-xl">
              Tell us what you're looking for and we'll connect you with a reputable local dealer —
              plus a free photorealistic preview of your exact pool.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={() =>
                  document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
                className="group inline-flex items-center gap-2 rounded-full bg-sky-400 px-8 py-3.5 text-base font-semibold text-navy-950 shadow-lg shadow-sky-500/20 transition-all hover:-translate-y-0.5 hover:bg-sky-300 hover:shadow-xl hover:shadow-sky-500/30 active:translate-y-0"
              >
                Design my pool — it's free
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>

            <div className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-navy-200">
              {TRUST_ITEMS.map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CheckIcon className="text-sky-400" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative h-10 bg-gradient-to-b from-transparent to-white/0" />
        </section>

        {/* How it works */}
        <section className="bg-white px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <Reveal className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">How it works</h2>
              <p className="mx-auto mt-3 max-w-xl text-slate-600">
                Three quick steps between where you are now and a real quote from a builder worth
                trusting.
              </p>
            </Reveal>

            <div className="relative mt-14 grid gap-10 sm:grid-cols-3">
              <div className="pointer-events-none absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-sky-200 to-transparent sm:block" />
              {STEPS.map((step, i) => (
                <Reveal key={step.title} delay={i * 120} className="relative text-center">
                  <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-navy-700 text-white shadow-md shadow-sky-900/10">
                    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      {step.icon}
                    </svg>
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white ring-4 ring-white">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-navy-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Lead form */}
        <section id="lead-form" className="scroll-mt-20 bg-gradient-to-b from-sky-50 to-white px-6 py-20">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
              Design your pool in two minutes
            </h2>
            <p className="mt-3 text-slate-600">
              Answer a few quick questions and we'll match you with a builder — plus generate a free
              rendering of your exact pool.
            </p>
          </Reveal>
          <Reveal>
            <LeadForm />
          </Reveal>
        </section>

        {/* Benefits */}
        <section className="bg-white px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <Reveal className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
                Why homeowners start here
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {BENEFITS.map((b, i) => (
                <Reveal
                  key={b.title}
                  delay={(i % 2) * 100}
                  className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-navy-700">
                    <CheckIcon />
                  </span>
                  <div>
                    <h3 className="font-semibold text-navy-900">{b.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{b.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Dealer CTA banner */}
        <section className="bg-navy-950 px-6 py-16 text-center text-white">
          <Reveal>
            <h2 className="text-2xl font-bold sm:text-3xl">Are you a pool dealer or builder?</h2>
            <p className="mx-auto mt-3 max-w-xl text-navy-200">
              Get matched with buyers actively searching in your area — no bidding wars, no shared
              leads.
            </p>
            <Link
              to="/for-dealers"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-sky-400 px-7 py-3 text-sm font-semibold text-navy-950 shadow-md transition-all hover:-translate-y-0.5 hover:bg-sky-300 hover:shadow-lg active:translate-y-0"
            >
              Learn more
            </Link>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

export default App
