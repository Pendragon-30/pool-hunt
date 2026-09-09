import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Tables } from '../lib/database.types'
import PoolVisual, { resolvePoolVisualConfig, type ResolvedPoolVisualConfig } from './PoolVisual'

// Loaded lazily purely for the post-submit guide capture (see
// PhotorealReveal below) -- the visible preview during the form itself
// already loads its own copy of this chunk via PoolVisual.
const PoolScene = lazy(() => import('../three/PoolScene'))

type FunFeature = Tables<'fun_features'>

const POOL_TYPES = [
  { value: 'inground', label: 'Inground' },
  { value: 'above_ground', label: 'Above-ground' },
  { value: 'undecided', label: "I'm not sure yet" },
]

const ALL_SHAPES = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'freeform', label: 'Freeform' },
  { value: 'kidney', label: 'Kidney' },
  { value: 'oval', label: 'Oval' },
  { value: 'round', label: 'Round' },
  { value: 'lap', label: 'Lap pool' },
  { value: 'custom', label: 'Custom' },
  { value: 'undecided', label: "I'm not sure yet" },
]

// Real above-ground pools are sold round or oval — the inground-only shapes
// (rectangle, kidney, freeform, lap, custom) don't apply, so we narrow the
// options rather than let someone pick a shape that isn't actually offered.
const ABOVE_GROUND_SHAPES = [
  { value: 'round', label: 'Round' },
  { value: 'oval', label: 'Oval' },
  { value: 'undecided', label: "I'm not sure yet" },
]

// Kept in the same S/M/L order the admin dashboard uses (see SIZE_MULTIPLIERS
// in src/three/poolGeometry.ts) -- these are the only real sizes; there's no
// "I'm not sure yet" here because the 3D preview and the final photoreal
// render both need a concrete size to scale against, and "medium" is already
// the sensible default when someone hasn't thought about it yet.
const SIZES = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
]

const CONSTRUCTIONS = [
  { value: 'fiberglass', label: 'Fiberglass' },
  { value: 'vinyl_liner', label: 'Vinyl liner' },
  { value: 'concrete_gunite', label: 'Concrete / gunite' },
  { value: 'undecided', label: "I'm not sure yet" },
]

// Above-ground pools are built with a steel/resin/aluminum wall over a vinyl
// liner — fiberglass and concrete/gunite above-ground pools aren't a real
// product, so we narrow the options rather than let someone pick a
// construction that isn't actually offered.
const ABOVE_GROUND_CONSTRUCTIONS = [
  { value: 'vinyl_liner', label: 'Vinyl liner' },
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

// Inground pools (especially concrete/gunite, or anything with a heater,
// automatic cover, and a couple of fun extras) commonly land well above
// $100k, so a single open-ended "$100k+" bucket was swallowing most
// inground leads without telling a dealer anything useful about their
// actual budget. Above-ground shoppers are usually well under $25k, so the
// low end stays granular too -- this just adds resolution at the top where
// inground leads actually cluster.
const BUDGETS = [
  { value: 'under_25k', label: 'Under $25k' },
  { value: '25k_50k', label: '$25k – $50k' },
  { value: '50k_75k', label: '$50k – $75k' },
  { value: '75k_100k', label: '$75k – $100k' },
  { value: '100k_150k', label: '$100k – $150k' },
  { value: '150k_200k', label: '$150k – $200k' },
  { value: '200k_plus', label: '$200k+' },
  { value: 'not_sure', label: 'Not sure yet' },
]

const TIMELINES = [
  { value: 'asap', label: 'ASAP' },
  { value: '1_3_months', label: '1 – 3 months' },
  { value: '3_6_months', label: '3 – 6 months' },
  { value: 'just_researching', label: 'Just researching' },
]

const STEPS = [
  { title: 'Tell us about your pool' },
  { title: 'Any fun extras?' },
  { title: 'Budget & timeline' },
  { title: 'How should builders reach you?' },
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

function StepProgress({ step }: { step: number }) {
  return (
    <ol className="mb-6 grid grid-cols-4 gap-2">
      {STEPS.map((s, i) => (
        <li key={s.title} className="text-center">
          <div
            className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              i < step
                ? 'bg-sky-700 text-white'
                : i === step
                  ? 'border-2 border-sky-700 text-sky-700'
                  : 'border border-slate-300 text-slate-400'
            }`}
          >
            {i + 1}
          </div>
          <div
            className={`mt-1 hidden text-xs sm:block ${
              i === step ? 'font-medium text-sky-700' : 'text-slate-400'
            }`}
          >
            {s.title}
          </div>
        </li>
      ))}
    </ol>
  )
}

export default function LeadForm() {
  const [features, setFeatures] = useState<FunFeature[]>([])
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([])

  const [poolType, setPoolType] = useState('')
  const [shape, setShape] = useState('')
  const [construction, setConstruction] = useState('')
  const [poolSize, setPoolSize] = useState('')
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

  // The photoreal AI render is generated exactly once per lead, kicked off
  // only after the contact-info step is submitted -- not live while
  // someone is still adjusting selections. That both keeps the (paid,
  // ~20s) Gemini call off the hot path of every form interaction and turns
  // "see a real photo of your exact pool" into a reason to finish the
  // form rather than abandon it partway through. See PhotorealReveal below.
  const [renderPhase, setRenderPhase] = useState<'idle' | 'capturing' | 'generating' | 'ready' | 'unavailable' | 'error'>('idle')
  const [renderUrl, setRenderUrl] = useState<string | null>(null)
  const [renderConfig, setRenderConfig] = useState<ResolvedPoolVisualConfig | null>(null)

  const [step, setStep] = useState(0)

  const shapeOptions = poolType === 'above_ground' ? ABOVE_GROUND_SHAPES : ALL_SHAPES
  const constructionOptions = poolType === 'above_ground' ? ABOVE_GROUND_CONSTRUCTIONS : CONSTRUCTIONS

  const handlePoolTypeChange = (value: string) => {
    setPoolType(value)
    // Above-ground only offers round/oval and vinyl liner — clear any
    // incompatible pick rather than leave a hidden, invalid selection in place.
    if (value === 'above_ground' && shape && !ABOVE_GROUND_SHAPES.some((s) => s.value === shape)) {
      setShape('')
    }
    if (
      value === 'above_ground' &&
      construction &&
      !ABOVE_GROUND_CONSTRUCTIONS.some((c) => c.value === construction)
    ) {
      setConstruction('')
    }
  }

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

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    // Generate the id client-side so we never need to read the row back —
    // the public site can INSERT leads but should never be able to SELECT
    // them (that table holds names, emails, and phone numbers).
    const leadId = crypto.randomUUID()

    const { error: leadError } = await supabase.from('leads').insert({
      id: leadId,
      name,
      email,
      phone: phone || null,
      zip_code: zipCode || null,
      pool_type: poolType || null,
      shape: shape || null,
      construction: construction || null,
      pool_size: poolSize || null,
      filtration: filtration || null,
      heater: heater || null,
      cover: cover || null,
      budget_range: budgetRange || null,
      timeline: timeline || null,
    })

    if (leadError) {
      setError('Something went wrong submitting your info. Please try again.')
      setSubmitting(false)
      return
    }

    if (selectedFeatureIds.length > 0) {
      await supabase.from('lead_fun_features').insert(
        selectedFeatureIds.map((feature_id) => ({
          lead_id: leadId,
          feature_id,
        })),
      )
    }

    // Freeze the exact resolved scene config this lead's preview was
    // showing at the moment they submitted -- selections are locked from
    // here on, so the guide image captured next (and the description sent
    // to Gemini) always matches what they actually saw and asked for.
    setRenderConfig(
      resolvePoolVisualConfig({
        poolType,
        shape,
        construction,
        size: poolSize,
        cover,
        selectedFeatures: features.filter((f) => selectedFeatureIds.includes(f.id)).map((f) => f.name),
      }),
    )
    setRenderPhase('capturing')
    setSubmitting(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <PhotorealReveal
        firstName={name.split(' ')[0] || 'there'}
        config={renderConfig}
        phase={renderPhase}
        setPhase={setRenderPhase}
        renderUrl={renderUrl}
        setRenderUrl={setRenderUrl}
      />
    )
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div className="order-2 lg:order-1">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border bg-white p-6 shadow-sm"
        >
          <StepProgress step={step} />

          {step === 0 && (
            <div>
              <h2 className="text-lg font-semibold">{STEPS[0].title}</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="Pool type"
                  value={poolType}
                  onChange={handlePoolTypeChange}
                  options={POOL_TYPES}
                />
                <SelectField label="Shape" value={shape} onChange={setShape} options={shapeOptions} />
                <SelectField
                  label="Construction"
                  value={construction}
                  onChange={setConstruction}
                  options={constructionOptions}
                />
                <SelectField label="Pool size" value={poolSize} onChange={setPoolSize} options={SIZES} />
                <SelectField
                  label="Filtration"
                  value={filtration}
                  onChange={setFiltration}
                  options={FILTRATIONS}
                />
                <SelectField label="Heater" value={heater} onChange={setHeater} options={HEATERS} />
                <SelectField label="Cover" value={cover} onChange={setCover} options={COVERS} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold">{STEPS[1].title}</h2>
              {features.length > 0 ? (
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
              ) : (
                <p className="mt-3 text-sm text-slate-500">No optional extras to show right now.</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold">{STEPS[2].title}</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="Budget range"
                  value={budgetRange}
                  onChange={setBudgetRange}
                  options={BUDGETS}
                />
                <SelectField label="Timeline" value={timeline} onChange={setTimeline} options={TIMELINES} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold">{STEPS[3].title}</h2>
              <p className="mt-1 text-sm text-sky-700">
                Submit your info and we'll turn your preview into a photorealistic rendering of your exact
                pool — free, and yours to keep.
              </p>
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
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-0"
            >
              Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg bg-sky-700 px-6 py-2 text-sm font-medium text-white hover:bg-sky-800"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-sky-700 px-6 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Get matched with a dealer'}
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="order-1 lg:order-2">
        <div>
          <PoolVisual
            poolType={poolType}
            shape={shape}
            construction={construction}
            size={poolSize}
            filtration={filtration}
            heater={heater}
            cover={cover}
            selectedFeatures={features
              .filter((f) => selectedFeatureIds.includes(f.id))
              .map((f) => f.name)}
          />
          <p className="mt-2 text-center text-xs text-slate-400">
            A preview, not a final design — your dealer will confirm exact
            specs.
          </p>
        </div>
      </div>
    </div>
  )
}

type RenderPhase = 'idle' | 'capturing' | 'generating' | 'ready' | 'unavailable' | 'error'

// A generated combo that's genuinely new to the whole site takes Gemini
// roughly 15-25s (see the ~19-20s times seen in the admin review tool) --
// polling only kicks in on the much rarer case where this exact combo is
// already being generated for someone else right now, so a handful of
// slow-ish checks is plenty rather than fast/frequent ones.
const POLL_INTERVAL_MS = 4000
const MAX_POLL_ATTEMPTS = 10

type GuideCaptureProps = {
  config: ResolvedPoolVisualConfig
  onCaptured: (dataUrl: string) => void
}

// Mirrors the admin dashboard's GuideCapture (src/admin/PhotorealPreviewDashboard.tsx):
// mounts the real scene purely to screenshot it, waiting a handful of
// frames past the first so the shadow map has actually settled before
// grabbing pixels.
function GuideCapture({ config, onCaptured }: GuideCaptureProps) {
  const captured = useRef(false)

  const handleCanvasReady = (canvas: HTMLCanvasElement) => {
    let framesLeft = 6
    const step = () => {
      if (captured.current) return
      framesLeft -= 1
      if (framesLeft > 0) {
        requestAnimationFrame(step)
        return
      }
      captured.current = true
      try {
        onCaptured(canvas.toDataURL('image/png'))
      } catch (err) {
        console.error('Failed to capture guide image', err)
      }
    }
    requestAnimationFrame(step)
  }

  return (
    <PoolScene
      poolType={config.poolType}
      shape={config.shape}
      construction={config.construction}
      size={config.size}
      cover={config.cover}
      extras={config.extras}
      ledLighting={config.ledLighting}
      preserveDrawingBuffer
      onCanvasReady={handleCanvasReady}
    />
  )
}

function PhotorealReveal({
  firstName,
  config,
  phase,
  setPhase,
  renderUrl,
  setRenderUrl,
}: {
  firstName: string
  config: ResolvedPoolVisualConfig | null
  phase: RenderPhase
  setPhase: (p: RenderPhase) => void
  renderUrl: string | null
  setRenderUrl: (u: string | null) => void
}) {
  const [guideDataUrl, setGuideDataUrl] = useState<string | null>(null)
  const requestedRef = useRef(false)

  // If WebGL isn't available (or the scene otherwise never fires
  // onCanvasReady), GuideCapture never calls handleCaptured and the phase
  // would sit on 'capturing' -- spinner forever -- with no photo and no
  // fallback message. Give it a few seconds, then quietly fall back to
  // just the thank-you message rather than leave the page looking stuck.
  useEffect(() => {
    if (phase !== 'capturing') return
    const timeout = window.setTimeout(() => {
      if (!requestedRef.current) setPhase('unavailable')
    }, 8000)
    return () => window.clearTimeout(timeout)
  }, [phase, setPhase])

  const requestRender = async (dataUrl: string, cfg: ResolvedPoolVisualConfig, attempt: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-pool-render-public', {
        body: {
          poolType: cfg.poolType,
          shape: cfg.shape,
          construction: cfg.construction,
          size: cfg.size,
          cover: cfg.cover,
          extras: cfg.extras,
          ledLighting: cfg.ledLighting,
          guideImageBase64: dataUrl.split(',')[1] ?? '',
          guideMimeType: 'image/png',
        },
      })

      if (error || !data) {
        setPhase('error')
        return
      }
      if (data.status === 'ready' && data.url) {
        setRenderUrl(data.url)
        setPhase('ready')
        return
      }
      if (data.status === 'pending' && attempt < MAX_POLL_ATTEMPTS) {
        window.setTimeout(() => requestRender(dataUrl, cfg, attempt + 1), POLL_INTERVAL_MS)
        return
      }
      if (data.status === 'unavailable' || data.status === 'pending') {
        setPhase('unavailable')
        return
      }
      setPhase('error')
    } catch {
      setPhase('error')
    }
  }

  const handleCaptured = (dataUrl: string) => {
    if (requestedRef.current || !config) return
    requestedRef.current = true
    setGuideDataUrl(dataUrl)
    setPhase('generating')
    requestRender(dataUrl, config, 0)
  }

  return (
    <div className="mx-auto max-w-xl rounded-xl border bg-white p-8 text-center shadow-sm">
      <h2 className="text-2xl font-bold text-sky-700">You're all set!</h2>
      <p className="mt-2 text-slate-600">
        Thanks, {firstName} — we're matching you with a pool dealer in your area. Expect to hear from them soon.
      </p>

      {config && phase !== 'unavailable' && phase !== 'error' && (
        <div className="mt-6">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100">
            {phase === 'ready' && renderUrl ? (
              <img src={renderUrl} alt="Photorealistic rendering of your pool" className="h-full w-full object-cover" />
            ) : guideDataUrl ? (
              <img src={guideDataUrl} alt="Your pool preview" className="h-full w-full object-cover opacity-60 blur-sm" />
            ) : (
              <Suspense fallback={null}>
                <GuideCapture config={config} onCaptured={handleCaptured} />
              </Suspense>
            )}
            {phase !== 'ready' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/40">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-700 border-t-transparent" />
                <p className="px-4 text-xs font-medium text-slate-700">
                  Creating a photorealistic rendering of your exact pool…
                </p>
              </div>
            )}
          </div>
          {phase === 'ready' && (
            <p className="mt-2 text-center text-xs text-slate-400">
              Your dealer will confirm exact specs and pricing.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
