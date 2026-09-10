import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Tables } from '../lib/database.types'
import { resolvePoolVisualConfig, type ResolvedPoolVisualConfig } from './PoolVisual'
import { useMediaQuery } from '../hooks/useMediaQuery'

// There is deliberately no live PoolVisual/3D preview anywhere in this
// form anymore -- the only image a visitor ever sees is the one
// photoreal render, generated exactly once, after they submit their
// contact info (see PhotorealReveal below). This is a product decision,
// not just a cost one: showing nothing during the form and only
// revealing a real photo of their exact pool as the reward for finishing
// is a stronger completion hook than letting them see a (free, live,
// but comparatively plain) 3D preview along the way. PoolScene is still
// loaded here, lazily, purely to render one invisible guide-image capture
// after submission -- see GuideCapture below -- it is never mounted
// visibly during any of the form's steps.
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

// Kept in the same order the admin dashboard uses (see SIZE_MULTIPLIERS in
// src/three/poolGeometry.ts) -- these are the only real sizes; there's no
// "I'm not sure yet" here because the 3D preview and the final photoreal
// render both need a concrete size to scale against, and "medium" is already
// the sensible default when someone hasn't thought about it yet.
const SIZES = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'extra_large', label: 'Extra Large' },
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

// The pool-details step normally holds all 7 fields (type/shape/
// construction/size/filtration/heater/cover) at once, laid out two-per-row
// once the viewport is wide enough for that (see the `sm:grid-cols-2` grids
// below). Below that width everything stacks into one long column, which
// makes step one noticeably longer to scroll through than the rest of the
// form -- so on narrow viewports only, filtration/heater/cover split off
// into their own step instead of bulking up step one. `isWide` mirrors
// Tailwind's `sm` breakpoint (640px) exactly so the step count always
// matches what's actually laid out in one column vs two.
const STEP_TITLES: Record<string, string> = {
  details: 'Tell us about your pool',
  'more-details': 'A few more details',
  extras: 'Any fun extras?',
  budget: 'Budget & timeline',
  contact: 'How should builders reach you?',
}
const WIDE_STEP_KINDS = ['details', 'extras', 'budget', 'contact'] as const
const NARROW_STEP_KINDS = ['details', 'more-details', 'extras', 'budget', 'contact'] as const
const WIDE_STEPS = WIDE_STEP_KINDS.map((kind) => ({ kind, title: STEP_TITLES[kind] }))
const NARROW_STEPS = NARROW_STEP_KINDS.map((kind) => ({ kind, title: STEP_TITLES[kind] }))
type FormStep = { kind: string; title: string }

const fieldClasses =
  'mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-navy-600 focus:ring-2 focus:ring-navy-100'

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
    <label className="block text-sm font-semibold text-navy-900">
      {label}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldClasses} appearance-none pr-9`}
        >
          <option value="">Select one</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 24 24"
          width={14}
          height={14}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute right-3.5 top-1/2 mt-0.5 -translate-y-1/2 text-slate-400"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </label>
  )
}

function StepProgress({ step, steps }: { step: number; steps: FormStep[] }) {
  return (
    <ol className="mb-8 flex items-start justify-between">
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex flex-1 flex-col items-center text-center">
          {i > 0 && (
            <div
              className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 transition-colors duration-500 ${
                i <= step ? 'bg-navy-800' : 'bg-slate-200'
              }`}
            />
          )}
          <div
            className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300 ${
              i <= step
                ? 'bg-navy-900 text-white'
                : 'border-2 border-slate-200 bg-white text-slate-400'
            }`}
          >
            {i < step ? (
              <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5 10 17 19 7" />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          <div
            className={`mt-2 hidden px-1 text-[11px] font-medium leading-tight sm:block ${
              i === step ? 'text-navy-800' : 'text-slate-400'
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
  // Held onto purely so PhotorealReveal can hand it back to the edge
  // function once the render is ready -- that's the only way the
  // send-lead-email trigger knows which lead row to attach the photo to
  // and email, since this id is generated client-side and never read back
  // from the database.
  const [submittedLeadId, setSubmittedLeadId] = useState<string | null>(null)

  const [step, setStep] = useState(0)

  // Matches Tailwind's `sm` breakpoint -- the same width where the field
  // grids below switch from one column to two -- so STEPS always reflects
  // what's actually on screen.
  const isWide = useMediaQuery('(min-width: 640px)')
  const STEPS = isWide ? WIDE_STEPS : NARROW_STEPS

  // If the viewport crosses the breakpoint mid-fill (rotating a tablet or
  // resizing a browser window), keep the visitor on the same logical
  // section rather than landing on a mismatched or out-of-range index.
  // 'more-details' only exists in the narrow step list -- switching to wide
  // collapses it back into the merged 'details' step it's now part of.
  const prevIsWideRef = useRef(isWide)
  useEffect(() => {
    if (prevIsWideRef.current === isWide) return
    const prevKinds = prevIsWideRef.current ? WIDE_STEP_KINDS : NARROW_STEP_KINDS
    const nextKinds = isWide ? WIDE_STEP_KINDS : NARROW_STEP_KINDS
    prevIsWideRef.current = isWide
    setStep((s) => {
      const kind = prevKinds[s]
      const nextIndex = (nextKinds as readonly string[]).indexOf(kind)
      if (nextIndex !== -1) return nextIndex
      return Math.max(0, (nextKinds as readonly string[]).indexOf('details'))
    })
  }, [isWide])

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
    setSubmittedLeadId(leadId)
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
        leadId={submittedLeadId}
      />
    )
  }

  const currentKind = STEPS[step]?.kind

  const poolDetailsFields = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SelectField label="Pool type" value={poolType} onChange={handlePoolTypeChange} options={POOL_TYPES} />
      <SelectField label="Shape" value={shape} onChange={setShape} options={shapeOptions} />
      <SelectField
        label="Construction"
        value={construction}
        onChange={setConstruction}
        options={constructionOptions}
      />
      <SelectField label="Pool size" value={poolSize} onChange={setPoolSize} options={SIZES} />
    </div>
  )

  const moreDetailsFields = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SelectField label="Filtration" value={filtration} onChange={setFiltration} options={FILTRATIONS} />
      <SelectField label="Heater" value={heater} onChange={setHeater} options={HEATERS} />
      <SelectField label="Cover" value={cover} onChange={setCover} options={COVERS} />
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl">
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <StepProgress step={step} steps={STEPS} />

        <div key={step} className="animate-step-in">
          {currentKind === 'details' && (
            <div>
              <h2 className="text-lg font-bold text-navy-900">{STEPS[step].title}</h2>
              <div className="mt-4">{poolDetailsFields}</div>
              {/* On wide viewports there's no separate 'more-details' step --
                  filtration/heater/cover stay folded into this one step. */}
              {isWide && <div className="mt-4">{moreDetailsFields}</div>}
            </div>
          )}

          {currentKind === 'more-details' && (
            <div>
              <h2 className="text-lg font-bold text-navy-900">{STEPS[step].title}</h2>
              <div className="mt-4">{moreDetailsFields}</div>
            </div>
          )}

          {currentKind === 'extras' && (
            <div>
              <h2 className="text-lg font-bold text-navy-900">{STEPS[step].title}</h2>
              {features.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {features.map((feature) => (
                    <label
                      key={feature.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700 transition-colors hover:border-slate-400 has-[:checked]:border-navy-700 has-[:checked]:bg-navy-50 has-[:checked]:text-navy-900"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFeatureIds.includes(feature.id)}
                        onChange={() => toggleFeature(feature.id)}
                        className="accent-navy-800"
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

          {currentKind === 'budget' && (
            <div>
              <h2 className="text-lg font-bold text-navy-900">{STEPS[step].title}</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField label="Budget range" value={budgetRange} onChange={setBudgetRange} options={BUDGETS} />
                <SelectField label="Timeline" value={timeline} onChange={setTimeline} options={TIMELINES} />
              </div>
            </div>
          )}

          {currentKind === 'contact' && (
            <div>
              <h2 className="text-lg font-bold text-navy-900">{STEPS[step].title}</h2>
              <p className="mt-1.5 text-sm text-navy-700">
                Submit your info and we'll generate a free photorealistic rendering of your exact pool —
                yours to keep.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-navy-900">
                  Name
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={fieldClasses}
                  />
                </label>
                <label className="block text-sm font-semibold text-navy-900">
                  Email
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={fieldClasses}
                  />
                </label>
                <label className="block text-sm font-semibold text-navy-900">
                  Phone
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={fieldClasses}
                  />
                </label>
                <label className="block text-sm font-semibold text-navy-900">
                  Zip code
                  <input
                    type="text"
                    inputMode="numeric"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className={fieldClasses}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

        <div className="mt-7 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="rounded-md px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-navy-900 disabled:opacity-0"
          >
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-md bg-navy-900 px-7 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-navy-900 px-7 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Get matched with a dealer'}
            </button>
          )}
        </div>
      </form>

      <RenderTeaser />
    </div>
  )
}

// A static, purely decorative "locked reveal" strip -- no 3D scene, no API
// call, nothing generated. It exists only to tell a visitor a real photo of
// their exact pool is waiting on the other side of the form, which is the
// whole point of not showing them a free preview along the way: the
// photoreal image only gets generated once, after submission (see
// PhotorealReveal), so this costs nothing to render and nothing in image
// generation credits no matter how long someone lingers on the form. Kept
// deliberately small and out of the way -- nothing here is actually live
// while the form is being filled in, so it doesn't earn more visual weight
// than a short note under the form, in every viewport rather than a
// dedicated side column.
function RenderTeaser() {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
      <svg
        viewBox="-10 -10 20 20"
        width={20}
        height={20}
        stroke="currentColor"
        fill="none"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-navy-700"
      >
        <rect x={-6} y={-1} width={12} height={9} rx={1.5} />
        <path d="M -3.5 -1 L -3.5 -4 A 3.5 3.5 0 0 1 3.5 -4 L 3.5 -1" />
        <circle cx={0} cy={3.3} r={1.3} fill="currentColor" stroke="none" />
      </svg>
      <p className="text-xs leading-relaxed text-slate-600">
        <span className="font-semibold text-navy-900">Your photorealistic rendering is waiting.</span> Finish
        the form and we'll generate a free image of your exact pool — yours to keep.
      </p>
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
  leadId,
}: {
  firstName: string
  config: ResolvedPoolVisualConfig | null
  phase: RenderPhase
  setPhase: (p: RenderPhase) => void
  renderUrl: string | null
  setRenderUrl: (u: string | null) => void
  leadId: string | null
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
          leadId,
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
    <div className="mx-auto max-w-xl animate-fade-in-up rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy-800 text-white">
        <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5 10 17 19 7" />
        </svg>
      </span>
      <h2 className="mt-4 text-2xl font-bold text-navy-900">You're all set!</h2>
      <p className="mt-2 text-slate-600">
        Thanks, {firstName} — we're matching you with a pool dealer in your area. Expect to hear from them soon.
      </p>

      {config && phase !== 'unavailable' && phase !== 'error' && (
        <div className="mt-6">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {phase === 'ready' && renderUrl ? (
              <img
                src={renderUrl}
                alt="Photorealistic rendering of your pool"
                className="h-full w-full animate-fade-in object-cover"
              />
            ) : guideDataUrl ? (
              <img src={guideDataUrl} alt="Your pool preview" className="h-full w-full object-cover opacity-60 blur-sm" />
            ) : (
              <Suspense fallback={null}>
                <GuideCapture config={config} onCaptured={handleCaptured} />
              </Suspense>
            )}
            {phase !== 'ready' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-navy-950/30 backdrop-blur-[2px]">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-sky-300 border-t-transparent" />
                <p className="px-4 text-xs font-medium text-white">
                  Creating a photorealistic rendering of your exact pool…
                </p>
              </div>
            )}
          </div>
          {phase === 'ready' && (
            <p className="mt-3 text-center text-xs text-slate-400">
              Your dealer will confirm exact specs and pricing.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
