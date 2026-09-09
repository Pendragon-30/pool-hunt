import * as THREE from 'three'
import {
  ABOVE_GROUND_WALL_THICKNESS_FT,
  INGROUND_DECK_MARGIN_FT,
  INGROUND_DEPTH_FT,
  buildDeckWithHoleGeometry,
  buildFlatOutlineGeometry,
  buildGroundWithHoleGeometry,
  buildWallStripGeometry,
  getAboveGroundDimensions,
  getAboveGroundOutlineShape,
  getInGroundOutlineShape,
  getOutlineBounds,
  getOutlinePoints,
  getSceneFootprint,
  outlinePointToWorldXZ,
  type AboveGroundShapeId,
  type ConstructionId,
  type InGroundShapeId,
  type PoolSize,
  type PoolType,
} from './poolGeometry'
import {
  getAboveGroundWallMaterial,
  getConstructionMaterial,
  getCoverMaterial,
  getDeckMaterial,
  getWaterMaterial,
} from './materials'
import { buildExtraGroup, buildLedLightingGlow, getSlotPlacement, type ExtraSlug } from './extras'

// The water sits a few inches below the coping -- completely normal for a
// real pool and NOT the same thing as the "curb/raised lip" problem the old
// photo-generation prompts fought so hard to avoid. That earlier problem
// was about the DECK meeting the pool at a different height than the
// coping (an uneven, mismatched seam); this is just the water level
// sitting slightly below an already-flush coping edge, which is how every
// real pool looks. Do not "fix" this back to 0 thinking it re-creates a curb.
const INGROUND_WATER_Y = -0.2
const ABOVE_GROUND_WATER_Y_MARGIN = 0.4

export type PoolSceneConfig = {
  poolType: PoolType
  shape: InGroundShapeId | AboveGroundShapeId
  construction: ConstructionId
  /** Scales the pool's real-world footprint -- see SIZE_MULTIPLIERS in poolGeometry.ts. */
  size: PoolSize
  /** 'none' or 'undecided' means no cover rendered. */
  cover: string
  extras: ExtraSlug[]
  ledLighting: boolean
}

export type BuiltScene = {
  group: THREE.Group
  /** Camera framing computed from this shape's real-world footprint. */
  cameraDistance: number
  cameraTarget: THREE.Vector3
  cameraElevation: number
  cameraAzimuth: number
  /** Half-width the shadow camera's frustum needs to cover this scene. */
  sceneRadius: number
}

// Even after fixing the ground-occlusion bug (which was hiding the whole
// basin) and lowering the angle from the original 38 degrees to 26, the
// scene still read as closer to a map than a photo: at 26 degrees you are
// looking almost straight down at a very thin (4.5ft-deep) basin, so the
// side walls that would actually signal "this has depth" project to only a
// few pixels tall on screen -- nearly all of what's visible is the flat
// water/deck/ground planes. Dropping to a genuinely low, near-horizon-ish
// angle is what actually exposes that vertical profile (the basin wall,
// the hot tub's height, the slide's rise) as visible height in the frame
// instead of being foreshortened away. Note this does NOT require also
// pulling the camera closer: the bounding-SPHERE framing formula below is
// rotation-invariant by construction -- a sphere subtends the same angular
// size from any direction at a fixed distance, so the whole footprint stays
// framed no matter how the elevation changes.
const FOV_DEGREES = 42
const CAMERA_ELEVATION_DEG = 15
const CAMERA_AZIMUTH_DEG = 35

function buildInGroundScene(
  shape: InGroundShapeId,
  construction: ConstructionId,
  size: PoolSize,
  cover: string,
  extras: ExtraSlug[],
  ledLighting: boolean,
): THREE.Group {
  const group = new THREE.Group()
  const outlineShape = getInGroundOutlineShape(shape, size)
  const localPoints = getOutlinePoints(outlineShape)
  const worldPoints = localPoints.map(outlinePointToWorldXZ)
  const bounds = getOutlineBounds(localPoints)

  const constructionMaterial = getConstructionMaterial(construction)

  // Basin walls: from coping (y=0) down to the floor.
  const wall = new THREE.Mesh(buildWallStripGeometry(localPoints, 0, -INGROUND_DEPTH_FT), constructionMaterial)
  wall.castShadow = true
  wall.receiveShadow = true
  group.add(wall)

  // Floor.
  const floorGeometry = buildFlatOutlineGeometry(localPoints)
  const floor = new THREE.Mesh(floorGeometry, constructionMaterial)
  floor.position.y = -INGROUND_DEPTH_FT
  floor.receiveShadow = true
  group.add(floor)

  // Water surface.
  const waterGeometry = buildFlatOutlineGeometry(localPoints)
  const water = new THREE.Mesh(waterGeometry, getWaterMaterial())
  water.position.y = INGROUND_WATER_Y
  group.add(water)

  // Deck: a large plate with a hole cut to this exact pool outline, so it
  // is flush against the basin walls by construction -- there is no way
  // for the deck and the pool edge to disagree about where the edge is.
  const deckOuterWidth = bounds.width + INGROUND_DECK_MARGIN_FT * 2
  const deckOuterLength = bounds.length + INGROUND_DECK_MARGIN_FT * 2
  const deckGeometry = buildDeckWithHoleGeometry(deckOuterWidth, deckOuterLength, localPoints, 2.5)
  const deck = new THREE.Mesh(deckGeometry, getDeckMaterial())
  deck.castShadow = true
  deck.receiveShadow = true
  group.add(deck)

  // Just enough grass to keep the deck from looking like it's floating
  // against bare sky at its corners -- NOT a full yard. Sized off the
  // deck's own half-diagonal (the distance from center to its farthest
  // corner) plus a couple of feet, rather than a flat fraction of its
  // longest side: the old 0.85x-of-longest-side formula produced a ground
  // radius well past what the camera actually frames (see boundingRadius
  // in buildPoolScene below), so a wide grass margin was visible on every
  // side no matter how tightly the camera was already zoomed on the pool
  // itself. Landscaping/yard context belongs in a separate "landscaping"
  // category if that's ever added -- this preview's job is "a full
  // picture of the pool," not a lawn with a pool in it. Cut with a hole
  // matching the deck's own outer footprint (see buildGroundWithHoleGeometry)
  // so this plate never sits in front of the basin itself -- a plain disc
  // here previously hid the entire pool interior behind flat green ground.
  const deckHalfDiagonal = Math.hypot(deckOuterWidth / 2, deckOuterLength / 2)
  const groundRadius = deckHalfDiagonal + 2
  const ground = new THREE.Mesh(
    buildGroundWithHoleGeometry(groundRadius, deckOuterWidth, deckOuterLength, 2.5),
    new THREE.MeshStandardMaterial({ color: '#7fac68', roughness: 1 }),
  )
  ground.position.y = -0.05
  ground.receiveShadow = true
  group.add(ground)

  const hasRealCover = Boolean(cover) && cover !== 'none' && cover !== 'undecided'
  if (hasRealCover) {
    const coverGeometry = buildFlatOutlineGeometry(localPoints)
    const coverMesh = new THREE.Mesh(coverGeometry, getCoverMaterial(cover))
    coverMesh.position.y = 0.02
    coverMesh.castShadow = true
    coverMesh.receiveShadow = true
    group.add(coverMesh)
  }

  // LED lighting can't show through an opaque cover.
  if (ledLighting && !hasRealCover) {
    group.add(buildLedLightingGlow(worldPoints, INGROUND_WATER_Y + 0.05))
  }

  const ringOffset = INGROUND_DECK_MARGIN_FT * 0.5
  for (const slug of extras) {
    const placement = getSlotPlacement(slug, bounds.width, bounds.length, ringOffset)
    const accessory = buildExtraGroup(slug)
    accessory.position.set(placement.x, 0, placement.z)
    accessory.rotation.y = placement.rotationY
    enableShadows(accessory)
    group.add(accessory)
  }

  return group
}

// Applied to every accessory group -- rather than setting castShadow /
// receiveShadow on each individual mesh inside every builder function in
// extras.ts, every accessory gets both flags set uniformly here in one
// place once it's built.
function enableShadows(object: THREE.Object3D): void {
  object.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true
      obj.receiveShadow = true
    }
  })
}

function buildAboveGroundScene(
  shape: AboveGroundShapeId,
  size: PoolSize,
  cover: string,
  extras: ExtraSlug[],
  ledLighting: boolean,
): THREE.Group {
  const group = new THREE.Group()
  const dims = getAboveGroundDimensions(shape, size)
  const outlineShape = getAboveGroundOutlineShape(shape, size)
  const localPoints = getOutlinePoints(outlineShape)
  const worldPoints = localPoints.map(outlinePointToWorldXZ)

  const wallMaterial = getAboveGroundWallMaterial()
  // Exterior wall, raised from ground level up to the rim.
  const wall = new THREE.Mesh(buildWallStripGeometry(localPoints, dims.wallHeight, 0), wallMaterial)
  wall.castShadow = true
  wall.receiveShadow = true
  group.add(wall)

  // A thin cap ring at the rim, and a liner-colored basin visible from
  // above through the open top.
  const linerMaterial = getConstructionMaterial('vinyl_liner')
  const floorGeometry = buildFlatOutlineGeometry(localPoints)
  const floor = new THREE.Mesh(floorGeometry, linerMaterial)
  floor.position.y = ABOVE_GROUND_WALL_THICKNESS_FT
  floor.receiveShadow = true
  group.add(floor)

  const waterGeometry = buildFlatOutlineGeometry(localPoints)
  const water = new THREE.Mesh(waterGeometry, getWaterMaterial())
  water.position.y = dims.wallHeight - ABOVE_GROUND_WATER_Y_MARGIN
  group.add(water)

  // Same tight-border approach as the inground scene above -- a small
  // fixed margin past the pool wall's own half-diagonal, not a big
  // fraction of its longest side.
  const groundHalfDiagonal = Math.hypot(dims.width / 2, dims.length / 2)
  const groundRadius = groundHalfDiagonal + 2
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(groundRadius, 48),
    new THREE.MeshStandardMaterial({ color: '#7fac68', roughness: 1 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.02
  ground.receiveShadow = true
  group.add(ground)

  const hasRealCover = Boolean(cover) && cover !== 'none' && cover !== 'undecided'
  if (hasRealCover) {
    const coverGeometry = buildFlatOutlineGeometry(localPoints)
    const coverMesh = new THREE.Mesh(coverGeometry, getCoverMaterial(cover))
    coverMesh.position.y = dims.wallHeight + 0.03
    coverMesh.castShadow = true
    coverMesh.receiveShadow = true
    group.add(coverMesh)
  }

  if (ledLighting && !hasRealCover) {
    group.add(buildLedLightingGlow(worldPoints, dims.wallHeight - ABOVE_GROUND_WATER_Y_MARGIN + 0.05))
  }

  const ringOffset = 3
  for (const slug of extras) {
    const placement = getSlotPlacement(slug, dims.width, dims.length, ringOffset)
    const accessory = buildExtraGroup(slug)
    accessory.position.set(placement.x, 0, placement.z)
    accessory.rotation.y = placement.rotationY
    enableShadows(accessory)
    group.add(accessory)
  }

  return group
}

export function buildPoolScene(config: PoolSceneConfig): BuiltScene {
  const group =
    config.poolType === 'above_ground'
      ? buildAboveGroundScene(config.shape as AboveGroundShapeId, config.size, config.cover, config.extras, config.ledLighting)
      : buildInGroundScene(
          config.shape as InGroundShapeId,
          config.construction,
          config.size,
          config.cover,
          config.extras,
          config.ledLighting,
        )

  const footprint = getSceneFootprint(config.poolType, config.shape, config.size)
  // Extras extend a few feet beyond the pool+deck footprint, so pad the
  // framing radius a bit further out than the bare footprint would need,
  // keeping every combination comfortably inside the frame -- but only
  // just enough, since every extra foot of padding here is an extra foot
  // of "zoomed out," which is exactly what was making everything look
  // small and flat.
  const boundingRadius = Math.hypot(footprint.width / 2, footprint.length / 2) * 1.05 + (config.extras.length > 0 ? 1.5 : 0)
  const fovRad = THREE.MathUtils.degToRad(FOV_DEGREES)
  const cameraDistance = boundingRadius / Math.sin(fovRad / 2)

  return {
    group,
    cameraDistance,
    cameraTarget: new THREE.Vector3(
      0,
      config.poolType === 'above_ground'
        ? getAboveGroundDimensions(config.shape as AboveGroundShapeId, config.size).wallHeight / 2
        : -0.6,
      0,
    ),
    cameraElevation: THREE.MathUtils.degToRad(CAMERA_ELEVATION_DEG),
    cameraAzimuth: THREE.MathUtils.degToRad(CAMERA_AZIMUTH_DEG),
    sceneRadius: boundingRadius,
  }
}

export { FOV_DEGREES }
