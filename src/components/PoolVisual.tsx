import { Suspense, lazy } from 'react'
import type { ExtraSlug } from '../three/extras'
import type { AboveGroundShapeId, ConstructionId, InGroundShapeId, PoolSize } from '../three/poolGeometry'

// Loaded lazily (its own chunk) so three.js + react-three-fiber -- which
// nothing else on the site needs -- aren't part of the initial page
// download for a visitor who hasn't reached the pool preview yet.
const PoolScene = lazy(() => import('../three/PoolScene'))

// The pool preview is a real, live 3D scene (see src/three/) instead of an
// AI-generated photo. A pool's shape, material, cover, and accessories are
// all built from the exact same shared geometry, so -- unlike the old
// pipeline, where every image was an independent, non-deterministic
// render -- a given shape always has the identical size/footprint/camera
// framing no matter which material or accessories are selected, and an
// accessory is placed by real math against the pool's actual outline
// rather than guessed at by a model. See src/three/buildScene.ts for the
// full picture.

const REAL_INGROUND_SHAPES: InGroundShapeId[] = ['rectangle', 'freeform', 'kidney', 'oval', 'round', 'lap']
const REAL_ABOVE_GROUND_SHAPES: AboveGroundShapeId[] = ['round', 'oval']
const REAL_INGROUND_CONSTRUCTIONS: ConstructionId[] = ['fiberglass', 'vinyl_liner', 'concrete_gunite']
// Above-ground pools are built with a steel/resin/aluminum wall over a
// vinyl liner -- fiberglass and concrete/gunite above-ground pools aren't
// a real product.
const REAL_ABOVE_GROUND_CONSTRUCTIONS: ConstructionId[] = ['vinyl_liner']

const CONSTRUCTION_LABELS: Record<ConstructionId, string> = {
  fiberglass: 'Fiberglass',
  vinyl_liner: 'Vinyl liner',
  concrete_gunite: 'Concrete / gunite',
}

// Whatever hasn't been picked yet (or was picked as "I'm not sure yet" /
// "Custom" / not a real option) falls back to a sensible default per pool
// type, so the preview always has something real to show -- including
// before any selection has been made at all.
const DEFAULT_SHAPE_BY_TYPE = { inground: 'rectangle' as InGroundShapeId, above_ground: 'round' as AboveGroundShapeId }
const DEFAULT_CONSTRUCTION_BY_TYPE = { inground: 'fiberglass' as ConstructionId, above_ground: 'vinyl_liner' as ConstructionId }

function getEffectivePoolType(poolType: string): 'inground' | 'above_ground' {
  return poolType === 'above_ground' ? 'above_ground' : 'inground'
}

function getEffectiveShape(poolType: 'inground' | 'above_ground', shape: string): InGroundShapeId | AboveGroundShapeId {
  if (poolType === 'above_ground') {
    return REAL_ABOVE_GROUND_SHAPES.includes(shape as AboveGroundShapeId)
      ? (shape as AboveGroundShapeId)
      : DEFAULT_SHAPE_BY_TYPE.above_ground
  }
  return REAL_INGROUND_SHAPES.includes(shape as InGroundShapeId) ? (shape as InGroundShapeId) : DEFAULT_SHAPE_BY_TYPE.inground
}

function getEffectiveConstruction(poolType: 'inground' | 'above_ground', construction: string): ConstructionId {
  const valid = poolType === 'above_ground' ? REAL_ABOVE_GROUND_CONSTRUCTIONS : REAL_INGROUND_CONSTRUCTIONS
  return valid.includes(construction as ConstructionId)
    ? (construction as ConstructionId)
    : DEFAULT_CONSTRUCTION_BY_TYPE[poolType]
}

const REAL_SIZES: PoolSize[] = ['small', 'medium', 'large']

function getEffectiveSize(size: string): PoolSize {
  return REAL_SIZES.includes(size as PoolSize) ? (size as PoolSize) : 'medium'
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

// Maps the display names stored in the fun_features table to the accessory
// slugs the 3D scene knows how to build (src/three/extras.ts). "LED
// Lighting" is deliberately absent -- it isn't a placed object, it's an
// emissive strip traced along the pool's own edge (see buildLedLightingGlow).
const FEATURE_SLUGS: Record<Exclude<FeatureName, 'LED Lighting'>, ExtraSlug> = {
  Slide: 'slide',
  'Natural Slide': 'natural_slide',
  'Water Feature': 'water_feature',
  'Swim-Up Bar': 'swim_up_bar',
  'Tanning Ledge': 'tanning_ledge',
  'Diving Board': 'diving_board',
  'Hot Tub / Spa Combo': 'hot_tub_spa_combo',
  Waterfall: 'waterfall',
}

type PoolVisualProps = {
  poolType: string
  shape: string
  construction: string
  size?: string
  filtration?: string
  heater?: string
  cover?: string
  selectedFeatures?: string[]
}

// The exact set of resolved, "real" values (no 'undecided'/'custom'/empty
// placeholders) that this component hands to the live PoolScene. Exported
// so anything else that needs to reproduce the identical 3D scene --
// namely LeadForm's post-submit guide-capture step, which builds the
// photoreal AI render from a screenshot of this same configuration -- can
// derive it from the same single source of truth instead of re-deriving
// (and risking drifting from) these defaulting rules itself.
export type ResolvedPoolVisualConfig = {
  poolType: 'inground' | 'above_ground'
  shape: InGroundShapeId | AboveGroundShapeId
  construction: ConstructionId
  size: PoolSize
  cover: string
  extras: ExtraSlug[]
  ledLighting: boolean
}

export function resolvePoolVisualConfig({
  poolType,
  shape,
  construction,
  size = '',
  cover = '',
  selectedFeatures = [],
}: Pick<PoolVisualProps, 'poolType' | 'shape' | 'construction' | 'size' | 'cover' | 'selectedFeatures'>): ResolvedPoolVisualConfig {
  const effectivePoolType = getEffectivePoolType(poolType)
  return {
    poolType: effectivePoolType,
    shape: getEffectiveShape(effectivePoolType, shape),
    construction: getEffectiveConstruction(effectivePoolType, construction),
    size: getEffectiveSize(size),
    cover: cover && cover !== 'undecided' ? cover : 'none',
    extras: selectedFeatures
      .filter((name): name is Exclude<FeatureName, 'LED Lighting'> => name !== 'LED Lighting' && name in FEATURE_SLUGS)
      .map((name) => FEATURE_SLUGS[name]),
    ledLighting: selectedFeatures.includes('LED Lighting'),
  }
}

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

export default function PoolVisual({
  poolType,
  shape,
  construction,
  size = '',
  filtration = '',
  heater = '',
  cover = '',
  selectedFeatures = [],
}: PoolVisualProps) {
  const effectivePoolType = getEffectivePoolType(poolType)
  const effectiveShape = getEffectiveShape(effectivePoolType, shape)
  const effectiveConstruction = getEffectiveConstruction(effectivePoolType, construction)
  const effectiveSize = getEffectiveSize(size)

  const hasCover = Boolean(cover) && cover !== 'none'
  const extraSlugs = selectedFeatures
    .filter((name): name is Exclude<FeatureName, 'LED Lighting'> => name !== 'LED Lighting' && name in FEATURE_SLUGS)
    .map((name) => FEATURE_SLUGS[name])

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
      <div className="aspect-[4/3] w-full">
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-sky-100 to-sky-50 text-sm text-slate-400">
              Loading 3D preview…
            </div>
          }
        >
          <PoolScene
            poolType={effectivePoolType}
            shape={effectiveShape}
            construction={effectiveConstruction}
            size={effectiveSize}
            cover={cover && cover !== 'undecided' ? cover : 'none'}
            extras={extraSlugs}
            ledLighting={selectedFeatures.includes('LED Lighting')}
          />
        </Suspense>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t bg-white/70 px-4 py-2 text-xs text-slate-500">
        <span>{effectivePoolType === 'above_ground' ? 'Above-ground' : 'Inground'}</span>
        <span className="capitalize">{effectiveSize}</span>
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
