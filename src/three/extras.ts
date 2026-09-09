import * as THREE from 'three'
import { getWaterMaterial } from './materials'

// Every accessory below is a small assembly of plain THREE.js primitives
// (boxes, cylinders, cones, an icosahedron or two for "rock" clusters),
// built imperatively and returned as a THREE.Group rather than JSX -- that
// sidesteps any question of whether react-three-fiber's JSX intrinsics are
// wired up correctly in this particular file, which matters a lot given
// none of this can be compiled or rendered before it reaches the user's
// own machine. PoolScene.tsx mounts each group with a plain <primitive object={...} />.
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

// Evenly-spaced slots on an ellipse matching the scene's actual footprint
// aspect ratio (so a long, narrow lap pool gets slots spread along its
// actual deck band instead of clustered off one end), offset outward from
// the pool's bounding box by `ringOffset` feet. `rotationY` makes the
// accessory's local -Z axis point back toward the origin (the pool center).
export function getSlotPlacement(index: number, footprintWidth: number, footprintLength: number, ringOffset: number): SlotPlacement {
  const angle = (index / EXTRA_SLOT_ORDER.length) * Math.PI * 2
  const rx = footprintWidth / 2 + ringOffset
  const rz = footprintLength / 2 + ringOffset
  const x = Math.cos(angle) * rx
  const z = Math.sin(angle) * rz
  const rotationY = Math.atan2(-x, z)
  return { x, z, rotationY }
}

function rockCluster(count: number, baseRadius: number, color: string): THREE.Group {
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 })
  for (let i = 0; i < count; i++) {
    const radius = baseRadius * (0.6 + 0.4 * ((i * 37) % 7) / 6)
    const geometry = new THREE.IcosahedronGeometry(radius, 0)
    const mesh = new THREE.Mesh(geometry, material)
    const angle = (i / count) * Math.PI * 2
    mesh.position.set(Math.cos(angle) * baseRadius * 0.5, radius * 0.55, Math.sin(angle) * baseRadius * 0.5)
    mesh.rotation.set(i * 0.7, i * 1.3, i * 0.4)
    group.add(mesh)
  }
  return group
}

function ladderRails(height: number): THREE.Group {
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ color: '#e5e9ec', roughness: 0.4, metalness: 0.6 })
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, height, 8), material)
    rail.position.set(side * 0.7, height / 2, 0)
    group.add(rail)
  }
  for (let i = 1; i < Math.floor(height); i++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), material)
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
  const geometry = new THREE.TubeGeometry(curve, 32, 0.55, 10, false)
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.05, side: THREE.DoubleSide })
  return new THREE.Mesh(geometry, material)
}

export function buildSlideGroup(): THREE.Group {
  const group = new THREE.Group()
  group.add(ladderRails(4.6))
  group.add(slideChute('#3aa0d1'))
  return group
}

export function buildNaturalSlideGroup(): THREE.Group {
  const group = new THREE.Group()
  group.add(slideChute('#8a7a63'))
  const rocks = rockCluster(6, 1.3, '#7d7466')
  rocks.position.set(0, 0, -1.5)
  group.add(rocks)
  // A few small "foliage" accents along the rock face.
  const leafMaterial = new THREE.MeshStandardMaterial({ color: '#4c7a3f', roughness: 0.9 })
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 6), leafMaterial)
    leaf.position.set(0.8 - i * 0.5, 0.45, -0.5 - i * 0.6)
    group.add(leaf)
  }
  return group
}

export function buildWaterFeatureGroup(): THREE.Group {
  const group = new THREE.Group()
  const rocks = rockCluster(5, 1.1, '#7d7466')
  group.add(rocks)
  const jetMaterial = new THREE.MeshPhysicalMaterial({
    color: '#8fdcf5',
    transparent: true,
    opacity: 0.7,
    roughness: 0.1,
    transmission: 0.4,
  })
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 2.2, 8), jetMaterial)
  jet.position.set(0, 1.9, 0)
  group.add(jet)
  return group
}

export function buildSwimUpBarGroup(): THREE.Group {
  const group = new THREE.Group()
  const counterMaterial = new THREE.MeshStandardMaterial({ color: '#b98a52', roughness: 0.6 })
  const counter = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.25, 16, 1, false, 0, Math.PI), counterMaterial)
  counter.position.set(0, 3.1, 0)
  group.add(counter)
  for (const side of [-1.6, 0, 1.6]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.1, 8), counterMaterial)
    post.position.set(side, 1.55, 1.5)
    group.add(post)
  }
  const stoolMaterial = new THREE.MeshStandardMaterial({ color: '#d8d3c8', roughness: 0.7 })
  for (const side of [-1.4, 0, 1.4]) {
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 12), stoolMaterial)
    seat.position.set(side, 2.2, 2.4)
    group.add(seat)
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), stoolMaterial)
    leg.position.set(side, 1.1, 2.4)
    group.add(leg)
  }
  return group
}

export function buildTanningLedgeGroup(): THREE.Group {
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ color: '#bfe0ea', roughness: 0.3 })
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(7, 0.35, 4.5), material)
  ledge.position.set(0, 0.17, -0.5)
  group.add(ledge)
  const shallowWater = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.06, 4.1), getWaterMaterial())
  shallowWater.position.set(0, 0.38, -0.5)
  group.add(shallowWater)
  return group
}

export function buildDivingBoardGroup(): THREE.Group {
  const group = new THREE.Group()
  const postMaterial = new THREE.MeshStandardMaterial({ color: '#d9dde0', roughness: 0.4, metalness: 0.4 })
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3, 10), postMaterial)
  post.position.set(0, 1.5, 0.8)
  group.add(post)
  const boardMaterial = new THREE.MeshStandardMaterial({ color: '#3f9bd6', roughness: 0.35 })
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 8), boardMaterial)
  board.position.set(0, 3, -2.2)
  group.add(board)
  return group
}

export function buildHotTubSpaComboGroup(): THREE.Group {
  const group = new THREE.Group()
  const shellMaterial = new THREE.MeshStandardMaterial({ color: '#5b4a3a', roughness: 0.6 })
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 2.3, 8), shellMaterial)
  shell.position.set(0, 1.15, 0)
  group.add(shell)
  const waterCap = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.1, 8), getWaterMaterial())
  waterCap.position.set(0, 2.32, 0)
  group.add(waterCap)
  return group
}

export function buildWaterfallGroup(): THREE.Group {
  const group = new THREE.Group()
  const rocks = rockCluster(7, 1.8, '#71685b')
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
  const geometry = new THREE.TubeGeometry(curve, Math.max(worldOutline.length, 48), 0.08, 6, true)
  const material = new THREE.MeshStandardMaterial({
    color: '#7dd3fc',
    emissive: '#38bdf8',
    emissiveIntensity: 1.6,
    roughness: 0.4,
  })
  return new THREE.Mesh(geometry, material)
}
