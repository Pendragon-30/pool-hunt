import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-bold text-sky-700 sm:text-xl">
            Design My Swimming Pool
          </Link>
          <nav className="text-sm text-slate-600">
            <Link to="/" className="hover:text-sky-700">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Get matched with buyers actively shopping in your area.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            We send pool shoppers who've told us exactly what they want — budget,
            timeline, and the features that matter to them — straight to a
            trusted local builder. No bidding wars, no shared leads sold to five
            competitors at once.
          </p>
        </section>

        <section className="border-t bg-white px-6 py-16">
          <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-sky-700">1</div>
              <h3 className="mt-2 font-semibold">Tell us about your business</h3>
              <p className="mt-1 text-sm text-slate-600">
                Where you build, what you specialize in, and the service area you
                want leads from.
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-sky-700">2</div>
              <h3 className="mt-2 font-semibold">We review and reach out</h3>
              <p className="mt-1 text-sm text-slate-600">
                We onboard dealers one at a time so every partner gets real
                attention — we'll follow up to confirm details and your zip
                codes.
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-sky-700">3</div>
              <h3 className="mt-2 font-semibold">Start receiving leads</h3>
              <p className="mt-1 text-sm text-slate-600">
                Once you're live, matched shoppers land in your inbox — ready to
                talk budget and timeline.
              </p>
            </div>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto max-w-xl rounded-2xl border bg-white p-8 shadow-sm">
            {submitted ? (
              <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-900">
                  Thanks — we'll be in touch.
                </h2>
                <p className="mt-2 text-slate-600">
                  We've got your info and will reach out shortly to talk about
                  getting you set up.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-slate-900">
                  Partner with us
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Tell us a bit about your business and we'll follow up.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <label className="block text-sm font-medium text-slate-700">
                    Business name *
                    <input
                      required
                      value={form.business_name}
                      onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                      className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Your name *
                    <input
                      required
                      value={form.contact_name}
                      onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                      className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block text-sm font-medium text-slate-700">
                      Email *
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Phone
                      <input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </label>
                  </div>

                  <label className="block text-sm font-medium text-slate-700">
                    Website
                    <input
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </label>

                  <div className="grid grid-cols-3 gap-4">
                    <label className="block text-sm font-medium text-slate-700">
                      City
                      <input
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      State
                      <input
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                        className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Zip code
                      <input
                        value={form.primary_zip}
                        onChange={(e) => setForm({ ...form, primary_zip: e.target.value })}
                        className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </label>
                  </div>

                  <label className="block text-sm font-medium text-slate-700">
                    Anything else we should know?
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </label>

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Request to partner'}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
