import * as THREE from 'three'

// This module is the single source of truth for what shape a pool actually
// is, in real-world feet. Everything downstream -- the basin walls, the
// deck's cutout, the water surface, and where accessories get placed -- is
// built from the exact same outline points, so a shape can never drift
// between its own material variants (only the material swaps) and an
// accessory can never end up the wrong size relative to the pool it's
// sitting next to. That "everything traces back to one shared shape" is the
// whole reason this replaced the old AI-generated-photo pipeline, where each
// image was an independent, non-deterministic render with no such guarantee.

export type PoolType = 'inground' | 'above_ground'
export type InGroundShapeId = 'rectangle' | 'freeform' | 'kidney' | 'oval' | 'round' | 'lap'
export type AboveGroundShapeId = 'round' | 'oval'
export type ConstructionId = 'fiberglass' | 'vinyl_liner' | 'concrete_gunite'
export type PoolSize = 'small' | 'medium' | 'large'

export const INGROUND_SHAPES: InGroundShapeId[] = ['rectangle', 'freeform', 'kidney', 'oval', 'round', 'lap']
export const ABOVE_GROUND_SHAPES: AboveGroundShapeId[] = ['round', 'oval']

export const INGROUND_DEPTH_FT = 4.5
export const INGROUND_DECK_THICKNESS_FT = 0.4
export const ABOVE_GROUND_WALL_THICKNESS_FT = 0.25

// Baseline ("medium") real-world footprints. SIZE_MULTIPLIERS below scales
// both dimensions of whichever shape is picked, so a "large" freeform pool
// is still recognizably the same freeform outline, just bigger -- not a
// differently-shaped pool.
export const INGROUND_DIMENSIONS: Record<InGroundShapeId, { width: number; length: number }> = {
  rectangle: { width: 16, length: 32 },
  oval: { width: 15, length: 30 },
  round: { width: 18, length: 18 },
  lap: { width: 8, length: 40 },
  kidney: { width: 20, length: 24 },
  freeform: { width: 22, length: 24 },
}

export const ABOVE_GROUND_DIMENSIONS: Record<AboveGroundShapeId, { width: number; length: number; wallHeight: number }> = {
  round: { width: 24, length: 24, wallHeight: 4 },
  oval: { width: 12, length: 24, wallHeight: 4 },
}

// Scales footprint width/length only -- basin depth (INGROUND_DEPTH_FT) and
// above-ground wall height stay constant across sizes. That's a deliberate
// simplification (real pools do vary a little in depth by size) rather than
// an oversight: depth-dependent values elsewhere (camera target height,
// water-line offsets) were tuned against a fixed depth, and real-world
// above-ground pool walls in particular are close to a standard height
// regardless of diameter, so footprint is what actually reads as "size" to
// a shopper anyway.
//
// The camera always zooms to frame whatever footprint it's given (see
// boundingRadius in buildScene.ts), so a bigger pool does NOT automatically
// look bigger in the photo purely from a larger real-world footprint --
// every combo gets normalized to fill the frame the same way. The only
// thing that actually reads as "size" on screen is how much of that frame
// the pool itself occupies versus its surrounding deck (a fixed-width deck
// margin), which is why "large" needs a substantially bigger multiplier
// than "small" needs a smaller one: shrinking small further barely changes
// its on-screen deck ratio once you're already this close to the fixed
// margin's own width, while growing large further keeps paying off because
// the fixed margin becomes a smaller and smaller fraction of the total. An
// earlier version (0.7 / 1 / 1.35) read as "kiddie pool" at small and only
// mildly bigger than medium at large -- see the DECK_MARGIN_SCALE_BY_SIZE
// comment below for the other half of this fix.
// Second pass: even after the first fix (0.8 / 1 / 1.6, margin scale
// 0.7 / 1 / 1), "large" still read as only modestly bigger than medium --
// with the deck margin still fixed at the full 8ft for large, the pool
// only occupied roughly the high-40s percent of the framed footprint's
// area. Pushed large's own multiplier further (1.6 -> 2.0) AND gave large
// a reduced margin scale too (see DECK_MARGIN_SCALE_BY_SIZE below), the
// same lever already used for small -- together these push a large pool
// to roughly two-thirds of the framed footprint, a much more decisive
// jump from medium than scaling the multiplier alone could achieve.
export const SIZE_MULTIPLIERS: Record<PoolSize, number> = {
  small: 0.8,
  medium: 1,
  large: 2,
}

function scaleDims<T extends { width: number; length: number }>(dims: T, size: PoolSize): T {
  const mult = SIZE_MULTIPLIERS[size]
  return { ...dims, width: dims.width * mult, length: dims.length * mult }
}

// A small pool doesn't need to lose most of its own visual footprint to a
// full-width deck margin -- with the same fixed 8ft margin at every size,
// a "small" pool (already the shortest side of SIZE_MULTIPLIERS) reads as
// a tiny puddle in the middle of a comparatively enormous deck, which is
// exactly the "kiddie pool" look this was meant to avoid. 'medium' keeps
// the standard margin as the baseline reference. This has to live here
// (not just in buildScene.ts) because getSceneFootprint below -- which
// drives the camera's framing -- needs to agree with whatever margin
// buildInGroundScene actually builds the deck at, or the camera zooms for
// a margin that isn't the one on screen.
//
// Second pass: 'large' originally kept the full margin scale (1) on the
// theory that by then the pool was already the dominant shape in frame --
// true, but only mildly so. Giving 'large' its own reduced margin too
// (same lever as 'small') is what actually pushes it to look decisively
// bigger rather than just somewhat bigger than medium -- paired with the
// larger SIZE_MULTIPLIERS.large above.
export const DECK_MARGIN_SCALE_BY_SIZE: Record<PoolSize, number> = {
  small: 0.7,
  medium: 1,
  large: 0.65,
}

// Third pass: the fixes above make "small vs. medium vs. large" read
// consistently WITHIN a single shape, but a separate inconsistency
// survived across DIFFERENT shapes at the same size tier -- a "large"
// rectangle and a "large" lap pool didn't fill the frame by the same
// amount, because both were getting the exact same flat number of feet
// of margin (INGROUND_DECK_MARGIN_FT) regardless of how different their
// own baseline proportions are. An 8ft margin added to an 8ft-wide lap
// lane more than triples its width; the same 8ft margin added to a
// 16x32 rectangle or an 18x18 round pool is a much smaller relative
// addition -- so shapes with a narrower baseline footprint always read
// smaller than shapes with a wider one, independent of the size tier
// actually selected.
//
// The fix is to size the margin off each shape's OWN baseline
// ("medium", pre-SIZE_MULTIPLIERS) footprint instead of a single global
// constant -- sqrt(baselineWidth * baselineLength) as a single
// "characteristic size" per shape, geometric mean rather than arithmetic
// so it isn't skewed by extremely oblong shapes like the lap pool.
// Crucially this baseline is computed from the UNSCALED medium dimensions
// (not the size-adjusted ones), so it still varies only by shape, not by
// which size tier is selected -- DECK_MARGIN_SCALE_BY_SIZE above remains
// the only thing that makes small/medium/large differ from each other.
// DECK_MARGIN_FRACTION is tuned so a medium rectangle lands close to the
// old flat 8ft default, keeping the already-approved rectangle renders
// close to how they looked before this pass.
//
// This doesn't make every shape occupy a perfectly identical fraction of
// the frame -- a circular or organic (kidney/freeform) outline genuinely
// fills less of its own bounding box than a rectangle does, and that
// residual gap is a real property of the shapes themselves, not a margin
// bug. What it does fix is the much larger, purely-accidental spread that
// came from applying one flat foot-count across wildly different
// baseline footprints.
export const DECK_MARGIN_FRACTION = 0.35

function baselineCharacteristicSize(dims: { width: number; length: number }): number {
  return Math.sqrt(dims.width * dims.length)
}

export function getInGroundDeckMarginFt(shape: InGroundShapeId, size: PoolSize): number {
  const baseline = baselineCharacteristicSize(INGROUND_DIMENSIONS[shape])
  return baseline * DECK_MARGIN_FRACTION * (DECK_MARGIN_SCALE_BY_SIZE[size] ?? 1)
}

// Above-ground pools previously had NO margin at all in getSceneFootprint
// (the camera framed the bare pool wall with nothing else in the
// footprint) -- which meant a "small" and "large" above-ground pool of
// the same shape looked identical on screen, since the bounding-sphere
// camera just zoomed to fit whatever wall it was given either way. This
// gives above-ground pools the same shape-proportional, size-aware margin
// treatment as inground (a modest yard/patio buffer standing in for the
// deck an inground pool has), so above-ground pools get real size
// differentiation and stay consistent with inground shapes too.
export function getAboveGroundDeckMarginFt(shape: AboveGroundShapeId, size: PoolSize): number {
  const baseline = baselineCharacteristicSize(ABOVE_GROUND_DIMENSIONS[shape])
  return baseline * DECK_MARGIN_FRACTION * (DECK_MARGIN_SCALE_BY_SIZE[size] ?? 1)
}

export function getInGroundDimensions(shape: InGroundShapeId, size: PoolSize): { width: number; length: number } {
  return scaleDims(INGROUND_DIMENSIONS[shape], size)
}

export function getAboveGroundDimensions(
  shape: AboveGroundShapeId,
  size: PoolSize,
): { width: number; length: number; wallHeight: number } {
  return scaleDims(ABOVE_GROUND_DIMENSIONS[shape], size)
}

function roundedRectShape(width: number, length: number, radius: number): THREE.Shape {
  const hw = width / 2
  const hl = length / 2
  const r = Math.min(radius, hw, hl)
  const s = new THREE.Shape()
  s.moveTo(-hw + r, -hl)
  s.lineTo(hw - r, -hl)
  s.quadraticCurveTo(hw, -hl, hw, -hl + r)
  s.lineTo(hw, hl - r)
  s.quadraticCurveTo(hw, hl, hw - r, hl)
  s.lineTo(-hw + r, hl)
  s.quadraticCurveTo(-hw, hl, -hw, hl - r)
  s.lineTo(-hw, -hl + r)
  s.quadraticCurveTo(-hw, -hl, -hw + r, -hl)
  s.closePath()
  return s
}

function ellipseShape(width: number, length: number): THREE.Shape {
  const s = new THREE.Shape()
  s.absellipse(0, 0, width / 2, length / 2, 0, Math.PI * 2, false, 0)
  return s
}

// A rectangle with semicircular caps -- the classic "stadium" outline,
// used for the lap pool so its ends read as smooth rounded coping rather
// than square corners.
function stadiumShape(width: number, length: number): THREE.Shape {
  const r = width / 2
  const halfStraight = Math.max(length / 2 - r, 0.5)
  const s = new THREE.Shape()
  s.moveTo(-r, -halfStraight)
  s.lineTo(-r, halfStraight)
  s.absarc(0, halfStraight, r, Math.PI, 0, true)
  s.lineTo(r, -halfStraight)
  s.absarc(0, -halfStraight, r, 0, Math.PI, true)
  s.closePath()
  return s
}

// Organic (kidney / freeform) outlines are built from a small set of
// hand-picked radius multipliers sampled around an ellipse and smoothed
// through a closed centripetal Catmull-Rom curve, then re-sampled into a
// plain point list. Centripetal parameterization is specifically the
// variant that avoids self-intersecting loops/cusps for unevenly spaced
// control points, which matters here since we deliberately want an uneven,
// hand-shaped silhouette rather than a perfect ellipse.
function organicShape(width: number, length: number, radiusMultipliers: number[]): THREE.Shape {
  const rx = width / 2
  const rz = length / 2
  const n = radiusMultipliers.length
  const controlPoints = radiusMultipliers.map((mult, i) => {
    const angle = (i / n) * Math.PI * 2
    return new THREE.Vector3(Math.cos(angle) * rx * mult, Math.sin(angle) * rz * mult, 0)
  })
  const curve = new THREE.CatmullRomCurve3(controlPoints, true, 'centripetal')
  const sampled = curve.getPoints(96)
  return new THREE.Shape(sampled.map((p) => new THREE.Vector2(p.x, p.y)))
}

// A rounded, gently pinched bean outline -- one shallow concave "waist" on
// one side (index 4, the left) and a slightly fuller bulge opposite it
// (index 6), which is what reads as "kidney-shaped" at a glance without
// being so sharp a curve that the smoothing pass risks a self-intersection.
const KIDNEY_RADIUS_MULTIPLIERS = [1.0, 0.95, 1.05, 0.9, 0.6, 0.8, 1.1, 0.95]

// Gentle, irregular variation with no sharp concave pinch -- a soft
// asymmetric "lagoon" outline, distinct from the kidney's waist.
const FREEFORM_RADIUS_MULTIPLIERS = [1.0, 1.08, 0.92, 1.1, 0.85, 1.05, 0.95, 1.02]

export function getInGroundOutlineShape(shape: InGroundShapeId, size: PoolSize = 'medium'): THREE.Shape {
  const { width, length } = getInGroundDimensions(shape, size)
  switch (shape) {
    case 'rectangle':
      return roundedRectShape(width, length, 1)
    case 'oval':
      return ellipseShape(width, length)
    case 'round':
      return ellipseShape(width, length)
    case 'lap':
      return stadiumShape(width, length)
    case 'kidney':
      return organicShape(width, length, KIDNEY_RADIUS_MULTIPLIERS)
    case 'freeform':
      return organicShape(width, length, FREEFORM_RADIUS_MULTIPLIERS)
  }
}

export function getAboveGroundOutlineShape(shape: AboveGroundShapeId, size: PoolSize = 'medium'): THREE.Shape {
  const { width, length } = getAboveGroundDimensions(shape, size)
  return ellipseShape(width, length)
}

// Sampled boundary points for a shape, shared by every consumer (basin
// walls, deck cutout, floor, water surface, cover, and accessory
// placement) so they are all guaranteed to agree on exactly the same
// outline -- there is no way for the deck's cutout to end up a different
// size or curve than the basin it's supposed to sit flush against.
export function getOutlinePoints(shape: THREE.Shape, segments = 96): THREE.Vector2[] {
  return shape.getPoints(segments)
}

export function getOutlineBounds(points: THREE.Vector2[]): { width: number; length: number; centroid: THREE.Vector2 } {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  const centroid = new THREE.Vector2()
  for (const p of points) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
    centroid.add(p)
  }
  centroid.divideScalar(points.length)
  return { width: maxX - minX, length: maxY - minY, centroid }
}

// Overall footprint (pool + deck margin, or above-ground pool alone) used
// to size the deck plate and to auto-frame the camera consistently across
// wildly different real-world sizes (an 18ft round pool vs. a 40ft lap
// pool) -- every scene fills the frame by roughly the same proportion no
// matter which shape is showing.
export function getSceneFootprint(
  poolType: PoolType,
  shape: InGroundShapeId | AboveGroundShapeId,
  size: PoolSize = 'medium',
): { width: number; length: number } {
  if (poolType === 'above_ground') {
    const dims = getAboveGroundDimensions(shape as AboveGroundShapeId, size)
    const margin = getAboveGroundDeckMarginFt(shape as AboveGroundShapeId, size)
    return { width: dims.width + margin * 2, length: dims.length + margin * 2 }
  }
  const dims = getInGroundDimensions(shape as InGroundShapeId, size)
  const deckMargin = getInGroundDeckMarginFt(shape as InGroundShapeId, size)
  return { width: dims.width + deckMargin * 2, length: dims.length + deckMargin * 2 }
}

// Converts a local 2D outline point (as returned by getOutlinePoints) into
// a world-space (x, z) pair using the same convention every other piece of
// geometry in this module uses (see the comment inside buildWallStripGeometry).
// Anything that needs to position an object relative to the pool's actual
// outline -- accessory placement, camera framing -- should go through this
// rather than re-deriving the sign convention.
export function outlinePointToWorldXZ(p: THREE.Vector2): { x: number; z: number } {
  return { x: p.x, z: -p.y }
}

// Builds a flat quad "wall strip" connecting a closed loop of 2D points at
// one height to the same loop at another height -- used for the inground
// basin's interior walls and the above-ground pool's exterior wall. The
// material is always rendered double-sided (see materials.ts) specifically
// so this geometry's triangle winding direction never has to be gotten
// perfectly right -- it's visible from both the inside and the outside
// either way, which matters a lot given none of this can be visually
// tested before it reaches a real browser.
export function buildWallStripGeometry(points: THREE.Vector2[], topY: number, bottomY: number): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const n = points.length
  let perimeter = 0
  const cumulative: number[] = [0]
  for (let i = 0; i < n; i++) {
    const a = points[i]
    const b = points[(i + 1) % n]
    perimeter += a.distanceTo(b)
    cumulative.push(perimeter)
  }
  const height = Math.abs(topY - bottomY)

  // World Z is -localY here to match the flat pieces (floor/water/cover
  // via buildFlatOutlineGeometry, and the deck via buildDeckWithHoleGeometry)
  // which all get their local-XY shape reoriented with `rotateX(-Math.PI/2)`
  // -- that rotation maps local (x, y, 0) to world (x, 0, -y). This strip is
  // built directly in world space rather than rotated, so it has to apply
  // that same sign flip by hand or an asymmetric outline (kidney, freeform)
  // would come out mirrored between the walls and everything else.
  for (let i = 0; i < n; i++) {
    const a = points[i]
    const b = points[(i + 1) % n]
    const uA = perimeter > 0 ? cumulative[i] / perimeter : 0
    const uB = perimeter > 0 ? cumulative[i + 1] / perimeter : 0

    const aTop = [a.x, topY, -a.y]
    const bTop = [b.x, topY, -b.y]
    const aBot = [a.x, bottomY, -a.y]
    const bBot = [b.x, bottomY, -b.y]

    positions.push(...aTop, ...bTop, ...bBot, ...aTop, ...bBot, ...aBot)
    uvs.push(uA, 1, uB, 1, uB, 0, uA, 1, uB, 0, uA, 0)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.computeVertexNormals()
  void height
  return geometry
}

// A large ground/deck plate with a hole cut exactly matching `holePoints`,
// flat in the XZ plane at y=0 in local space (the caller positions it).
export function buildDeckWithHoleGeometry(
  outerWidth: number,
  outerLength: number,
  holePoints: THREE.Vector2[],
  cornerRadius = 2,
): THREE.ExtrudeGeometry {
  const outer = roundedRectShape(outerWidth, outerLength, cornerRadius)
  const hole = new THREE.Path(holePoints)
  outer.holes.push(hole)
  const geometry = new THREE.ExtrudeGeometry(outer, {
    depth: INGROUND_DECK_THICKNESS_FT,
    bevelEnabled: false,
    curveSegments: 24,
  })
  // ExtrudeGeometry extrudes the shape from local z=0 to z=depth along +Z,
  // with the up-facing (+Y-after-rotation) cap ending up at the z=depth
  // end. rotateX(-Math.PI/2) maps local (x, y, z) -> world (x, z, -y), so
  // that up-facing cap lands at world y=+depth, not 0 -- translate by
  // -depth (not +depth) to bring the walkable top surface to world y=0,
  // matching the basin's coping height, with the plate's thickness
  // hanging below it (down to y=-depth) rather than above.
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, -INGROUND_DECK_THICKNESS_FT, 0)
  return geometry
}

// A flat filled disc/shape used for the pool floor, the water surface, and
// the cover -- all three are literally the same outline at different
// heights and opacities, which is what makes a cover always fit the water
// exactly instead of needing a separately-drawn "cover shape."
export function buildFlatOutlineGeometry(points: THREE.Vector2[]): THREE.ShapeGeometry {
  const shape = new THREE.Shape(points)
  const geometry = new THREE.ShapeGeometry(shape, 1)
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

// A large circular "grass" plate for the ground around an inground pool,
// with a rectangular hole cut to match the deck's outer footprint exactly.
//
// This matters more than it sounds: the deck plate only covers its own
// footprint (and has its own hole cut for the pool). A naive full disc for
// the surrounding ground has to sit a little below the coping so it doesn't
// float above the deck -- but with no hole of its own, that disc is a solid
// surface positioned ABOVE the water/floor/walls in world Y (which live
// further below, down to -INGROUND_DEPTH_FT). Since the camera looks down
// at the scene, the ground plate is the first opaque surface any ray
// through the pool hole hits, completely hiding the basin -- the entire
// pool reads as a flat green disc instead of showing water, walls, or any
// depth at all, no matter what the camera or lighting is doing. Cutting a
// hole here removes the plate from underneath the deck+pool entirely, so
// there is nothing in the way of the actual pool geometry.
export function buildGroundWithHoleGeometry(outerRadius: number, holeWidth: number, holeLength: number, holeCornerRadius = 2): THREE.ShapeGeometry {
  const outer = new THREE.Shape()
  outer.absarc(0, 0, outerRadius, 0, Math.PI * 2, false)
  const holeShape = roundedRectShape(holeWidth, holeLength, holeCornerRadius)
  outer.holes.push(new THREE.Path(holeShape.getPoints(48)))
  const geometry = new THREE.ShapeGeometry(outer, 48)
  geometry.rotateX(-Math.PI / 2)
  return geometry
}
