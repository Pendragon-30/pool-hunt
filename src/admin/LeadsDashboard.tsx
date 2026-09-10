import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import AdminNav from './AdminNav'

type Dealer = {
  id: string
  business_name: string
  status: string
}

type Lead = {
  id: string
  name: string
  email: string
  phone: string | null
  zip_code: string | null
  pool_type: string | null
  shape: string | null
  construction: string | null
  filtration: string | null
  heater: string | null
  cover: string | null
  budget_range: string | null
  timeline: string | null
  status: string
  dealer_id: string | null
  matched_at: string | null
  created_at: string
  render_url: string | null
  homeowner_email_sent_at: string | null
  dealer_email_sent_at: string | null
  dealers: { business_name: string } | null
  lead_fun_features: { fun_features: { name: string } | null }[]
}

const STATUSES = ['new', 'matched', 'contacted', 'quoted', 'won', 'lost']

function humanize(value: string | null) {
  if (!value) return '—'
  return value.replace(/_/g, ' ')
}

export default function LeadsDashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)

    const [leadsRes, dealersRes] = await Promise.all([
      supabase
        .from('leads')
        .select(
          `id, name, email, phone, zip_code, pool_type, shape, construction, filtration, heater, cover,
           budget_range, timeline, status, dealer_id, matched_at, created_at,
           render_url, homeowner_email_sent_at, dealer_email_sent_at,
           dealers ( business_name ),
           lead_fun_features ( fun_features ( name ) )`,
        )
        .order('created_at', { ascending: false }),
      supabase.from('dealers').select('id, business_name, status').order('business_name'),
    ])

    if (leadsRes.error) {
      setError(leadsRes.error.message)
    } else {
      setLeads((leadsRes.data ?? []) as unknown as Lead[])
    }

    if (!dealersRes.error) {
      setDealers(dealersRes.data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const updateStatus = async (leadId: string, status: string) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)))
    await supabase.from('leads').update({ status }).eq('id', leadId)
  }

  const assignDealer = async (leadId: string, dealerId: string) => {
    const matched_at = dealerId ? new Date().toISOString() : null
    const dealer = dealers.find((d) => d.id === dealerId)
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              dealer_id: dealerId || null,
              matched_at,
              dealers: dealer ? { business_name: dealer.business_name } : null,
            }
          : l,
      ),
    )
    await supabase
      .from('leads')
      .update({ dealer_id: dealerId || null, matched_at })
      .eq('id', leadId)

    // Assigning a dealer is the trigger for the "here's a full picture of
    // what this shopper wants" email -- fire it the moment a real dealer
    // is chosen (not on unassign). send-lead-email looks up the dealer's
    // email itself and just no-ops if it's missing, so no need to check
    // for that here.
    if (dealerId) {
      supabase.functions.invoke('send-lead-email', { body: { leadId, type: 'dealer' } }).catch((err) => {
        console.error('Failed to send dealer notification email', err)
      })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav onRefresh={loadData} />

      <main className="mx-auto max-w-6xl px-6 py-6">
        <h1 className="mb-4 text-lg font-semibold text-slate-900">Leads</h1>

        {loading && <p className="text-sm text-slate-500">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && leads.length === 0 && (
          <p className="text-sm text-slate-500">No leads yet.</p>
        )}

        {!loading && leads.length > 0 && (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Preferences</th>
                  <th className="px-4 py-3">Fun extras</th>
                  <th className="px-4 py-3">Budget / Timeline</th>
                  <th className="px-4 py-3">Dealer</th>
                  <th className="px-4 py-3">Emails</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{lead.name}</div>
                      <div className="text-slate-500">{lead.email}</div>
                      {lead.phone && <div className="text-slate-500">{lead.phone}</div>}
                      {lead.zip_code && <div className="text-slate-500">Zip: {lead.zip_code}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>Type: {humanize(lead.pool_type)}</div>
                      <div>Shape: {humanize(lead.shape)}</div>
                      <div>Construction: {humanize(lead.construction)}</div>
                      <div>Filtration: {humanize(lead.filtration)}</div>
                      <div>Heater: {humanize(lead.heater)}</div>
                      <div>Cover: {humanize(lead.cover)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {lead.lead_fun_features.length > 0
                        ? lead.lead_fun_features
                            .map((f) => f.fun_features?.name)
                            .filter(Boolean)
                            .join(', ')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{humanize(lead.budget_range)}</div>
                      <div>{humanize(lead.timeline)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.dealer_id ?? ''}
                        onChange={(e) => assignDealer(lead.id, e.target.value)}
                        className="rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="">Unassigned</option>
                        {dealers.map((dealer) => (
                          <option key={dealer.id} value={dealer.id}>
                            {dealer.business_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>Homeowner: {lead.homeowner_email_sent_at ? '✓ sent' : '—'}</div>
                      <div>Dealer: {lead.dealer_email_sent_at ? '✓ sent' : '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        className="rounded-lg border px-2 py-1.5 text-sm capitalize outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
