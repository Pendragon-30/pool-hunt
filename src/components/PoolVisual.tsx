import { useState } from 'react'
import { useCompositePhoto } from '../hooks/useCompositePhoto'

// The pool preview always shows a real AI-generated photo of the pool being
// described — one image per pool type / shape / construction combination,
// generated once ahead of time via the "Pool Photos" admin tool and stored
// in Supabase Storage (nothing is generated live for site visitors). There
// is no more hand-drawn placeholder mode: as soon as the form loads, before
// anyone has picked anything, we already show a representative default
// (inground / rectangle / fiberglass) so the preview never looks broken or
// empty, and it swaps to the exact matching photo as real choices are made.
//
// Fun extras (slide, water feature, etc.) overlay on top of the photo as
// small pre-generated sticker images anchored to a fixed set of positions
// around the deck — the same 8 slots regardless of which pool is shown, so
// an extra always lands in the same place. Until a given extra's sticker
// has been generated, it falls back to a simple hand-drawn icon badge in
// the same spot so nothing is ever missing from the preview. One extra,
// "LED Lighting", isn't a sticker at all — it's a soft color glow rendered
// directly onto the water, since a translucent lighting effect can't
// survive the chroma-key background removal every sticker goes through.
//
// Whenever a cover and/or extras are selected, this component ALSO kicks
// off a request (via useCompositePhoto) for a fully-baked composite photo
// -- the real pool photo edited by Gemini to add those elements directly
// into the scene, sharing its actual lighting/perspective/pool outline
// instead of being layered on top as separate flat stickers. That request
// is generated lazily on first request per combo and cached forever server
// side, so it can take a few seconds the first time and is instant after.
// Until it's ready (or if it's unavailable/rate-limited), the sticker-based
// preview below keeps showing so there's never a blank or broken state.

const SUPABASE_STORAGE_BASE = 'https://bpgirvmsgfqowgfwlhow.supabase.co/storage/v1/object/public/pool-photos'
const FUN_EXTRAS_STORAGE_BASE = 'https://bpgirvmsgfqowgfwlhow.supabase.co/storage/v1/object/public/fun-extras'
const POOL_COVERS_STORAGE_BASE = 'https://bpgirvmsgfqowgfwlhow.supabase.co/storage/v1/object/public/pool-covers'
const POOL_COMPONENTS_STORAGE_BASE = 'https://bpgirvmsgfqowgfwlhow.supabase.co/storage/v1/object/public/pool-components'

const REAL_INGROUND_SHAPES = ['rectangle', 'freeform', 'kidney', 'oval', 'round', 'lap']
const REAL_ABOVE_GROUND_SHAPES = ['round', 'oval']
const REAL_INGROUND_CONSTRUCTIONS = ['fiberglass', 'vinyl_liner', 'concrete_gunite']
// Above-ground pools are built with a steel/resin/aluminum wall over a vinyl
// liner -- fiberglass and concrete/gunite above-ground pools aren't a real
// product, so there's no generated photo for those combos.
const REAL_ABOVE_GROUND_CONSTRUCTIONS = ['vinyl_liner']

const CONSTRUCTION_LABELS: Record<string, string> = {
  fiberglass: 'Fiberglass',
  vinyl_liner: 'Vinyl liner',
  concrete_gunite: 'Concrete / gunite',
}

function getPhotoUrl(poolType: string, shape: string, construction: string): string {
  return `${SUPABASE_STORAGE_BASE}/${poolType}_${shape}_${construction}.png`
}

// Whatever hasn't been picked yet (or was picked as "I'm not sure yet" /
// "Custom" / not a real pre-rendered option) falls back to a sensible
// default per pool type, so the photo preview always has something real to
// show -- including before any selection has been made at all, which
// defaults all the way to inground / rectangle / fiberglass.
const DEFAULT_SHAPE_BY_TYPE: Record<string, string> = { inground: 'rectangle', above_ground: 'round' }
const DEFAULT_CONSTRUCTION_BY_TYPE: Record<string, string> = { inground: 'fiberglass', above_ground: 'vinyl_liner' }

function getEffectivePoolType(poolType: string): 'inground' | 'above_ground' {
  return poolType === 'above_ground' ? 'above_ground' : 'inground'
}

function getPhotoShape(poolType: string, shape: string): string {
  const validShapes = poolType === 'above_ground' ? REAL_ABOVE_GROUND_SHAPES : REAL_INGROUND_SHAPES
  return validShapes.includes(shape) ? shape : DEFAULT_SHAPE_BY_TYPE[poolType]
}

function getPhotoConstruction(poolType: string, construction: string): string {
  const validConstructions =
    poolType === 'above_ground' ? REAL_ABOVE_GROUND_CONSTRUCTIONS : REAL_INGROUND_CONSTRUCTIONS
  return validConstructions.includes(construction) ? construction : DEFAULT_CONSTRUCTION_BY_TYPE[poolType]
}

type FeatureName =
  | 'Slide'
  | 'Natural Slide'
  | 'Water Feature'
  | 'Swim-Up Bar'
  | 'Tanning Ledge'
  | 'Diving Board'
  | 'LED Lighting'
  | 'Hot Tub / Spa Combo'
  | 'Waterfall'

// Filenames for each extra's pre-generated sticker in the fun-extras
// bucket. "LED Lighting" is deliberately absent -- it isn't a positioned
// sticker, it's a subtle color tint rendered directly onto the water (a
// translucent glow can't survive the chroma-key removal every other sticker
// goes through), so it's handled separately below.
const FEATURE_SLUGS: Record<Exclude<FeatureName, 'LED Lighting'>, string> = {
  Slide: 'slide',
  'Natural Slide': 'natural_slide',
  'Water Feature': 'water_feature',
  'Swim-Up Bar': 'swim_up_bar',
  'Tanning Ledge': 'tanning_ledge',
  'Diving Board': 'diving_board',
  'Hot Tub / Spa Combo': 'hot_tub_spa_combo',
  Waterfall: 'waterfall',
}

function getExtraStickerUrl(name: Exclude<FeatureName, 'LED Lighting'>): string {
  return `${FUN_EXTRAS_STORAGE_BASE}/${FEATURE_SLUGS[name]}.png`
}

function getCoverStickerUrl(cover: string): string {
  return `${POOL_COVERS_STORAGE_BASE}/${cover}.png`
}

function getComponentIconUrl(kind: 'heater' | 'filtration', value: string): string {
  return `${POOL_COMPONENTS_STORAGE_BASE}/${kind}_${value}.png`
}

// Rough region the water occupies in each pool-photo framing, used to place
// the (optional) generated cover sticker over the water. These are
// deliberately generic rather than shape-exact -- this is a marketing
// preview image, not a to-scale rendering, the same way fun-extra stickers
// land in fixed slots regardless of the pool's actual outline.
const COVER_REGION_BY_TYPE: Record<
  'inground' | 'above_ground',
  { x: number; y: number; width: number; height: number }
> = {
  inground: { x: 100, y: 95, width: 200, height: 140 },
  above_ground: { x: 80, y: 60, width: 240, height: 200 },
}

type PoolVisualProps = {
  poolType: string
  shape: string
  construction: string
  filtration?: string
  heater?: string
  cover?: string
  selectedFeatures?: string[]
}

// Small hand-drawn fallback badge shown for a fun extra until its
// pre-generated sticker image exists.
function EquipmentBadge({
  x,
  y,
  color,
  title,
  children,
}: {
  x: number
  y: number
  color: string
  title: string
  children: React.ReactNode
}) {
  return (
    <g transform={`translate(${x}, ${y})`} className="pool-pop-in">
      <title>{title}</title>
      <circle r={19} fill="white" stroke={color} strokeWidth={2.5} />
      <g stroke={color} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </g>
  )
}

// Small standalone (not badge-wrapped) icons used in the equipment chip row
// below the image.
function PumpGlyph({ color }: { color: string }) {
  return (
    <svg viewBox="-10 -10 20 20" width={16} height={16} stroke={color} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M -6 4 L -6 -4 L 6 -4 L 6 4 Z" />
      <path d="M -9 0 L -6 0 M 9 0 L 6 0" />
      <circle cx={0} cy={0} r={2.5} fill={color} stroke="none" />
    </svg>
  )
}

function HeaterGlyph({ kind, color }: { kind: string; color: string }) {
  const inner =
    kind === 'solar' ? (
      <>
        <rect x={-7} y={-6} width={14} height={12} rx={1} />
        <path d="M -7 -2 L 7 -2 M -7 2 L 7 2 M -3 -6 L -3 6 M 3 -6 L 3 6" />
      </>
    ) : kind === 'electric_heat_pump' ? (
      <>
        <circle cx={0} cy={0} r={7} />
        <path d="M 0 -7 L 0 7 M -7 0 L 7 0 M -5 -5 L 5 5 M 5 -5 L -5 5" />
      </>
    ) : (
      // gas / undecided fallback — a simple flame
      <path d="M 0 -8 C 4 -3 5 1 2 4 C 3 1 1 0 0 2 C -1 0 -3 1 -2 4 C -5 1 -4 -4 0 -8 Z" />
    )
  return (
    <svg viewBox="-10 -10 20 20" width={16} height={16} stroke={color} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {inner}
    </svg>
  )
}

function CoverGlyph({ color }: { color: string }) {
  return (
    <svg viewBox="-10 -10 20 20" width={16} height={16} stroke={color} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={-8} y={-5} width={16} height={10} rx={4} />
      <path d="M -8 0 L 8 0" />
    </svg>
  )
}

// The 8 extras that appear as positioned stickers. "LED Lighting" is not
// here -- it renders as a water-color glow instead (see LedLightingGlow),
// so it isn't part of the anchor system.
const ANCHORED_FEATURE_ORDER: Exclude<FeatureName, 'LED Lighting'>[] = [
  'Slide',
  'Natural Slide',
  'Water Feature',
  'Swim-Up Bar',
  'Tanning Ledge',
  'Diving Board',
  'Hot Tub / Spa Combo',
  'Waterfall',
]

// The 8 standard positions extras can appear in, spaced evenly around the
// deck perimeter of the 400x300 photo frame. Every extra always lands in
// the same slot regardless of which pool photo is showing underneath.
const FEATURE_ANCHORS: { x: number; y: number }[] = [
  { x: 66, y: 74 },
  { x: 200, y: 58 },
  { x: 334, y: 74 },
  { x: 350, y: 165 },
  { x: 334, y: 256 },
  { x: 200, y: 272 },
  { x: 66, y: 256 },
  { x: 50, y: 165 },
]

function FeatureIcon({ name }: { name: FeatureName }) {
  switch (name) {
    case 'Slide':
      return <path d="M -8 8 C -8 -2, 2 -6, 8 -8 M 8 -8 L 8 -3 M 8 -8 L 3 -8" />
    case 'Natural Slide':
      return (
        <path d="M -8 8 C -8 -2, 2 -6, 8 -8 M 8 -8 L 8 -3 M 8 -8 L 3 -8 M -8 8 L -8 3 M -8 5.5 L -5 5.5 M -8 1 L -4.5 1" />
      )
    case 'Water Feature':
      return <path d="M 0 -8 C 5 -2, 6 3, 0 8 C -6 3, -5 -2, 0 -8 Z" />
    case 'Swim-Up Bar':
      return <path d="M -5 -7 L 5 -7 L 3 7 L -3 7 Z M -5 -7 L -8 -9 M 5 -7 L 8 -9" />
    case 'Tanning Ledge':
      return (
        <>
          <circle cx={0} cy={0} r={4} />
          <path d="M 0 -9 L 0 -7 M 0 7 L 0 9 M -9 0 L -7 0 M 7 0 L 9 0 M -6 -6 L -5 -5 M 5 5 L 6 6 M -6 6 L -5 5 M 5 -5 L 6 -6" />
        </>
      )
    case 'Diving Board':
      return <path d="M -8 4 L 8 4 M -8 4 L -8 -6 M -8 -1 L 6 -1" />
    case 'LED Lighting':
      return <path d="M 0 -9 L 2 -2 L 9 -1 L 3 3 L 5 9 L 0 5 L -5 9 L -3 3 L -9 -1 L -2 -2 Z" />
    case 'Hot Tub / Spa Combo':
      return (
        <>
          <rect x={-8} y={-6} width={16} height={12} rx={3} />
          <path d="M -4 0 C -4 -3, -1 -3, -1 0 C -1 -3, 2 -3, 2 0 C 2 -3, 5 -3, 5 0" />
        </>
      )
    case 'Waterfall':
      return <path d="M -6 -8 C -6 -4, -6 -4, -8 -1 M 0 -8 L 0 8 M 6 -8 C 6 -4, 6 -4, 8 -1" />
    default:
      return <circle cx={0} cy={0} r={4} />
  }
}

// Rough calibration for turning a real-world footprint (in feet) into a
// pixel size in the 400x300 photo-frame viewBox. The pool-photo generation
// prompts (see generate-pool-image) frame a ~16x32 foot inground pool with
// roughly an 8-foot concrete deck around it, so the ~400px-wide frame reads
// as showing a scene about 32 + 8 + 8 = ~48 feet across. This is only an
// approximation -- the goal isn't architectural precision, it's making
// different extras render at visibly distinct, proportionate sizes instead
// of one identical square for everything.
const PX_PER_FOOT = 8.3
const MIN_EXTRA_PX = 40
const MAX_EXTRA_PX = 170

// Approximate real-world bounding footprint (width x height, in feet) for
// each extra, used to size its sticker overlay so a small feature (a water
// jet) doesn't render at the same size as a large one (a tanning ledge).
// These are deliberately rough -- just enough to keep relative scale
// sensible across the lineup.
const EXTRA_FOOTPRINT_FT: Record<Exclude<FeatureName, 'LED Lighting'>, { width: number; height: number }> = {
  Slide: { width: 6, height: 9 },
  'Natural Slide': { width: 7, height: 9 },
  'Water Feature': { width: 8, height: 5 },
  'Swim-Up Bar': { width: 9, height: 6 },
  'Tanning Ledge': { width: 10, height: 7 },
  'Diving Board': { width: 9, height: 3.5 },
  'Hot Tub / Spa Combo': { width: 7, height: 7 },
  Waterfall: { width: 7, height: 8 },
}

function getExtraOverlaySize(name: Exclude<FeatureName, 'LED Lighting'>): { width: number; height: number } {
  const footprint = EXTRA_FOOTPRINT_FT[name]
  const clamp = (px: number) => Math.min(MAX_EXTRA_PX, Math.max(MIN_EXTRA_PX, px))
  return {
    width: clamp(footprint.width * PX_PER_FOOT),
    height: clamp(footprint.height * PX_PER_FOOT),
  }
}

// Renders one selected extra at its standard anchor position: the real
// pre-generated sticker if it exists, falling back to the hand-drawn badge
// icon (via onError) if that extra hasn't been generated yet. Sized per-item
// (see EXTRA_FOOTPRINT_FT above) rather than a single uniform square, so the
// overlay looks roughly to-scale next to the pool photo underneath it.
function ExtraOverlay({
  name,
  anchor,
}: {
  name: Exclude<FeatureName, 'LED Lighting'>
  anchor: { x: number; y: number }
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <EquipmentBadge x={anchor.x} y={anchor.y} color="#0369a1" title={name}>
        <FeatureIcon name={name} />
      </EquipmentBadge>
    )
  }

  const { width, height } = getExtraOverlaySize(name)

  return (
    <g
      className="pool-pop-in"
      style={{ transformBox: 'fill-box', transformOrigin: 'center', filter: 'url(#sticker-ground-shadow)' }}
    >
      <title>{name}</title>
      <image
        href={getExtraStickerUrl(name)}
        x={anchor.x - width / 2}
        y={anchor.y - height / 2}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        onError={() => setFailed(true)}
      />
    </g>
  )
}

// Renders the generated cover sticker over the approximate water region for
// the given pool type. If that cover hasn't been generated yet, renders
// nothing extra -- the footer chip below the image already says which
// cover is selected, so there's no broken-looking gap.
function CoverOverlay({ cover, poolType }: { cover: string; poolType: 'inground' | 'above_ground' }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null

  const region = COVER_REGION_BY_TYPE[poolType]
  return (
    <g className="pool-pop-in" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
      <title>Pool cover</title>
      <image
        href={getCoverStickerUrl(cover)}
        x={region.x}
        y={region.y}
        width={region.width}
        height={region.height}
        preserveAspectRatio="xMidYMid slice"
        onError={() => setFailed(true)}
      />
    </g>
  )
}

// "LED Lighting" isn't a sticker -- it's rendered as a soft colored glow
// concentrated near the edges of the water, using the same approximate
// water region as the cover overlay. `mix-blend-mode: screen` lets the
// glow color combine with the photo underneath instead of just sitting on
// top of it like a flat shape, which reads much more like an actual
// lighting effect than a sticker ever could.
function LedLightingGlow({ poolType }: { poolType: 'inground' | 'above_ground' }) {
  const region = COVER_REGION_BY_TYPE[poolType]
  const gradientId = `led-glow-${poolType}`
  return (
    <g className="pool-pop-in" style={{ mixBlendMode: 'screen' }}>
      <title>LED Lighting</title>
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="65%">
          <stop offset="50%" stopColor="#38bdf8" stopOpacity={0} />
          <stop offset="85%" stopColor="#38bdf8" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0.75} />
        </radialGradient>
      </defs>
      <rect
        x={region.x}
        y={region.y}
        width={region.width}
        height={region.height}
        rx={Math.min(region.width, region.height) * 0.08}
        fill={`url(#${gradientId})`}
      />
    </g>
  )
}

// Small footer-chip icon for a heater or filtration type: the real
// generated component icon once it exists, falling back to the original
// hand-drawn glyph until then.
function ComponentIcon({ src, fallback }: { src: string; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <>{fallback}</>
  return (
    <img
      src={src}
      alt=""
      width={16}
      height={16}
      className="h-4 w-4 shrink-0 object-contain"
      onError={() => setFailed(true)}
    />
  )
}

export default function PoolVisual({
  poolType,
  shape,
  construction,
  filtration = '',
  heater = '',
  cover = '',
  selectedFeatures = [],
}: PoolVisualProps) {
  const effectivePoolType = getEffectivePoolType(poolType)
  const effectiveShape = getPhotoShape(effectivePoolType, shape)
  const effectiveConstruction = getPhotoConstruction(effectivePoolType, construction)
  const photoUrl = getPhotoUrl(effectivePoolType, effectiveShape, effectiveConstruction)

  const hasCover = cover && cover !== 'none'

  // Ask for (or reuse the cached) fully-baked composite photo -- see the
  // comment at the top of this file and src/hooks/useCompositePhoto.ts.
  const extraSlugs = selectedFeatures
    .filter((name): name is Exclude<FeatureName, 'LED Lighting'> => name !== 'LED Lighting' && name in FEATURE_SLUGS)
    .map((name) => FEATURE_SLUGS[name])
  const { status: compositeStatus, url: compositeUrl } = useCompositePhoto({
    poolType: effectivePoolType,
    shape: effectiveShape,
    construction: effectiveConstruction,
    cover: hasCover && cover !== 'undecided' ? cover : 'none',
    extras: extraSlugs,
  })
  // Show a composite photo whenever one is available -- including a stale
  // one for the previous combo while a new one is still generating, which
  // reads far better than reverting to the sticker overlay on every click.
  // Stickers are the true, last-resort fallback: they only render when a
  // generation has actually failed or been rate-limited ('unavailable').
  const useComposite = Boolean(compositeUrl)
  const showStickerFallback = compositeStatus === 'unavailable'

  const coverLabel =
    cover === 'undecided' ? 'Cover — TBD' : hasCover ? `Cover: ${cover.replace(/_/g, ' ')}` : ''

  const filtrationColors: Record<string, string> = {
    saltwater: '#0ea5b8',
    traditional_chlorine: '#2563a8',
    mineral_uv: '#7c3aed',
    ozone: '#0d9488',
  }
  const filtrationColor = filtrationColors[filtration] ?? '#8b96a0'
  const filtrationLabel =
    filtration === 'undecided'
      ? 'Filtration — TBD'
      : filtration
        ? `Filtration: ${filtration.replace(/_/g, ' ')}`
        : ''

  const heaterLabel =
    heater === 'undecided'
      ? 'Heater — TBD'
      : heater && heater !== 'none'
        ? `Heater: ${heater.replace(/_/g, ' ')}`
        : ''

  return (
    <div className="overflow-hidden rounded-2xl border bg-gradient-to-b from-sky-100 via-sky-50 to-white shadow-inner">
      <div className="relative">
        <img
          key={useComposite ? compositeUrl : photoUrl}
          src={useComposite ? (compositeUrl as string) : photoUrl}
          alt="Photo preview of your pool"
          className="block aspect-[4/3] w-full object-cover pool-pop-in"
        />
        {/* Everything below is baked directly into the photo once a composite
            is ready, so the sticker overlays are strictly a last-resort
            fallback -- they render only if a composite generation actually
            failed or was rate-limited, never just while one is loading (a
            stale-but-real composite from the previous combo stays on screen
            during that wait instead, via `useComposite`/`compositeUrl`
            above). LED lighting is the one exception -- it's always a
            separate code-rendered glow, layered on top either way. */}
        <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" role="presentation">
          <defs>
            {/* Soft grounding shadow under every sticker overlay (extras + cover)
                so they read as sitting on the deck/water rather than looking
                like flat clipart pasted on top of the photo. */}
            <filter id="sticker-ground-shadow" x="-60%" y="-60%" width="220%" height="220%">
              <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#0f172a" floodOpacity="0.35" />
            </filter>
          </defs>
          {showStickerFallback && hasCover && cover !== 'undecided' && (
            <CoverOverlay key={cover} cover={cover} poolType={effectivePoolType} />
          )}
          {/* LED lighting can't show through a cover, so it only renders when the water is visible. */}
          {!hasCover && selectedFeatures.includes('LED Lighting') && (
            <LedLightingGlow poolType={effectivePoolType} />
          )}
          {showStickerFallback &&
            selectedFeatures.map((name) => {
              const index = ANCHORED_FEATURE_ORDER.indexOf(name as Exclude<FeatureName, 'LED Lighting'>)
              if (index === -1) return null
              return (
                <ExtraOverlay
                  key={name}
                  name={name as Exclude<FeatureName, 'LED Lighting'>}
                  anchor={FEATURE_ANCHORS[index]}
                />
              )
            })}
        </svg>
        {compositeStatus === 'loading' && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-slate-900/70 px-2.5 py-1 text-[11px] text-white">
            <span className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-white/40 border-t-white" />
            Enhancing preview…
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t bg-white/70 px-4 py-2 text-xs text-slate-500">
        <span>{effectivePoolType === 'above_ground' ? 'Above-ground' : 'Inground'}</span>
        <span>{CONSTRUCTION_LABELS[effectiveConstruction]}</span>
      </div>

      {(filtration || (heater && heater !== 'none') || hasCover) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t bg-white/70 px-4 py-2 text-xs text-slate-600">
          {filtration && (
            <span className="flex items-center gap-1.5">
              <ComponentIcon
                key={filtration}
                src={getComponentIconUrl('filtration', filtration)}
                fallback={<PumpGlyph color={filtrationColor} />}
              />
              {filtrationLabel}
            </span>
          )}
          {heater && heater !== 'none' && (
            <span className="flex items-center gap-1.5">
              <ComponentIcon
                key={heater}
                src={getComponentIconUrl('heater', heater)}
                fallback={<HeaterGlyph kind={heater} color="#e0742a" />}
              />
              {heaterLabel}
            </span>
          )}
          {hasCover && (
            <span className="flex items-center gap-1.5">
              <CoverGlyph color="#215a76" />
              {coverLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
