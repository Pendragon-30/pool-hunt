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
  },
  {
    title: 'Get a free photorealistic preview',
    body: 'See a realistic rendering of your exact pool — shape, size, and every feature — before you talk pricing with anyone.',
  },
  {
    title: 'The quote comes to you',
    body: "A reputable, vetted local builder reaches out to you — already knowing exactly what you're looking for. No calling around.",
  },
]

const BENEFITS = [
  {
    title: 'One form, not five phone calls',
    body: 'Tell us what you want once. Skip repeating your shape, size, and budget to a different contractor every time you pick up the phone.',
  },
  {
    title: 'See it before you buy',
    body: 'A free photorealistic rendering of your exact pool configuration, generated just for you — not a generic stock photo.',
  },
  {
    title: 'Reputable builders only',
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
        <section className="bg-gradient-to-b from-navy-950 to-navy-900 text-white">
          <div className="mx-auto max-w-5xl px-6 py-16 text-center sm:py-24">
            <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
              Stop hunting for quotes. <span className="text-sky-400">Let them come to you.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg text-navy-200 sm:text-xl">
              Tell us what you're looking for once — a reputable local builder reaches out to you,
              plus you get a free photorealistic preview of your exact pool.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={() =>
                  document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
                className="rounded-md bg-sky-400 px-8 py-3.5 text-base font-semibold text-navy-950 transition-colors hover:bg-sky-300"
              >
                Design my pool — it's free
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
        </section>

        {/* How it works */}
        <section className="bg-white px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <Reveal className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">How it works</h2>
              <p className="mx-auto mt-3 max-w-xl text-slate-600">
                Three quick steps between filling out one form and a real quote landing in your
                inbox — no calling around required.
              </p>
            </Reveal>

            <div className="mt-14 grid gap-10 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <Reveal key={step.title} delay={i * 100} className="border-t-2 border-navy-800 pt-5 text-left">
                  <div className="text-3xl font-extrabold text-navy-800">{`0${i + 1}`}</div>
                  <h3 className="mt-3 text-lg font-semibold text-navy-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Lead form */}
        <section id="lead-form" className="scroll-mt-20 bg-slate-50 px-6 py-20">
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
            <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {BENEFITS.map((b, i) => (
                <Reveal key={b.title} delay={(i % 2) * 100} className="flex gap-3">
                  <CheckIcon className="mt-1 shrink-0 text-navy-700" />
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
              className="mt-7 inline-flex items-center gap-2 rounded-md bg-sky-400 px-7 py-3 text-sm font-semibold text-navy-950 transition-colors hover:bg-sky-300"
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
