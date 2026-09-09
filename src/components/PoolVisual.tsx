import { useState } from 'react'

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
// the same spot so nothing is ever missing from the preview.

const SUPABASE_STORAGE_BASE = 'https://bpgirvmsgfqowgfwlhow.supabase.co/storage/v1/object/public/pool-photos'
const FUN_EXTRAS_STORAGE_BASE = 'https://bpgirvmsgfqowgfwlhow.supabase.co/storage/v1/object/public/fun-extras'

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
  | 'Water Feature'
  | 'Swim-Up Bar'
  | 'Tanning Ledge'
  | 'Diving Board'
  | 'LED Lighting'
  | 'Hot Tub / Spa Combo'
  | 'Waterfall'

// Filenames for each extra's pre-generated sticker in the fun-extras bucket.
const FEATURE_SLUGS: Record<FeatureName, string> = {
  Slide: 'slide',
  'Water Feature': 'water_feature',
  'Swim-Up Bar': 'swim_up_bar',
  'Tanning Ledge': 'tanning_ledge',
  'Diving Board': 'diving_board',
  'LED Lighting': 'led_lighting',
  'Hot Tub / Spa Combo': 'hot_tub_spa_combo',
  Waterfall: 'waterfall',
}

function getExtraStickerUrl(name: FeatureName): string {
  return `${FUN_EXTRAS_STORAGE_BASE}/${FEATURE_SLUGS[name]}.png`
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

const FEATURE_ORDER: FeatureName[] = [
  'Slide',
  'Water Feature',
  'Swim-Up Bar',
  'Tanning Ledge',
  'Diving Board',
  'LED Lighting',
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

// Renders one selected extra at its standard anchor position: the real
// pre-generated sticker if it exists, falling back to the hand-drawn badge
// icon (via onError) if that extra hasn't been generated yet.
function ExtraOverlay({ name, anchor }: { name: FeatureName; anchor: { x: number; y: number } }) {
  const [failed, setFailed] = useState(false)
  const size = 68

  if (failed) {
    return (
      <EquipmentBadge x={anchor.x} y={anchor.y} color="#0369a1" title={name}>
        <FeatureIcon name={name} />
      </EquipmentBadge>
    )
  }

  return (
    <g className="pool-pop-in" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
      <title>{name}</title>
      <image
        href={getExtraStickerUrl(name)}
        x={anchor.x - size / 2}
        y={anchor.y - size / 2}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
        onError={() => setFailed(true)}
      />
    </g>
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
          key={photoUrl}
          src={photoUrl}
          alt="Photo preview of your pool"
          className="block aspect-[4/3] w-full object-cover pool-pop-in"
        />
        <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" role="presentation">
          {selectedFeatures.map((name) => {
            const index = FEATURE_ORDER.indexOf(name as FeatureName)
            if (index === -1) return null
            return <ExtraOverlay key={name} name={name as FeatureName} anchor={FEATURE_ANCHORS[index]} />
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t bg-white/70 px-4 py-2 text-xs text-slate-500">
        <span>{effectivePoolType === 'above_ground' ? 'Above-ground' : 'Inground'}</span>
        <span>{CONSTRUCTION_LABELS[effectiveConstruction]}</span>
      </div>

      {(filtration || (heater && heater !== 'none') || hasCover) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t bg-white/70 px-4 py-2 text-xs text-slate-600">
          {filtration && (
            <span className="flex items-center gap-1.5">
              <PumpGlyph color={filtrationColor} />
              {filtrationLabel}
            </span>
          )}
          {heater && heater !== 'none' && (
            <span className="flex items-center gap-1.5">
              <HeaterGlyph kind={heater} color="#e0742a" />
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
