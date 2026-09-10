import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import Reveal from '../components/Reveal'

const emptyForm = {
  business_name: '',
  contact_name: '',
  email: '',
  phone: '',
  website: '',
  city: '',
  state: '',
  primary_zip: '',
  notes: '',
}

const STEPS = [
  {
    title: 'Tell us about your business',
    body: 'Where you build, what you specialize in, and the service area you want leads from.',
  },
  {
    title: 'We review and reach out',
    body: 'We onboard dealers one at a time so every partner gets real attention — we’ll follow up to confirm details and your zip codes.',
  },
  {
    title: 'Start receiving leads',
    body: 'Once you’re live, matched shoppers land in your inbox — ready to talk budget and timeline.',
  },
]

const BENEFITS = [
  'Buyers who already told us their budget, timeline, and must-haves',
  'No bidding wars — leads aren’t sold to five competitors at once',
  'Onboarded one dealer at a time, with real follow-up, not a self-serve signup form',
]

const fieldClasses =
  'mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-navy-600 focus:ring-2 focus:ring-navy-100'

export default function ForDealers() {
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.business_name.trim() || !form.contact_name.trim() || !form.email.trim()) {
      setError('Please fill in your business name, contact name, and email.')
      return
    }

    setSubmitting(true)

    // Generate the id client-side — the public site can INSERT a dealer
    // interest submission but should never be able to read dealer records
    // back (that table holds contact info for real partners too).
    const dealerId = crypto.randomUUID()

    const { error: insertError } = await supabase.from('dealers').insert({
      id: dealerId,
      business_name: form.business_name.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
      phone: form.phone || null,
      website: form.website || null,
      city: form.city || null,
      state: form.state || null,
      primary_zip: form.primary_zip || null,
      notes: form.notes || null,
      source: 'inbound',
      status: 'onboarding',
    })

    setSubmitting(false)

    if (insertError) {
      setError('Something went wrong submitting your info. Please try again.')
      return
    }

    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      <main>
        <section className="bg-gradient-to-b from-navy-950 to-navy-900 text-white">
          <div className="mx-auto max-w-4xl px-6 py-16 text-center sm:py-24">
            <span className="inline-flex items-center rounded-md border border-white/15 px-3 py-1 text-xs font-medium tracking-wide text-sky-200">
              For pool dealers &amp; builders
            </span>
            <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
              Get matched with buyers <span className="text-sky-400">actively shopping</span> in your
              area.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-navy-200">
              We send pool shoppers who've told us exactly what they want — budget, timeline, and the
              features that matter to them — straight to a trusted local builder.
            </p>
          </div>
        </section>

        <section className="bg-white px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-10 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 100} className="border-t-2 border-navy-800 pt-5 text-left">
                  <div className="text-3xl font-extrabold text-navy-800">{`0${i + 1}`}</div>
                  <h3 className="mt-3 font-semibold text-navy-900">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </Reveal>
              ))}
            </div>

            <Reveal className="mx-auto mt-16 max-w-2xl border-t border-slate-200 pt-8">
              <ul className="space-y-3">
                {BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-navy-900">
                    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-navy-700">
                      <path d="M5 12.5 10 17 19 7" />
                    </svg>
                    {b}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        <section className="bg-slate-50 px-6 py-20">
          <Reveal className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            {submitted ? (
              <div className="text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy-800 text-white">
                  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5 10 17 19 7" />
                  </svg>
                </span>
                <h2 className="mt-4 text-xl font-bold text-navy-900">Thanks — we'll be in touch.</h2>
                <p className="mt-2 text-slate-600">
                  We've got your info and will reach out shortly to talk about getting you set up.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-navy-900">Partner with us</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Tell us a bit about your business and we'll follow up.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <label className="block text-sm font-semibold text-navy-900">
                    Business name *
                    <input
                      required
                      value={form.business_name}
                      onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                      className={fieldClasses}
                    />
                  </label>

                  <label className="block text-sm font-semibold text-navy-900">
                    Your name *
                    <input
                      required
                      value={form.contact_name}
                      onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                      className={fieldClasses}
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block text-sm font-semibold text-navy-900">
                      Email *
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className={fieldClasses}
                      />
                    </label>
                    <label className="block text-sm font-semibold text-navy-900">
                      Phone
                      <input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className={fieldClasses}
                      />
                    </label>
                  </div>

                  <label className="block text-sm font-semibold text-navy-900">
                    Website
                    <input
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      className={fieldClasses}
                    />
                  </label>

                  <div className="grid grid-cols-3 gap-4">
                    <label className="block text-sm font-semibold text-navy-900">
                      City
                      <input
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className={fieldClasses}
                      />
                    </label>
                    <label className="block text-sm font-semibold text-navy-900">
                      State
                      <input
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                        className={fieldClasses}
                      />
                    </label>
                    <label className="block text-sm font-semibold text-navy-900">
                      Zip code
                      <input
                        value={form.primary_zip}
                        onChange={(e) => setForm({ ...form, primary_zip: e.target.value })}
                        className={fieldClasses}
                      />
                    </label>
                  </div>

                  <label className="block text-sm font-semibold text-navy-900">
                    Anything else we should know?
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className={fieldClasses}
                    />
                  </label>

                  {error && <p className="text-sm font-medium text-red-600">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-md bg-navy-900 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Request to partner'}
                  </button>
                </form>
              </>
            )}
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
