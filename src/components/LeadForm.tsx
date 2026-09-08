import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Tables } from '../lib/database.types'

type FunFeature = Tables<'fun_features'>

const POOL_TYPES = [
  { value: 'inground', label: 'Inground' },
  { value: 'above_ground', label: 'Above-ground' },
  { value: 'undecided', label: "I'm not sure yet" },
]

const SHAPES = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'freeform', label: 'Freeform' },
  { value: 'kidney', label: 'Kidney' },
  { value: 'oval', label: 'Oval' },
  { value: 'round', label: 'Round' },
  { value: 'lap', label: 'Lap pool' },
  { value: 'custom', label: 'Custom' },
  { value: 'undecided', label: "I'm not sure yet" },
]

const CONSTRUCTIONS = [
  { value: 'fiberglass', label: 'Fiberglass' },
  { value: 'vinyl_liner', label: 'Vinyl liner' },
  { value: 'concrete_gunite', label: 'Concrete / gunite' },
  { value: 'undecided', label: "I'm not sure yet" },
]

const FILTRATIONS = [
  { value: 'saltwater', label: 'Saltwater' },
  { value: 'traditional_chlorine', label: 'Traditional chlorine' },
  { value: 'mineral_uv', label: 'Mineral / UV' },
  { value: 'ozone', label: 'Ozone' },
  { value: 'undecided', label: "I'm not sure yet" },
]

const HEATERS = [
  { value: 'none', label: 'No heater' },
  { value: 'gas', label: 'Gas' },
  { value: 'electric_heat_pump', label: 'Electric heat pump' },
  { value: 'solar', label: 'Solar' },
  { value: 'undecided', label: "I'm not sure yet" },
]

const COVERS = [
  { value: 'none', label: 'No cover' },
  { value: 'manual', label: 'Manual cover' },
  { value: 'automatic', label: 'Automatic cover' },
  { value: 'safety_cover', label: 'Safety cover' },
  { value: 'undecided', label: "I'm not sure yet" },
]

const BUDGETS = [
  { value: 'under_25k', label: 'Under $25k' },
  { value: '25k_50k', label: '$25k – $50k' },
  { value: '50k_75k', label: '$50k – $75k' },
  { value: '75k_100k', label: '$75k – $100k' },
  { value: '100k_plus', label: '$100k+' },
  { value: 'not_sure', label: 'Not sure yet' },
]

const TIMELINES = [
  { value: 'asap', label: 'ASAP' },
  { value: '1_3_months', label: '1 – 3 months' },
  { value: '3_6_months', label: '3 – 6 months' },
  { value: 'just_researching', label: 'Just researching' },
]

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
      >
        <option value="">Select one</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function LeadForm() {
  const [features, setFeatures] = useState<FunFeature[]>([])
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([])

  const [poolType, setPoolType] = useState('')
  const [shape, setShape] = useState('')
  const [construction, setConstruction] = useState('')
  const [filtration, setFiltration] = useState('')
  const [heater, setHeater] = useState('')
  const [cover, setCover] = useState('')
  const [budgetRange, setBudgetRange] = useState('')
  const [timeline, setTimeline] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [zipCode, setZipCode] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    supabase
      .from('fun_features')
      .select('*')
      .order('sort_order')
      .then(({ data, error }) => {
        if (!error && data) setFeatures(data)
      })
  }, [])

  const toggleFeature = (id: string) => {
    setSelectedFeatureIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        name,
        email,
        phone: phone || null,
        zip_code: zipCode || null,
        pool_type: poolType || null,
        shape: shape || null,
        construction: construction || null,
        filtration: filtration || null,
        heater: heater || null,
        cover: cover || null,
        budget_range: budgetRange || null,
        timeline: timeline || null,
      })
      .select()
      .single()

    if (leadError || !lead) {
      setError("Something went wrong submitting your info. Please try again.")
      setSubmitting(false)
      return
    }

    if (selectedFeatureIds.length > 0) {
      await supabase.from('lead_fun_features').insert(
        selectedFeatureIds.map((feature_id) => ({
          lead_id: lead.id,
          feature_id,
        })),
      )
    }

    setSubmitting(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-bold text-sky-700">You're all set!</h2>
        <p className="mt-2 text-slate-600">
          Thanks, {name.split(' ')[0] || 'there'} — we're matching you with a
          pool dealer in your area. Expect to hear from them soon.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-xl space-y-6 rounded-xl border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-semibold">Tell us about your pool</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="Pool type" value={poolType} onChange={setPoolType} options={POOL_TYPES} />
          <SelectField label="Shape" value={shape} onChange={setShape} options={SHAPES} />
          <SelectField label="Construction" value={construction} onChange={setConstruction} options={CONSTRUCTIONS} />
          <SelectField label="Filtration" value={filtration} onChange={setFiltration} options={FILTRATIONS} />
          <SelectField label="Heater" value={heater} onChange={setHeater} options={HEATERS} />
          <SelectField label="Cover" value={cover} onChange={setCover} options={COVERS} />
        </div>
      </div>

      {features.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold">Any fun extras?</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {features.map((feature) => (
              <label
                key={feature.id}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm has-[:checked]:border-sky-500 has-[:checked]:bg-sky-50"
              >
                <input
                  type="checkbox"
                  checked={selectedFeatureIds.includes(feature.id)}
                  onChange={() => toggleFeature(feature.id)}
                />
                {feature.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold">Budget & timeline</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="Budget range" value={budgetRange} onChange={setBudgetRange} options={BUDGETS} />
          <SelectField label="Timeline" value={timeline} onChange={setTimeline} options={TIMELINES} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">How should dealers reach you?</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Name
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Phone
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Zip code
            <input
              type="text"
              inputMode="numeric"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            />
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-sky-700 px-6 py-3 font-medium text-white hover:bg-sky-800 disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Get matched with a dealer'}
      </button>
    </form>
  )
}
