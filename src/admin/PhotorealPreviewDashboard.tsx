import { Suspense, lazy, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { AboveGroundShapeId, ConstructionId, InGroundShapeId, PoolSize, PoolType } from '../three/poolGeometry'
import type { ExtraSlug } from '../three/extras'

const PoolScene = lazy(() => import('../three/PoolScene'))

// This page is the review step for the "hybrid" pool preview approach: the
// live Three.js scene (which guarantees correct shape/size/camera framing/
// accessory placement, but has a hard ceiling on photographic realism no
// matter how much the primitive geometry and lighting are tuned) is
// screenshotted as a "guide image," then handed to the generate-pool-render
// edge function, which asks Gemini to repaint it as a real photograph while
// treating the guide's composition as fixed. This page exists to look at a
// batch of results -- quality, generation time -- before this pipeline is
// ever wired into the live lead form. See generate-pool-render/index.ts
// (Supabase project bpgirvmsgfqowgfwlhow) for the actual prompt.

const INGROUND_SHAPES: { value: InGroundShapeId; label: string }[] = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'freeform', label: 'Freeform' },
  { value: 'kidney', label: 'Kidney' },
  { value: 'oval', label: 'Oval' },
  { value: 'round', label: 'Round' },
  { value: 'lap', label: 'Lap pool' },
]

const ABOVE_GROUND_SHAPES: { value: AboveGroundShapeId; label: string }[] = [
  { value: 'round', label: 'Round' },
  { value: 'oval', label: 'Oval' },
]

const INGROUND_CONSTRUCTIONS: { value: ConstructionId; label: string }[] = [
  { value: 'fiberglass', label: 'Fiberglass' },
  { value: 'vinyl_liner', label: 'Vinyl liner' },
  { value: 'concrete_gunite', label: 'Concrete / gunite' },
]

const SIZES: { value: PoolSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'extra_large', label: 'Extra Large' },
]

const COVERS = [
  { value: 'none', label: 'No cover' },
  { value: 'manual', label: 'Manual cover' },
  { value: 'automatic', label: 'Automatic cover' },
  { value: 'safety_cover', label: 'Safety cover' },
]

const EXTRA_OPTIONS: { value: ExtraSlug; label: string }[] = [
  { value: 'slide', label: 'Slide' },
  { value: 'natural_slide', label: 'Natural Slide' },
  { value: 'water_feature', label: 'Water Feature' },
  { value: 'swim_up_bar', label: 'Swim-Up Bar' },
  { value: 'tanning_ledge', label: 'Tanning Ledge' },
  { value: 'diving_board', label: 'Diving Board' },
  { value: 'hot_tub_spa_combo', label: 'Hot Tub / Spa Combo' },
  { value: 'waterfall', label: 'Waterfall' },
]

const CONSTRUCTION_DESCRIPTIONS: Record<ConstructionId, string> = {
  fiberglass: 'a fiberglass shell with a smooth, glossy light-blue gel-coat finish',
  vinyl_liner: 'a vinyl-liner pool with a printed medium-blue liner pattern',
  concrete_gunite: 'a concrete/gunite pool with a pebble-finish plaster in a deep blue-grey tone',
}

const EXTRA_DESCRIPTIONS: Record<ExtraSlug, string> = {
  slide: 'a standard residential pool slide',
  natural_slide: 'a natural rock-style pool slide',
  water_feature: 'a laminar deck-jet water feature at the pool edge',
  swim_up_bar: 'a swim-up bar with underwater stools, right at the pool edge',
  tanning_ledge: 'a shallow tanning ledge with loungers on it, at the pool edge',
  diving_board: 'a diving board at one end of the pool',
  hot_tub_spa_combo:
    'a raised spa built directly into and attached to the main pool at one corner, sharing a wall with the pool ' +
    'and with a visible spillover where its water flows into the main pool -- a built-in, connected spa, NOT a ' +
    'separate freestanding or portable hot tub sitting apart from the pool',
  waterfall: 'a natural rock waterfall feature',
}

type Config = {
  poolType: PoolType
  shape: InGroundShapeId | AboveGroundShapeId
  construction: ConstructionId
  size: PoolSize
  cover: string
  extras: ExtraSlug[]
  ledLighting: boolean
}

const SIZE_DESCRIPTIONS: Record<PoolSize, string> = {
  small: 'small',
  medium: 'mid-size',
  large: 'large',
  extra_large: 'extra-large, expansive',
}

function buildSceneDescription(config: Config): string {
  const parts: string[] = []
  const sizeWord = SIZE_DESCRIPTIONS[config.size]
  if (config.poolType === 'above_ground') {
    parts.push(
      `An above-ground, ${sizeWord} ${config.shape} swimming pool with a raised metal/resin wall over a vinyl liner, sitting on the ground.`,
    )
  } else {
    parts.push(
      `An inground, ${sizeWord} ${config.shape} swimming pool built with ${CONSTRUCTION_DESCRIPTIONS[config.construction]}, ` +
        'set flush into a poured-concrete deck, framed tightly so the pool and deck fill most of the photo -- ' +
        'only a narrow strip of grass at the very edges of the frame, not a wide lawn or yard.',
    )
  }
  if (config.cover !== 'none') {
    parts.push(`The pool's water surface is covered by a ${config.cover.replace(/_/g, ' ')}.`)
  }
  if (config.extras.length > 0) {
    const items = config.extras.map((slug) => EXTRA_DESCRIPTIONS[slug])
    parts.push(`Accessories placed on the deck (exactly one of each, at the positions shown): ${items.join('; ')}.`)
  }
  if (config.ledLighting) {
    parts.push(
      'The pool has underwater LED lighting -- shown in the mockup as a bright glowing blue line traced along ' +
        "the pool's edge at the waterline -- which should read as a real underwater light glow in the photo.",
    )
  }
  return parts.join(' ')
}

type GuideCaptureProps = {
  config: Config
  onCaptured: (dataUrl: string) => void
}

// Mounts the real scene off in a fixed-size box purely to screenshot it --
// remounted fresh (via the `key` the parent puts on this whole subtree)
// every time the config changes, so onCreated reliably fires once per
// config and there's a single unambiguous point to trigger the capture
// from, rather than trying to detect "the scene settled" after a live prop
// change.
function GuideCapture({ config, onCaptured }: GuideCaptureProps) {
  const captured = useRef(false)

  const handleCanvasReady = (canvas: HTMLCanvasElement) => {
    captured.current = false
    // Wait a handful of animation frames past the first one so the shadow
    // map has actually rendered (it refines over the first few frames)
    // before grabbing pixels -- capturing on frame 0 risks an
    // under-baked/missing shadow in the guide.
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

type GenerationStatus = 'idle' | 'generating' | 'done' | 'error'
type CacheStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function PhotorealPreviewDashboard() {
  const [poolType, setPoolType] = useState<PoolType>('inground')
  const [shape, setShape] = useState<InGroundShapeId | AboveGroundShapeId>('rectangle')
  const [construction, setConstruction] = useState<ConstructionId>('fiberglass')
  const [size, setSize] = useState<PoolSize>('medium')
  const [cover, setCover] = useState('none')
  const [extras, setExtras] = useState<ExtraSlug[]>([])
  const [ledLighting, setLedLighting] = useState(false)

  const [guideDataUrl, setGuideDataUrl] = useState<string | null>(null)
  const [resultDataUrl, setResultDataUrl] = useState<string | null>(null)
  const [resultBase64, setResultBase64] = useState<string | null>(null)
  const [resultMimeType, setResultMimeType] = useState('image/png')
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [elapsedMs, setElapsedMs] = useState(0)
  const timerRef = useRef<number | null>(null)

  // The live lead form no longer shows any preview or generates an image
  // until a visitor finishes it (see LeadForm.tsx) -- so this dashboard is
  // now the only place combos get generated ahead of time. Pushing a good
  // result to the cache here means the next real visitor who picks this
  // exact combo gets it instantly instead of waiting on Gemini.
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>('idle')
  const [cacheError, setCacheError] = useState('')
  const [cachedComboKey, setCachedComboKey] = useState<string | null>(null)

  const config: Config = useMemo(
    () => ({ poolType, shape, construction, size, cover, extras, ledLighting }),
    [poolType, shape, construction, size, cover, extras, ledLighting],
  )
  const configKey = useMemo(() => JSON.stringify(config), [config])

  const shapeOptions = poolType === 'above_ground' ? ABOVE_GROUND_SHAPES : INGROUND_SHAPES

  const resetResult = () => {
    setGuideDataUrl(null)
    setResultDataUrl(null)
    setResultBase64(null)
    setStatus('idle')
    setCacheStatus('idle')
    setCacheError('')
    setCachedComboKey(null)
  }

  const setPoolTypeAndDefaults = (next: PoolType) => {
    setPoolType(next)
    setShape(next === 'above_ground' ? 'round' : 'rectangle')
    setConstruction(next === 'above_ground' ? 'vinyl_liner' : 'fiberglass')
    resetResult()
  }

  const toggleExtra = (slug: ExtraSlug) => {
    setExtras((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]))
    resetResult()
  }

  const handleGuideCaptured = (dataUrl: string) => {
    setGuideDataUrl(dataUrl)
    setResultDataUrl(null)
    setResultBase64(null)
    setStatus('idle')
    setCacheStatus('idle')
    setCacheError('')
    setCachedComboKey(null)
  }

  const generate = async () => {
    if (!guideDataUrl) return
    setStatus('generating')
    setErrorMessage('')
    setResultDataUrl(null)
    setResultBase64(null)
    setCacheStatus('idle')
    setCacheError('')
    setCachedComboKey(null)
    const startedAt = Date.now()
    setElapsedMs(0)
    timerRef.current = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 200)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      const guideImageBase64 = guideDataUrl.split(',')[1] ?? ''
      const description = buildSceneDescription(config)

      const { data, error } = await supabase.functions.invoke('generate-pool-render', {
        body: { guideImageBase64, guideMimeType: 'image/png', description },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      })

      if (error || !data?.dataBase64) {
        setStatus('error')
        setErrorMessage((data && (data as any).error) || error?.message || 'Unknown error')
        return
      }

      setResultDataUrl(`data:${data.mimeType || 'image/png'};base64,${data.dataBase64}`)
      setResultBase64(data.dataBase64)
      setResultMimeType(data.mimeType || 'image/png')
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  // Pushes the already-generated result into the same pool_renders /
  // pool-renders cache generate-pool-render-public reads from, under the
  // exact combo_key it would compute for this config -- see
  // cache-pool-render/index.ts for why the key derivation there is kept
  // byte-for-byte identical to the public function's.
  const cacheForSite = async () => {
    if (!resultBase64) return
    setCacheStatus('saving')
    setCacheError('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token

      const { data, error } = await supabase.functions.invoke('cache-pool-render', {
        body: {
          poolType: config.poolType,
          shape: config.shape,
          construction: config.construction,
          size: config.size,
          cover: config.cover,
          extras: config.extras,
          ledLighting: config.ledLighting,
          imageBase64: resultBase64,
          mimeType: resultMimeType,
        },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      })

      if (error || !data?.ok) {
        setCacheStatus('error')
        setCacheError((data && (data as any).error) || error?.message || 'Unknown error')
        return
      }

      setCachedComboKey(data.comboKey)
      setCacheStatus('saved')
    } catch (err) {
      setCacheStatus('error')
      setCacheError(err instanceof Error ? err.message : 'Failed to save to cache')
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-slate-900">AI photoreal preview &amp; cache warming</h1>
        <p className="text-sm text-slate-500">
          The 3D scene on the left is captured as a guide image, then handed to Gemini to repaint as a real photo on
          the right. Nothing generates here automatically for site visitors -- the live form only ever generates one
          image, once, after someone submits it. Use "Cache this for site visitors" below to publish a result you're
          happy with, so the next visitor who picks this exact combo gets it instantly instead of waiting on Gemini.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm font-medium text-slate-700">
          Pool type
          <select
            className="mt-1 block w-full rounded-lg border px-2 py-1.5 text-sm"
            value={poolType}
            onChange={(e) => setPoolTypeAndDefaults(e.target.value as PoolType)}
          >
            <option value="inground">Inground</option>
            <option value="above_ground">Above-ground</option>
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Shape
          <select
            className="mt-1 block w-full rounded-lg border px-2 py-1.5 text-sm"
            value={shape}
            onChange={(e) => {
              setShape(e.target.value as InGroundShapeId | AboveGroundShapeId)
              resetResult()
            }}
          >
            {shapeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {poolType === 'inground' && (
          <label className="block text-sm font-medium text-slate-700">
            Construction
            <select
              className="mt-1 block w-full rounded-lg border px-2 py-1.5 text-sm"
              value={construction}
              onChange={(e) => {
                setConstruction(e.target.value as ConstructionId)
                resetResult()
              }}
            >
              {INGROUND_CONSTRUCTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block text-sm font-medium text-slate-700">
          Size
          <select
            className="mt-1 block w-full rounded-lg border px-2 py-1.5 text-sm"
            value={size}
            onChange={(e) => {
              setSize(e.target.value as PoolSize)
              resetResult()
            }}
          >
            {SIZES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Cover
          <select
            className="mt-1 block w-full rounded-lg border px-2 py-1.5 text-sm"
            value={cover}
            onChange={(e) => {
              setCover(e.target.value)
              resetResult()
            }}
          >
            {COVERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={ledLighting}
            onChange={(e) => {
              setLedLighting(e.target.checked)
              resetResult()
            }}
          />
          LED Lighting
        </label>

        <div className="col-span-full">
          <div className="mb-1 text-sm font-medium text-slate-700">Fun extras</div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {EXTRA_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 text-sm text-slate-600">
                <input type="checkbox" checked={extras.includes(opt.value)} onChange={() => toggleExtra(opt.value)} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-2 text-sm font-medium text-slate-900">3D guide (captured automatically)</div>
          <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100">
            <Suspense
              fallback={
                <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">Loading…</div>
              }
            >
              <GuideCapture key={configKey} config={config} onCaptured={handleGuideCaptured} />
            </Suspense>
          </div>
          {guideDataUrl && (
            <button
              onClick={generate}
              disabled={status === 'generating'}
              className="mt-3 w-full rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
            >
              {status === 'generating' ? `Generating… (${(elapsedMs / 1000).toFixed(1)}s)` : 'Generate photorealistic version'}
            </button>
          )}
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="mb-2 text-sm font-medium text-slate-900">AI photoreal result</div>
          <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100">
            {resultDataUrl ? (
              <img src={resultDataUrl} alt="AI photoreal result" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-center text-sm text-slate-400">
                {status === 'generating' ? 'Waiting on Gemini…' : 'Not generated yet'}
              </div>
            )}
          </div>
          {status === 'error' && <div className="mt-2 text-xs text-red-600">{errorMessage}</div>}
          {status === 'done' && (
            <>
              <div className="mt-2 text-xs text-slate-500">Generated in {(elapsedMs / 1000).toFixed(1)}s.</div>
              <button
                onClick={cacheForSite}
                disabled={cacheStatus === 'saving' || cacheStatus === 'saved'}
                className="mt-3 w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {cacheStatus === 'saving'
                  ? 'Saving to cache…'
                  : cacheStatus === 'saved'
                    ? 'Cached for site visitors ✓'
                    : 'Cache this for site visitors'}
              </button>
              {cacheStatus === 'error' && <div className="mt-2 text-xs text-red-600">{cacheError}</div>}
              {cacheStatus === 'saved' && cachedComboKey && (
                <div className="mt-2 break-all text-xs text-slate-400">combo_key: {cachedComboKey}</div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
