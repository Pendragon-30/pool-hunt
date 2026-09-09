import * as THREE from 'three'
import { getWaterMaterial } from './materials'

// Every accessory below is a small assembly of plain THREE.js primitives
// (boxes, cylinders, cones, torii, and perturbed icosahedra for "rock"
// clusters), built imperatively and returned as a THREE.Group rather than
// JSX -- that sidesteps any question of whether react-three-fiber's JSX
// intrinsics are wired up correctly in this particular file, which matters
// a lot given none of this can be compiled or rendered before it reaches
// the user's own machine. PoolScene.tsx mounts each group with a plain
// <primitive object={...} />.
//
// This file went through a second pass focused specifically on realism:
// the first version used very low segment counts (6-10) on every rounded
// shape, which reads as faceted/geometric rather than smooth, and left
// accessories as bare primitives with no distinguishing texture or
// supporting detail (a plain cylinder for a hot tub, a bare curved slab for
// a swim-up bar). This pass raises segment counts across the board, adds
// small canvas-texture materials (wood grain, thatch) so surfaces aren't
// flat single colors, and adds the small structural/contextual details
// (a hot tub rim + control panel, a bar's canopy roof, loungers on the
// tanning ledge, support posts under the slide) that make an accessory
// legible as the real object instead of an abstract shape standing in
// for it.
//
// Each group is built in its own local space with the convention "local
// -Z points toward the pool" (e.g. a slide's chute descends toward -Z, a
// diving board's plank overhangs toward -Z) -- the caller positions and
// rotates the whole group so that -Z actually faces the pool's center.
// This is what replaces the old fixed pixel-anchor sticker system: instead
// of guessing where an icon should sit on a generic photo, every accessory
// is placed by real math against the pool's actual outline, so it can
// never end up the wrong size or overlapping another selected accessory.

export type ExtraSlug =
  | 'slide'
  | 'natural_slide'
  | 'water_feature'
  | 'swim_up_bar'
  | 'tanning_ledge'
  | 'diving_board'
  | 'hot_tub_spa_combo'
  | 'waterfall'

// Fixed slot order -- every extra always lands in the same relative slot
// around the deck regardless of which others are selected, so two
// simultaneous extras can never land in the same spot and a given extra's
// position never shifts just because a different one was added or removed.
export const EXTRA_SLOT_ORDER: ExtraSlug[] = [
  'slide',
  'natural_slide',
  'water_feature',
  'swim_up_bar',
  'tanning_ledge',
  'diving_board',
  'hot_tub_spa_combo',
  'waterfall',
]

export type SlotPlacement = { x: number; z: number; rotationY: number }

// Each extra gets a fixed compass-style zone around the pool that reflects
// how it's actually sited in a real backyard, rather than an arbitrary
// slot chosen by array index (the previous version's whole "positioning"
// was just EXTRA_SLOT_ORDER.indexOf(slug) -- a diving board could land in
// a corner, a side, anywhere, purely by chance). Diving boards and tanning
// ledges need the pool's full length, so they anchor the two ends (90 /
// 270 degrees). A swim-up bar and a water feature run along the two long
// sides (0 / 180). The remaining pieces are freestanding structures rather
// than pool-edge fixtures, so they take the four corners. Every entry is a
// distinct angle so multiple selected extras still can never collide, the
// same guarantee the old evenly-spaced ring gave -- but now the angle a
// given extra gets is chosen on purpose instead of by list position.
const EXTRA_ZONE_DEGREES: Record<ExtraSlug, number> = {
  diving_board: 90,
  tanning_ledge: 270,
  swim_up_bar: 0,
  water_feature: 180,
  slide: 45,
  hot_tub_spa_combo: 135,
  waterfall: 225,
  natural_slide: 315,
}

// A swim-up bar's counter and a tanning ledge's shelf are meant to sit
// right at the pool's edge (people swim up to one, the other is really a
// shallow shelf at the waterline) -- pull those in much closer than the
// freestanding structures like a slide, diving board, waterfall, or
// natural slide, which belong out on the open deck instead of crowding the
// coping. "Hot tub / spa combo" belongs in this close-in group too, NOT
// with the freestanding structures: a "hot tub / spa combo" is meant to
// read as a raised spa built directly into the pool structure -- sharing a
// wall with the pool, water spilling over from the spa into the main
// pool -- not a separate portable hot tub someone dropped nearby. Pulling
// it in almost to the coping (rather than out on the open deck like a
// slide or diving board needs to be) is what makes that connected, built-in
// reading possible in both the 3D guide and the photoreal repaint.
const EXTRA_RING_OFFSET_SCALE: Partial<Record<ExtraSlug, number>> = {
  swim_up_bar: 0.15,
  tanning_ledge: 0.2,
  hot_tub_spa_combo: 0.08,
}

// `ringOffset` (feet) is the base distance outward from the pool's
// bounding box; the scale table above pulls specific extras in closer.
// `rotationY` makes the accessory's local -Z axis point back toward the
// origin (the pool center).
export function getSlotPlacement(slug: ExtraSlug, footprintWidth: number, footprintLength: number, ringOffset: number): SlotPlacement {
  const angle = THREE.MathUtils.degToRad(EXTRA_ZONE_DEGREES[slug])
  const scale = EXTRA_RING_OFFSET_SCALE[slug] ?? 1
  const rx = footprintWidth / 2 + ringOffset * scale
  const rz = footprintLength / 2 + ringOffset * scale
  const x = Math.cos(angle) * rx
  const z = Math.sin(angle) * rz
  const rotationY = Math.atan2(-x, z)
  return { x, z, rotationY }
}

// --- shared small helpers -------------------------------------------------

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function createCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')
  return { canvas, ctx }
}

// A loose, slightly wavy wood-plank texture -- used for the hot tub shell
// and the swim-up bar's counter/posts. Not a photographic wood texture (no
// image assets are loaded from anywhere), but the wavy grain lines and
// plank-width color banding are what separate "wood" from "flat brown
// plastic" at a glance.
function createWoodTexture(baseColor: string, grainColor: string, seed: number): THREE.CanvasTexture {
  const size = 256
  const { canvas, ctx } = createCanvas(size)
  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, size, size)
  const rand = seededRandom(seed)
  ctx.strokeStyle = grainColor
  for (let i = 0; i < 20; i++) {
    const y = rand() * size
    ctx.globalAlpha = 0.12 + rand() * 0.28
    ctx.lineWidth = 1 + rand() * 2
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= size; x += 16) {
      ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 3 + (rand() - 0.5) * 4)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

let cachedHotTubWoodTexture: THREE.CanvasTexture | null = null
function getHotTubWoodTexture(): THREE.CanvasTexture {
  if (!cachedHotTubWoodTexture) {
    cachedHotTubWoodTexture = createWoodTexture('#6b4c33', '#4a3322', 11)
    cachedHotTubWoodTexture.repeat.set(6, 1)
  }
  return cachedHotTubWoodTexture
}

let cachedBarWoodTexture: THREE.CanvasTexture | null = null
function getBarWoodTexture(): THREE.CanvasTexture {
  if (!cachedBarWoodTexture) {
    cachedBarWoodTexture = createWoodTexture('#c9a06b', '#8a6a3f', 23)
    cachedBarWoodTexture.repeat.set(3, 1)
  }
  return cachedBarWoodTexture
}

let cachedThatchTexture: THREE.CanvasTexture | null = null
function getThatchTexture(): THREE.CanvasTexture {
  if (!cachedThatchTexture) {
    const size = 256
    const { canvas, ctx } = createCanvas(size)
    ctx.fillStyle = '#c4a355'
    ctx.fillRect(0, 0, size, size)
    const rand = seededRandom(31)
    ctx.strokeStyle = '#a8853c'
    for (let i = 0; i < 70; i++) {
      const x = rand() * size
      ctx.globalAlpha = 0.15 + rand() * 0.3
      ctx.lineWidth = 1 + rand()
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x + (rand() - 0.5) * 10, size)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    cachedThatchTexture = new THREE.CanvasTexture(canvas)
    cachedThatchTexture.wrapS = THREE.RepeatWrapping
    cachedThatchTexture.wrapT = THREE.RepeatWrapping
    cachedThatchTexture.repeat.set(6, 3)
    cachedThatchTexture.colorSpace = THREE.SRGBColorSpace
  }
  return cachedThatchTexture
}

// Displaces every vertex of a subdivided icosahedron outward or inward by a
// small deterministic random amount along its own normal. A bare
// IcosahedronGeometry(radius, 0) is a perfectly regular 20-sided gem --
// recognizably "low-poly toy," not "rock." Jittering the vertices (seeded,
// so a given rock's shape never changes between renders) turns the same
// primitive into something with the irregular, lumpy silhouette that
// actually reads as stone.
function perturbedRockGeometry(radius: number, seed: number, roughnessAmount = 0.4): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(radius, 1)
  const rand = seededRandom(seed)
  const position = geometry.attributes.position
  const vertex = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i)
    const offset = 1 + (rand() - 0.5) * roughnessAmount
    vertex.multiplyScalar(offset)
    position.setXYZ(i, vertex.x, vertex.y, vertex.z)
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

// A loose cluster of perturbed "rocks" with per-rock size, color, rotation,
// and placement jitter (all seeded, so it's deterministic) -- used for the
// natural slide's rock face, the water feature, and the waterfall.
function rockCluster(count: number, baseRadius: number, color: string, seedBase: number): THREE.Group {
  const group = new THREE.Group()
  const rand = seededRandom(seedBase * 97 + 13)
  const baseColor = new THREE.Color(color)
  for (let i = 0; i < count; i++) {
    const radius = baseRadius * (0.55 + rand() * 0.55)
    const geometry = perturbedRockGeometry(radius, seedBase * 131 + i * 17 + 1)
    const tint = 0.82 + rand() * 0.36
    const material = new THREE.MeshStandardMaterial({
      color: baseColor.clone().multiplyScalar(tint),
      roughness: 0.9 + rand() * 0.08,
      metalness: 0,
    })
    const mesh = new THREE.Mesh(geometry, material)
    const angle = (i / count) * Math.PI * 2 + rand() * 0.6
    const dist = baseRadius * (0.3 + rand() * 0.4)
    mesh.position.set(Math.cos(angle) * dist, radius * (0.4 + rand() * 0.25), Math.sin(angle) * dist)
    mesh.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
    group.add(mesh)
  }
  return group
}

function ladderRails(height: number): THREE.Group {
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ color: '#e5e9ec', roughness: 0.4, metalness: 0.6 })
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, height, 12), material)
    rail.position.set(side * 0.7, height / 2, 0)
    group.add(rail)
  }
  for (let i = 1; i < Math.floor(height); i++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 10), material)
    rung.rotation.z = Math.PI / 2
    rung.position.set(0, i, 0)
    group.add(rung)
  }
  return group
}

// A smooth chute descending through a single 90-degree turn -- straight up
// from the deck, then curving down toward the pool. Built directly from a
// handful of monotonically-descending control points, so there is no
// ambiguity for a model to get wrong: it is a 90-degree turn because it
// was drawn as one.
function slideChute(color: string): THREE.Mesh {
  const points = [
    new THREE.Vector3(0, 4.6, 0.3),
    new THREE.Vector3(0, 4.6, -0.6),
    new THREE.Vector3(0, 4.2, -1.6),
    new THREE.Vector3(0, 3.2, -2.6),
    new THREE.Vector3(0, 1.9, -3.4),
    new THREE.Vector3(0, 0.8, -3.9),
    new THREE.Vector3(0, 0.2, -4.1),
  ]
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
  const geometry = new THREE.TubeGeometry(curve, 40, 0.55, 16, false)
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.05, side: THREE.DoubleSide })
  return new THREE.Mesh(geometry, material)
}

// A pair of diagonal support posts under the elevated middle section of the
// slide -- without them the raised run of tube reads as floating in
// mid-air, which is one of the fastest ways an otherwise-decent model reads
// as "not real."
function slideSupportPosts(): THREE.Group {
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ color: '#c7ccd1', roughness: 0.5, metalness: 0.3 })
  const posts: [number, number, number][] = [
    [0.5, 1.7, -1.3],
    [-0.5, 1.7, -1.3],
    [0.45, 1.0, -2.7],
    [-0.45, 1.0, -2.7],
  ]
  for (const [x, h, z] of posts) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, h, 10), material)
    post.position.set(x, h / 2, z)
    group.add(post)
  }
  return group
}

export function buildSlideGroup(): THREE.Group {
  const group = new THREE.Group()
  group.add(ladderRails(4.6))
  group.add(slideChute('#3aa0d1'))
  group.add(slideSupportPosts())
  return group
}

export function buildNaturalSlideGroup(): THREE.Group {
  const group = new THREE.Group()
  group.add(slideChute('#8a7a63'))
  const rocks = rockCluster(7, 1.3, '#7d7466', 3)
  rocks.position.set(0, 0, -1.5)
  group.add(rocks)
  // A few small "foliage" accents along the rock face.
  const leafMaterial = new THREE.MeshStandardMaterial({ color: '#4c7a3f', roughness: 0.9 })
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 10), leafMaterial)
    leaf.position.set(0.8 - i * 0.5, 0.45, -0.5 - i * 0.6)
    group.add(leaf)
  }
  return group
}

export function buildWaterFeatureGroup(): THREE.Group {
  const group = new THREE.Group()
  const rocks = rockCluster(6, 1.1, '#7d7466', 5)
  group.add(rocks)
  const jetMaterial = new THREE.MeshPhysicalMaterial({
    color: '#8fdcf5',
    transparent: true,
    opacity: 0.7,
    roughness: 0.1,
    transmission: 0.4,
  })
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 2.2, 12), jetMaterial)
  jet.position.set(0, 1.9, 0)
  group.add(jet)
  return group
}

export function buildSwimUpBarGroup(): THREE.Group {
  const group = new THREE.Group()
  const counterMaterial = new THREE.MeshStandardMaterial({ map: getBarWoodTexture(), roughness: 0.55, metalness: 0 })
  const counter = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.25, 32, 1, false, 0, Math.PI), counterMaterial)
  counter.position.set(0, 3.1, 0)
  group.add(counter)
  // A thin darker edge band so the counter reads as having real thickness
  // rather than a paper-flat disc.
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: '#5c4227', roughness: 0.6 })
  const edge = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.06, 8, 32, Math.PI), edgeMaterial)
  edge.rotation.x = Math.PI / 2
  edge.position.set(0, 2.97, 0)
  group.add(edge)

  const postMaterial = new THREE.MeshStandardMaterial({ color: '#c9a06b', roughness: 0.6 })
  for (const side of [-1.6, 0, 1.6]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.1, 12), postMaterial)
    post.position.set(side, 1.55, 1.5)
    group.add(post)
  }

  // A simple thatch-style canopy roof -- the single strongest visual cue
  // that reads as "swim-up bar" rather than an ambiguous curved counter.
  const roofMaterial = new THREE.MeshStandardMaterial({ map: getThatchTexture(), roughness: 0.95 })
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.6, 12), roofMaterial)
  roof.position.set(0, 4.4, 0.6)
  group.add(roof)

  const stoolMaterial = new THREE.MeshStandardMaterial({ color: '#d8d3c8', roughness: 0.7 })
  for (const side of [-1.4, 0, 1.4]) {
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 16), stoolMaterial)
    seat.position.set(side, 2.2, 2.4)
    group.add(seat)
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 10), stoolMaterial)
    leg.position.set(side, 1.1, 2.4)
    group.add(leg)
  }
  return group
}

// A single pool lounger -- reused twice on the tanning ledge. Gives the
// flat platform an obvious purpose and a familiar, recognizable silhouette
// at a glance instead of reading as an unexplained pale slab.
function loungerGroup(): THREE.Group {
  const group = new THREE.Group()
  const strapMaterial = new THREE.MeshStandardMaterial({ color: '#4a90a4', roughness: 0.6 })
  const frameMaterial = new THREE.MeshStandardMaterial({ color: '#e8e4d8', roughness: 0.5 })
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 1.6), strapMaterial)
  seat.position.set(0, 0.42, 0.2)
  group.add(seat)
  const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.9), strapMaterial)
  backrest.position.set(0, 0.6, -0.75)
  backrest.rotation.x = -0.55
  group.add(backrest)
  for (const lx of [-0.4, 0.4]) {
    for (const lz of [-0.5, 0.7]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), frameMaterial)
      leg.position.set(lx, 0.2, lz)
      group.add(leg)
    }
  }
  return group
}

export function buildTanningLedgeGroup(): THREE.Group {
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ color: '#cfe6ee', roughness: 0.35 })
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(7, 0.35, 4.5), material)
  ledge.position.set(0, 0.17, -0.5)
  group.add(ledge)
  const shallowWater = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.06, 4.1), getWaterMaterial())
  shallowWater.position.set(0, 0.38, -0.5)
  group.add(shallowWater)

  const loungerA = loungerGroup()
  loungerA.position.set(-2, 0.38, -0.5)
  loungerA.rotation.y = Math.PI / 2
  group.add(loungerA)
  const loungerB = loungerGroup()
  loungerB.position.set(1.6, 0.38, -0.5)
  loungerB.rotation.y = Math.PI / 2
  group.add(loungerB)

  return group
}

export function buildDivingBoardGroup(): THREE.Group {
  const group = new THREE.Group()
  const baseMaterial = new THREE.MeshStandardMaterial({ color: '#c7ccd1', roughness: 0.5, metalness: 0.3 })
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 1.6), baseMaterial)
  base.position.set(0, 0.2, 0.8)
  group.add(base)

  const postMaterial = new THREE.MeshStandardMaterial({ color: '#d9dde0', roughness: 0.4, metalness: 0.4 })
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3, 16), postMaterial)
  post.position.set(0, 1.9, 0.8)
  group.add(post)

  const boardMaterial = new THREE.MeshStandardMaterial({ color: '#3f9bd6', roughness: 0.4 })
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 8), boardMaterial)
  board.position.set(0, 3.4, -2.2)
  group.add(board)

  // A thin non-slip grip strip down the board's top face.
  const gripMaterial = new THREE.MeshStandardMaterial({ color: '#2c6f97', roughness: 0.9 })
  const grip = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 7.4), gripMaterial)
  grip.position.set(0, 3.47, -2.2)
  group.add(grip)

  return group
}

// A raised, ATTACHED spa -- not a portable freestanding hot tub. Two things
// make that reading possible: getSlotPlacement above pulls this group in
// almost to the pool's own coping (EXTRA_RING_OFFSET_SCALE.hot_tub_spa_combo
// = 0.08, in the same close-in group as the swim-up bar and tanning ledge),
// so in the 3D guide the shell visibly overlaps/touches the pool's edge
// instead of sitting out in the middle of the open deck; and the spillway
// plane below gives it a literal, visible physical connection -- water
// flowing from the spa down into the main pool -- which is the single
// strongest "these are one connected structure" cue a repaint can pick up
// on. Sized a bit smaller than the original standalone-tub version (2.6ft
// radius instead of 3.2ft) since a built-in spa bump-out reads as an
// extension of the pool, not a second pool-sized vessel next to it.
export function buildHotTubSpaComboGroup(): THREE.Group {
  const group = new THREE.Group()
  const segments = 24
  const radius = 2.6
  const shellMaterial = new THREE.MeshStandardMaterial({ map: getHotTubWoodTexture(), roughness: 0.65, metalness: 0 })
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 2.1, segments), shellMaterial)
  shell.position.set(0, 1.05, 0)
  group.add(shell)

  // A raised rim gives the top edge real thickness instead of a knife-edge
  // cylinder cap -- one of the biggest cues that separates "actual object"
  // from "flat cutout."
  const rimMaterial = new THREE.MeshStandardMaterial({ color: '#3c3630', roughness: 0.5 })
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.18, 12, segments), rimMaterial)
  rim.rotation.x = Math.PI / 2
  rim.position.set(0, 2.12, 0)
  group.add(rim)

  const waterCap = new THREE.Mesh(new THREE.CylinderGeometry(radius - 0.35, radius - 0.35, 0.1, segments), getWaterMaterial())
  waterCap.position.set(0, 2.05, 0)
  group.add(waterCap)

  // The spillway: a short sheet of water running down the spa's -Z face
  // (this file's convention for "toward the pool," see the header comment)
  // from the rim down to deck level, right where the shell already
  // overlaps the pool's own edge. This is what turns "a hot tub that
  // happens to be nearby" into "a spa built into the pool with water
  // spilling from one into the other."
  const spillway = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.3), getWaterMaterial())
  spillway.position.set(0, 0.95, -radius + 0.05)
  spillway.rotation.x = -0.12
  group.add(spillway)

  // A small control panel on the side -- one of the most recognizable
  // hot-tub details at a glance.
  const panelMaterial = new THREE.MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.3, metalness: 0.3 })
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.7), panelMaterial)
  panel.position.set(radius + 0.08, 1.5, 0)
  group.add(panel)

  return group
}

export function buildWaterfallGroup(): THREE.Group {
  const group = new THREE.Group()
  const rocks = rockCluster(8, 1.8, '#71685b', 7)
  rocks.position.set(0, 0.6, 0)
  group.add(rocks)
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.2), getWaterMaterial())
  sheet.position.set(0, 1.8, -0.9)
  sheet.rotation.x = -0.15
  group.add(sheet)
  return group
}

export function buildExtraGroup(slug: ExtraSlug): THREE.Group {
  switch (slug) {
    case 'slide':
      return buildSlideGroup()
    case 'natural_slide':
      return buildNaturalSlideGroup()
    case 'water_feature':
      return buildWaterFeatureGroup()
    case 'swim_up_bar':
      return buildSwimUpBarGroup()
    case 'tanning_ledge':
      return buildTanningLedgeGroup()
    case 'diving_board':
      return buildDivingBoardGroup()
    case 'hot_tub_spa_combo':
      return buildHotTubSpaComboGroup()
    case 'waterfall':
      return buildWaterfallGroup()
  }
}

// A thin emissive strip following the pool's exact outline at the
// waterline -- the 3D equivalent of the old code-rendered "glow" for LED
// Lighting, now literally traced along the real pool edge instead of a
// generic gradient rectangle. Takes WORLD (x, z) pairs (see
// outlinePointToWorldXZ in poolGeometry.ts) -- deliberately {x, z} rather
// than a THREE.Vector2, so it can't get silently confused with the
// module's other functions that take LOCAL (x, y) shape-space points.
export function buildLedLightingGlow(worldOutline: { x: number; z: number }[], waterY: number): THREE.Mesh {
  const points = worldOutline.map((p) => new THREE.Vector3(p.x, waterY, p.z))
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal')
  const geometry = new THREE.TubeGeometry(curve, Math.max(worldOutline.length, 48), 0.08, 8, true)
  const material = new THREE.MeshStandardMaterial({
    color: '#7dd3fc',
    emissive: '#38bdf8',
    emissiveIntensity: 1.6,
    roughness: 0.4,
  })
  return new THREE.Mesh(geometry, material)
}
