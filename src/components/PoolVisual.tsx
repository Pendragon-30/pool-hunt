// A hand-illustrated, stylized "3D-ish" pool preview built entirely from SVG
// shapes — no external images or generated art. Every layer (deck, shadow,
// coping, water, texture, above-ground wall) is composed at render time from
// the shopper's current selections, so the pool visibly builds itself as
// they move through the form.
//
// Scope note: this first pass reacts to pool type, shape, and construction.
// Filtration/heater mechanicals, an animated cover, fun-extras icons, and
// budget-driven sizing are designed to layer on top of this same component
// in a follow-up pass — see the TODO markers below for where they'll hook in.

type PoolType = '' | 'inground' | 'above_ground' | 'undecided'
type Shape = '' | 'rectangle' | 'freeform' | 'kidney' | 'oval' | 'round' | 'lap' | 'custom' | 'undecided'
type Construction = '' | 'fiberglass' | 'vinyl_liner' | 'concrete_gunite' | 'undecided'

type PoolVisualProps = {
  poolType: PoolType | string
  shape: Shape | string
  construction: Construction | string
}

const KIDNEY_PATH =
  'M 130 100 C 170 80, 230 80, 265 105 C 300 125, 300 165, 270 185 C 250 198, 230 185, 210 195 C 185 208, 175 230, 145 225 C 110 220, 95 195, 100 165 C 103 140, 100 115, 130 100 Z'

const FREEFORM_PATH =
  'M 120 110 C 160 85, 220 90, 255 115 C 295 140, 300 180, 270 205 C 245 225, 205 210, 175 220 C 140 230, 100 220, 95 185 C 90 150, 95 130, 120 110 Z'

/** Renders the raw outline for a given shape. Reused for the shadow, the
 * coping/deck-border layer, and (scaled down via CSS) the water layer, so
 * every layer always shares one exact silhouette.
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
        <rect
          x={100}
          y={95}
          width={200}
          height={140}
          rx={28}
          strokeDasharray="10 8"
          {...props}
        />
      )
    default:
      // Undecided / not yet picked — a soft, dashed placeholder.
      return (
        <ellipse
          cx={200}
          cy={165}
          rx={95}
          ry={65}
          strokeDasharray="8 6"
          {...props}
        />
      )
  }
}

const CONSTRUCTION_STYLES: Record<
  string,
  { water: string; coping: string; copingStroke: string; label: string }
> = {
  fiberglass: {
    water: 'url(#waterFiberglass)',
    coping: 'url(#copingFiberglass)',
    copingStroke: '#c7d3d8',
    label: 'Fiberglass',
  },
  vinyl_liner: {
    water: 'url(#waterVinyl)',
    coping: 'url(#copingVinyl)',
    copingStroke: '#c9b48c',
    label: 'Vinyl liner',
  },
  concrete_gunite: {
    water: 'url(#waterConcrete)',
    coping: 'url(#copingConcrete)',
    copingStroke: '#93938a',
    label: 'Concrete / gunite',
  },
}

const DEFAULT_CONSTRUCTION_STYLE = {
  water: 'url(#waterUndecided)',
  coping: 'url(#copingUndecided)',
  copingStroke: '#c3cbd1',
  label: '',
}

export default function PoolVisual({ poolType, shape, construction }: PoolVisualProps) {
  const effectiveShape = shape || 'undecided'
  const style = CONSTRUCTION_STYLES[construction] ?? DEFAULT_CONSTRUCTION_STYLE
  const isAboveGround = poolType === 'above_ground'
  const isPending = !shape // haven't gotten to shape yet — render the muted placeholder
  const animKey = `${poolType}-${effectiveShape}`

  return (
    <div className="overflow-hidden rounded-2xl border bg-gradient-to-b from-sky-50 to-white">
      <svg viewBox="0 0 400 300" className="block w-full" role="img" aria-label="Preview of your pool">
        <defs>
          <linearGradient id="waterFiberglass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7fe0f0" />
            <stop offset="100%" stopColor="#0e7fa8" />
          </linearGradient>
          <linearGradient id="waterVinyl" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5aa8ec" />
            <stop offset="100%" stopColor="#1c5fa8" />
          </linearGradient>
          <linearGradient id="waterConcrete" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4c7c86" />
            <stop offset="100%" stopColor="#1f4750" />
          </linearGradient>
          <linearGradient id="waterUndecided" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c2ccd1" />
            <stop offset="100%" stopColor="#98a4ab" />
          </linearGradient>

          <linearGradient id="copingFiberglass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e4e9ec" />
          </linearGradient>
          <linearGradient id="copingVinyl" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ecdfc0" />
            <stop offset="100%" stopColor="#cdb790" />
          </linearGradient>
          <linearGradient id="copingConcrete" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d9d9d2" />
            <stop offset="100%" stopColor="#adada4" />
          </linearGradient>
          <linearGradient id="copingUndecided" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#eceff1" />
            <stop offset="100%" stopColor="#d3d9dd" />
          </linearGradient>

          <linearGradient id="wallGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e6e9eb" />
            <stop offset="100%" stopColor="#9aa1a6" />
          </linearGradient>
          <pattern id="wallCorrugation" width="8" height="8" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#00000022" strokeWidth="1.5" />
          </pattern>
          <pattern
            id="diamondPattern"
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="14" stroke="#ffffff" strokeWidth="1.5" opacity="0.5" />
          </pattern>
          <pattern id="specklePattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#ffffff" opacity="0.55" />
            <circle cx="7" cy="6" r="0.8" fill="#ffffff" opacity="0.45" />
          </pattern>
        </defs>

        {/* Deck / patio backdrop the pool sits on */}
        <rect x={40} y={50} width={320} height={230} rx={24} fill="#f4efe6" stroke="#e6dfd0" />

        <g key={animKey} className="pool-pop-in" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          {/* Above-ground pools get a raised wall ring behind the coping */}
          {isAboveGround && !isPending && (
            <>
              <ShapeOutline
                shape={effectiveShape}
                fill="url(#wallGradient)"
                style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: 'scale(1.16)' }}
              />
              <ShapeOutline
                shape={effectiveShape}
                fill="url(#wallCorrugation)"
                opacity={0.6}
                style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: 'scale(1.16)' }}
              />
            </>
          )}

          {/* Soft grounding shadow */}
          <ShapeOutline
            shape={effectiveShape}
            fill="#00131a"
            opacity={0.18}
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
              transform: 'translate(5px, 9px)',
              filter: 'blur(3px)',
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

          {/* Water surface, inset within the coping */}
          <g
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
              transform: 'scale(0.86)',
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
              <ellipse cx={165} cy={130} rx={38} ry={16} fill="#ffffff" opacity={0.22} style={{ filter: 'blur(2px)' }} />
            )}
          </g>
        </g>

        {/* TODO (next pass): filtration/heater mechanicals beside the deck,
            an animated cover overlay, fun-extras icons added one by one,
            and measurement labels scaled by budget range. */}
      </svg>

      <div className="flex items-center justify-between border-t bg-white/60 px-4 py-2 text-xs text-slate-500">
        <span>
          {poolType === 'above_ground'
            ? 'Above-ground'
            : poolType === 'inground'
              ? 'Inground'
              : 'Pool type — not yet chosen'}
        </span>
        <span>{style.label || 'Construction — not yet chosen'}</span>
      </div>
    </div>
  )
}
