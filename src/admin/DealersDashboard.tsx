import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import AdminNav from './AdminNav'

type ServiceArea = {
  id: string
  zip_code: string
  city: string | null
  state: string | null
}

type Dealer = {
  id: string
  business_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  city: string | null
  state: string | null
  primary_zip: string | null
  source: string
  status: string
  notes: string | null
  created_at: string
  dealer_service_areas: ServiceArea[]
}

const SOURCES = [
  { value: 'hth_relationship', label: 'Hot Tub Hunt relationship' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'other', label: 'Other' },
]

const STATUSES = ['onboarding', 'active', 'paused']

const emptyForm = {
  business_name: '',
  contact_name: '',
  email: '',
  phone: '',
  website: '',
  city: '',
  state: '',
  primary_zip: '',
  source: 'hth_relationship',
  notes: '',
}

export default function DealersDashboard() {
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [zipDraft, setZipDraft] = useState({ zip_code: '', city: '', state: '' })
  const [zipSaving, setZipSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('dealers')
      .select(
        `id, business_name, contact_name, email, phone, website, city, state, primary_zip,
         source, status, notes, created_at,
         dealer_service_areas ( id, zip_code, city, state )`,
      )
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setDealers((data ?? []) as unknown as Dealer[])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const updateStatus = async (dealerId: string, status: string) => {
    setDealers((prev) => prev.map((d) => (d.id === dealerId ? { ...d, status } : d)))
    await supabase.from('dealers').update({ status }).eq('id', dealerId)
  }

  const handleAddDealer = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!form.business_name.trim()) {
      setFormError('Business name is required.')
      return
    }

    setSaving(true)
    const { error } = await supabase.from('dealers').insert({
      business_name: form.business_name.trim(),
      contact_name: form.contact_name || null,
      email: form.email || null,
      phone: form.phone || null,
      website: form.website || null,
      city: form.city || null,
      state: form.state || null,
      primary_zip: form.primary_zip || null,
      source: form.source,
      notes: form.notes || null,
    })
    setSaving(false)

    if (error) {
      setFormError('Could not save that dealer. Please try again.')
      return
    }

    setForm(emptyForm)
    setShowForm(false)
    loadData()
  }

  const addServiceArea = async (dealerId: string) => {
    if (!zipDraft.zip_code.trim()) return
    setZipSaving(true)
    await supabase.from('dealer_service_areas').insert({
      dealer_id: dealerId,
      zip_code: zipDraft.zip_code.trim(),
      city: zipDraft.city || null,
      state: zipDraft.state || null,
    })
    setZipDraft({ zip_code: '', city: '', state: '' })
    setZipSaving(false)
    loadData()
  }

  const removeServiceArea = async (areaId: string) => {
    await supabase.from('dealer_service_areas').delete().eq('id', areaId)
    loadData()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav onRefresh={loadData} />

      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Dealers</h1>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
          >
            {showForm ? 'Cancel' : 'Add dealer'}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleAddDealer}
            className="mb-6 grid grid-cols-1 gap-4 rounded-xl border bg-white p-6 sm:grid-cols-2"
          >
            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Business name *
              <input
                required
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Contact name
              <input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
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

            <label className="block text-sm font-medium text-slate-700">
              Website
              <input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              />
            </label>

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
              Primary zip
              <input
                value={form.primary_zip}
                onChange={(e) => setForm({ ...form, primary_zip: e.target.value })}
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Source
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              >
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Notes
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              />
            </label>

            {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save dealer'}
              </button>
            </div>
          </form>
        )}

        {loading && <p className="text-sm text-slate-500">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && dealers.length === 0 && (
          <p className="text-sm text-slate-500">No dealers yet. Add your first one above.</p>
        )}

        {!loading && dealers.length > 0 && (
          <div className="space-y-3">
            {dealers.map((dealer) => (
              <div key={dealer.id} className="rounded-xl border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">{dealer.business_name}</div>
                    <div className="text-sm text-slate-500">
                      {dealer.contact_name && <span>{dealer.contact_name} · </span>}
                      {dealer.email && <span>{dealer.email} · </span>}
                      {dealer.phone && <span>{dealer.phone}</span>}
                    </div>
                    <div className="text-sm text-slate-500">
                      {[dealer.city, dealer.state, dealer.primary_zip].filter(Boolean).join(', ') || '—'}
                      {' · '}
                      {SOURCES.find((s) => s.value === dealer.source)?.label ?? dealer.source}
                    </div>
                    {dealer.notes && (
                      <div className="mt-1 text-sm text-slate-500">{dealer.notes}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={dealer.status}
                      onChange={(e) => updateStatus(dealer.id, e.target.value)}
                      className="rounded-lg border px-2 py-1.5 text-sm capitalize outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setExpandedId(expandedId === dealer.id ? null : dealer.id)}
                      className="rounded-lg border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      {expandedId === dealer.id
                        ? 'Hide service area'
                        : `Service area (${dealer.dealer_service_areas.length})`}
                    </button>
                  </div>
                </div>

                {expandedId === dealer.id && (
                  <div className="mt-4 border-t pt-4">
                    {dealer.dealer_service_areas.length === 0 ? (
                      <p className="text-sm text-slate-500">No zip codes added yet.</p>
                    ) : (
                      <ul className="mb-3 flex flex-wrap gap-2">
                        {dealer.dealer_service_areas.map((area) => (
                          <li
                            key={area.id}
                            className="flex items-center gap-2 rounded-full border bg-slate-50 px-3 py-1 text-sm text-slate-600"
                          >
                            <span>
                              {area.zip_code}
                              {area.city ? ` (${area.city}${area.state ? `, ${area.state}` : ''})` : ''}
                            </span>
                            <button
                              onClick={() => removeServiceArea(area.id)}
                              className="text-slate-400 hover:text-red-600"
                              aria-label={`Remove ${area.zip_code}`}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex flex-wrap items-end gap-2">
                      <label className="text-sm text-slate-700">
                        Zip code
                        <input
                          value={zipDraft.zip_code}
                          onChange={(e) => setZipDraft({ ...zipDraft, zip_code: e.target.value })}
                          className="mt-1 block w-28 rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </label>
                      <label className="text-sm text-slate-700">
                        City (optional)
                        <input
                          value={zipDraft.city}
                          onChange={(e) => setZipDraft({ ...zipDraft, city: e.target.value })}
                          className="mt-1 block w-36 rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </label>
                      <label className="text-sm text-slate-700">
                        State (optional)
                        <input
                          value={zipDraft.state}
                          onChange={(e) => setZipDraft({ ...zipDraft, state: e.target.value })}
                          className="mt-1 block w-20 rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </label>
                      <button
                        onClick={() => addServiceArea(dealer.id)}
                        disabled={zipSaving}
                        className="rounded-lg border border-sky-700 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-50"
                      >
                        {zipSaving ? 'Adding...' : 'Add zip'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
