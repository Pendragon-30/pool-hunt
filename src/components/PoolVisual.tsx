// The pool preview has two modes:
//
// - Photo mode: once pool type, shape, and construction form a real,
//   pre-rendered combination, we show an actual AI-generated photo of that
//   exact pool (one image per combo, generated once ahead of time via the
//   "Pool Photos" admin tool and stored in Supabase Storage — nothing is
//   generated live for site visitors). Fun-extras badges still overlay on
//   top of the photo.
// - Sketch mode (the original hand-illustrated SVG): used whenever the
//   combination is incomplete or falls outside what's pre-rendered ("I'm
//   not sure yet" / "Custom" shape / construction undecided), so there's
//   still a live, responsive preview while someone is deciding.

const SUPABASE_STORAGE_BASE = 'https://bpgirvmsgfqowgfwlhow.supabase.co/storage/v1/object/public/pool-photos'

const REAL_INGROUND_SHAPES = ['rectangle', 'freeform', 'kidney', 'oval', 'round', 'lap']
const REAL_ABOVE_GROUND_SHAPES = ['round', 'oval']
const REAL_INGROUND_CONSTRUCTIONS = ['fiberglass', 'vinyl_liner', 'concrete_gunite']
// Above-ground pools are built with a steel/resin/aluminum wall over a vinyl
// liner -- fiberglass and concrete/gunite above-ground pools aren't a real
// product, so there's no generated photo for those combos.
const REAL_ABOVE_GROUND_CONSTRUCTIONS = ['vinyl_liner']

function getPhotoUrl(poolType: string, shape: string, construction: string): string | null {
  if (poolType !== 'inground' && poolType !== 'above_ground') return null
  const validShapes = poolType === 'above_ground' ? REAL_ABOVE_GROUND_SHAPES : REAL_INGROUND_SHAPES
  const validConstructions =
    poolType === 'above_ground' ? REAL_ABOVE_GROUND_CONSTRUCTIONS : REAL_INGROUND_CONSTRUCTIONS
  if (!validShapes.includes(shape)) return null
  if (!validConstructions.includes(construction)) return null
  return `${SUPABASE_STORAGE_BASE}/${poolType}_${shape}_${construction}.png`
}

// Once someone has picked a pool type, we want the photo preview to show up
// right away rather than waiting on every field — so any shape/construction
// that isn't a real pre-rendered option yet ("I'm not sure yet", "Custom",
// or just not picked yet) falls back to a sensible default per pool type
// instead of dropping back to the old sketch placeholder.
const DEFAULT_SHAPE_BY_TYPE: Record<string, string> = { inground: 'rectangle', above_ground: 'round' }
const DEFAULT_CONSTRUCTION_BY_TYPE: Record<string, string> = { inground: 'fiberglass', above_ground: 'vinyl_liner' }

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

type PoolVisualProps = {
  poolType: string
  shape: string
  construction: string
  filtration?: string
  heater?: string
  cover?: string
  selectedFeatures?: string[]
}

const KIDNEY_PATH =
  'M 130 100 C 170 80, 230 80, 265 105 C 300 125, 300 165, 270 185 C 250 198, 230 185, 210 195 C 185 208, 175 230, 145 225 C 110 220, 95 195, 100 165 C 103 140, 100 115, 130 100 Z'

const FREEFORM_PATH =
  'M 120 110 C 160 85, 220 90, 255 115 C 295 140, 300 180, 270 205 C 245 225, 205 210, 175 220 C 140 230, 100 220, 95 185 C 90 150, 95 130, 120 110 Z'

/** Renders the raw outline for a given shape. Reused for the shadow, wall,
 * coping, water, and cover layers so every layer shares one silhouette.
 *
 * Presentation props are intentionally untyped (rather than
 * React.SVGProps<SVGRectElement | SVGEllipseElement | ...>) — this switches
 * between rect/ellipse/path elements, and every call site only ever passes
 * plain presentation attributes (fill, stroke, opacity, style, etc.), never
 * a ref, so the looser type avoids fighting SVG element type variance. */
function ShapeOutline({ shape, ...props }: { shape: string; [key: string]: any }) {
  switch (shape) {
    case 'rectangle':
      return <rect x={100} y={95} width={200} height={140} rx={16} {...props} />
    case 'oval':
      return <ellipse cx={200} cy={165} rx={110} ry={68} {...props} />
    case 'round':
      return <ellipse cx={200} cy={165} rx={82} ry={82} {...props} />
    case 'lap':
      return <rect x={105} y={125} width={190} height={54} rx={27} {...props} />
    case 'kidney':
      return <path d={KIDNEY_PATH} {...props} />
    case 'freeform':
      return <path d={FREEFORM_PATH} {...props} />
    case 'custom':
      return (
        <rect x={100} y={95} width={200} height={140} rx={28} strokeDasharray="10 8" {...props} />
      )
    default:
      return <ellipse cx={200} cy={165} rx={95} ry={65} strokeDasharray="8 6" {...props} />
  }
}

const CONSTRUCTION_STYLES: Record<
  string,
  { water: string; rim: string; coping: string; copingStroke: string; label: string }
> = {
  fiberglass: {
    water: 'url(#waterFiberglass)',
    rim: '#0c6d91',
    coping: 'url(#copingFiberglass)',
    copingStroke: '#c7d3d8',
    label: 'Fiberglass',
  },
  vinyl_liner: {
    water: 'url(#waterVinyl)',
    rim: '#184e8c',
    coping: 'url(#copingVinyl)',
    copingStroke: '#c9b48c',
    label: 'Vinyl liner',
  },
  concrete_gunite: {
    water: 'url(#waterConcrete)',
    rim: '#153a42',
    coping: 'url(#copingConcrete)',
    copingStroke: '#93938a',
    label: 'Concrete / gunite',
  },
}

const DEFAULT_CONSTRUCTION_STYLE = {
  water: 'url(#waterUndecided)',
  rim: '#7c8a91',
  coping: 'url(#copingUndecided)',
  copingStroke: '#c3cbd1',
  label: '',
}

// Small equipment badge shown near the deck corner once a real choice has
// been made. `dashed` marks an "I'm not sure yet" pick.
function EquipmentBadge({
  x,
  y,
  color,
  dashed,
  title,
  children,
}: {
  x: number
  y: number
  color: string
  dashed?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <g transform={`translate(${x}, ${y})`} className="pool-pop-in">
      <title>{title}</title>
      <circle
        r={19}
        fill="white"
        stroke={color}
        strokeWidth={2.5}
        strokeDasharray={dashed ? '3 3' : undefined}
        opacity={dashed ? 0.7 : 1}
      />
      <g stroke={color} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={dashed ? 0.7 : 1}>
        {children}
      </g>
    </g>
  )
}

// Small standalone (not badge-wrapped) icons used in the equipment chip row
// below the image, so they never compete for space with the fun-extras
// anchors drawn on the pool ring itself.
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

export default function PoolVisual({
  poolType,
  shape,
  construction,
  filtration = '',
  heater = '',
  cover = '',
  selectedFeatures = [],
}: PoolVisualProps) {
  const effectiveShape = shape || 'undecided'
  const style = CONSTRUCTION_STYLES[construction] ?? DEFAULT_CONSTRUCTION_STYLE
  const isAboveGround = poolType === 'above_ground'
  const isPending = !shape
  const shapeKey = `${poolType}-${effectiveShape}`
  const hasCover = cover && cover !== 'none'
  const photoUrl =
    poolType === 'inground' || poolType === 'above_ground'
      ? getPhotoUrl(poolType, getPhotoShape(poolType, shape), getPhotoConstruction(poolType, construction))
      : null

  const coverLabel =
    cover === 'undecided'
      ? 'Cover — TBD'
      : hasCover
        ? `Cover: ${cover.replace(/_/g, ' ')}`
        : ''

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
      {photoUrl ? (
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
              const anchor = FEATURE_ANCHORS[index]
              return (
                <EquipmentBadge key={name} x={anchor.x} y={anchor.y} color="#0369a1" title={name}>
                  <FeatureIcon name={name as FeatureName} />
                </EquipmentBadge>
              )
            })}
          </svg>
        </div>
      ) : (
      <svg viewBox="0 0 400 300" className="block w-full" role="img" aria-label="Preview of your pool">
        <defs>
          <radialGradient id="sceneVignette" cx="50%" cy="38%" r="75%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </radialGradient>

          <linearGradient id="waterFiberglass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8fe7f5" />
            <stop offset="100%" stopColor="#0b7fa8" />
          </linearGradient>
          <linearGradient id="waterVinyl" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#63b0f2" />
            <stop offset="100%" stopColor="#164f92" />
          </linearGradient>
          <linearGradient id="waterConcrete" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#568a95" />
            <stop offset="100%" stopColor="#173d45" />
          </linearGradient>
          <linearGradient id="waterUndecided" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c2ccd1" />
            <stop offset="100%" stopColor="#8d99a1" />
          </linearGradient>

          <linearGradient id="copingFiberglass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#dde4e7" />
          </linearGradient>
          <linearGradient id="copingVinyl" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#efe1c2" />
            <stop offset="100%" stopColor="#c9b087" />
          </linearGradient>
          <linearGradient id="copingConcrete" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dcdcd4" />
            <stop offset="100%" stopColor="#a3a39a" />
          </linearGradient>
          <linearGradient id="copingUndecided" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#eceff1" />
            <stop offset="100%" stopColor="#cdd3d8" />
          </linearGradient>

          <linearGradient id="wallGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#eef1f2" />
            <stop offset="55%" stopColor="#b8bfc4" />
            <stop offset="100%" stopColor="#8b9297" />
          </linearGradient>
          <pattern id="wallCorrugation" width="7" height="7" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="7" stroke="#00000030" strokeWidth="1.5" />
          </pattern>

          <pattern id="diamondPattern" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="14" stroke="#ffffff" strokeWidth="1.5" opacity="0.55" />
          </pattern>
          <pattern id="specklePattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#ffffff" opacity="0.6" />
            <circle cx="7" cy="6" r="0.8" fill="#ffffff" opacity="0.5" />
          </pattern>

          <pattern id="coverMesh" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M0 0 L8 8 M8 0 L0 8" stroke="#0f2f3d" strokeWidth="1" opacity="0.5" />
          </pattern>
          <pattern id="coverSlats" width="100%" height="10" patternUnits="userSpaceOnUse">
            <rect width="100%" height="5" fill="#00000022" />
          </pattern>
        </defs>

        {/* Deck / patio backdrop the pool sits on */}
        <rect x={30} y={40} width={340} height={245} rx={26} fill="#f4efe4" stroke="#e2d9c6" />
        <rect x={30} y={40} width={340} height={245} rx={26} fill="url(#sceneVignette)" />

        <g key={shapeKey} className="pool-pop-in" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          {/* Above-ground pools get a raised wall ring behind the coping */}
          {isAboveGround && !isPending && (
            <>
              <ShapeOutline
                shape={effectiveShape}
                fill="url(#wallGradient)"
                style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: 'scale(1.18)' }}
              />
              <ShapeOutline
                shape={effectiveShape}
                fill="url(#wallCorrugation)"
                opacity={0.7}
                style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: 'scale(1.18)' }}
              />
              <ShapeOutline
                shape={effectiveShape}
                fill="none"
                stroke="#ffffff"
                strokeOpacity={0.8}
                strokeWidth={1.5}
                style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: 'scale(1.09)' }}
              />
            </>
          )}

          {/* Grounding shadow — bigger + softer for more lift off the deck */}
          <ShapeOutline
            shape={effectiveShape}
            fill="#00131a"
            opacity={0.22}
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
              transform: 'translate(6px, 12px) scale(1.04)',
              filter: 'blur(5px)',
            }}
          />

          {/* Coping / deck border */}
          <ShapeOutline
            shape={effectiveShape}
            fill={isPending ? DEFAULT_CONSTRUCTION_STYLE.coping : style.coping}
            stroke={isPending ? DEFAULT_CONSTRUCTION_STYLE.copingStroke : style.copingStroke}
            strokeWidth={2}
            opacity={isPending ? 0.6 : 1}
          />

          {/* Inground pools step down from the coping — a darker rim in
              shadow reads as wall depth without a literal 3D extrusion. */}
          {!isAboveGround && (
            <ShapeOutline
              shape={effectiveShape}
              fill={isPending ? DEFAULT_CONSTRUCTION_STYLE.rim : style.rim}
              opacity={isPending ? 0.35 : 0.55}
              style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: 'scale(0.94)' }}
            />
          )}

          {/* Water surface, inset within the rim */}
          <g
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
              transform: 'scale(0.84)',
              transition: 'transform 300ms ease',
            }}
          >
            <ShapeOutline
              shape={effectiveShape}
              fill={isPending ? DEFAULT_CONSTRUCTION_STYLE.water : style.water}
              opacity={isPending ? 0.55 : 1}
              style={{ transition: 'fill 300ms ease' }}
            />

            {construction === 'vinyl_liner' && (
              <ShapeOutline shape={effectiveShape} fill="url(#diamondPattern)" opacity={0.3} />
            )}
            {construction === 'concrete_gunite' && (
              <ShapeOutline shape={effectiveShape} fill="url(#specklePattern)" opacity={0.35} />
            )}
            {construction === 'fiberglass' && (
              <ellipse cx={165} cy={128} rx={40} ry={17} fill="#ffffff" opacity={0.25} style={{ filter: 'blur(2px)' }} />
            )}

            {/* Pool cover — slides on over the water once a real cover type
                is chosen (not "No cover") */}
            {hasCover && (
              <g key={cover} className="pool-cover-slide">
                <ShapeOutline
                  shape={effectiveShape}
                  fill={
                    cover === 'safety_cover'
                      ? '#1d4e5c'
                      : cover === 'automatic'
                        ? '#2b5f73'
                        : '#215a76'
                  }
                  opacity={cover === 'safety_cover' ? 0.55 : 0.92}
                />
                {cover === 'safety_cover' && (
                  <ShapeOutline shape={effectiveShape} fill="url(#coverMesh)" opacity={0.9} />
                )}
                {cover === 'automatic' && (
                  <ShapeOutline shape={effectiveShape} fill="url(#coverSlats)" opacity={0.8} />
                )}
                {cover === 'manual' && (
                  <ShapeOutline shape={effectiveShape} fill="none" stroke="#ffffff" strokeOpacity={0.25} strokeWidth={3} />
                )}
              </g>
            )}
          </g>
        </g>

        {/* Fun extras — appear one by one at fixed positions around the deck */}
        {selectedFeatures.map((name) => {
          const index = FEATURE_ORDER.indexOf(name as FeatureName)
          if (index === -1) return null
          const anchor = FEATURE_ANCHORS[index]
          return (
            <EquipmentBadge key={name} x={anchor.x} y={anchor.y} color="#0369a1" title={name}>
              <FeatureIcon name={name as FeatureName} />
            </EquipmentBadge>
          )
        })}
      </svg>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t bg-white/70 px-4 py-2 text-xs text-slate-500">
        <span>
          {poolType === 'above_ground' ? 'Above-ground' : poolType === 'inground' ? 'Inground' : 'Pool type — TBD'}
        </span>
        <span>{style.label || 'Construction — TBD'}</span>
      </div>

      {(filtration || (heater && heater !== 'none') || (photoUrl && hasCover)) && (
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
          {photoUrl && hasCover && (
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
