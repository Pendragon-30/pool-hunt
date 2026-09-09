import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { FOV_DEGREES, buildPoolScene, type PoolSceneConfig } from './buildScene'

// A minimal stand-in "room" to bake into an environment map (see
// buildStudioEnvironmentScene below) -- built from only core three.js
// exports (BoxGeometry + MeshBasicMaterial), deliberately avoiding any
// deep import from three's examples/addons tree. Those addon paths are
// usually fine, but whether a given one resolves depends on exactly how
// the installed three version's package.json exports map is written, and
// that's not something worth risking sight-unseen when six colored,
// unlit box faces do the job just as well for this.
function buildStudioEnvironmentScene(): THREE.Scene {
  const scene = new THREE.Scene()
  const faceColors = ['#e4ecf0', '#e4ecf0', '#ffffff', '#c9d4da', '#eef3f6', '#eef3f6']
  const materials = faceColors.map((color) => new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }))
  const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials)
  box.scale.set(24, 24, 24)
  scene.add(box)
  return scene
}

// The actual <Canvas> wrapper. Deliberately thin: everything that decides
// WHAT the pool looks like lives in buildScene.ts/poolGeometry.ts/extras.ts
// as plain THREE.js code, mounted here with a single <primitive object=... />
// so there's very little react-three-fiber-specific surface area to get
// wrong in a file that can't be compiled or rendered before it reaches the
// user's own machine.

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

export type PoolSceneProps = PoolSceneConfig & {
  // Optional escape hatch for capturing this scene's rendered pixels (used
  // by the admin photoreal-preview tool to grab a guide image to hand to
  // the AI repaint step -- see src/admin/PhotorealPreviewDashboard.tsx).
  // Fires once, from inside onCreated, with the actual <canvas> element
  // react-three-fiber is drawing into. Ordinary site usage (PoolVisual.tsx)
  // never passes this.
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
  // WebGL clears its drawing buffer right after compositing a frame to the
  // screen unless told to keep it around -- so canvas.toDataURL() can
  // silently return a blank image depending on exactly when it's called,
  // unless this is on. It costs a little performance, which is why it's
  // opt-in rather than always-on for every visitor: only the admin capture
  // tool needs to actually read pixels back out of the canvas.
  preserveDrawingBuffer?: boolean
}

export default function PoolScene({ onCanvasReady, preserveDrawingBuffer, ...props }: PoolSceneProps) {
  const [webglAvailable, setWebglAvailable] = useState(true)
  useEffect(() => {
    setWebglAvailable(detectWebGL())
  }, [])

  // extras arrives as a fresh array reference on every LeadForm re-render
  // even when its contents haven't changed -- key the memo on the sorted
  // contents instead of the array identity so the (non-trivial) scene
  // rebuild only happens when something actually selected changed.
  const extrasKey = useMemo(() => [...props.extras].sort().join(','), [props.extras])

  const built = useMemo(
    () => buildPoolScene(props),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.poolType, props.shape, props.construction, props.cover, props.ledLighting, extrasKey],
  )

  // Dispose the previous scene's geometries when a new one replaces it (or
  // this component unmounts) so switching between selections repeatedly
  // doesn't leak GPU memory. Materials are intentionally left alone: the
  // construction/deck/water materials are shared module-level singletons
  // (see materials.ts) that later scenes reuse, so disposing them here
  // would break every future render, not just this one.
  useEffect(() => {
    const group = built.group
    return () => {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
        }
      })
    }
  }, [built])

  if (!webglAvailable) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-sky-100 to-sky-50 px-6 text-center text-sm text-slate-500">
        A live 3D preview isn't available in this browser.
      </div>
    )
  }

  const { group, cameraDistance, cameraTarget, cameraElevation, cameraAzimuth, sceneRadius } = built
  const camX = cameraTarget.x + cameraDistance * Math.sin(cameraAzimuth) * Math.cos(cameraElevation)
  const camY = cameraTarget.y + cameraDistance * Math.sin(cameraElevation)
  const camZ = cameraTarget.z + cameraDistance * Math.cos(cameraAzimuth) * Math.cos(cameraElevation)

  // The shadow-casting light's frustum has to cover the whole scene or
  // shadows clip/disappear near the edges -- size it off the same radius
  // used to frame the camera, with a little headroom for accessories.
  const shadowExtent = sceneRadius * 1.15

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
        preserveDrawingBuffer: Boolean(preserveDrawingBuffer),
      }}
      camera={{ fov: FOV_DEGREES, near: 0.5, far: 500, position: [camX, camY, camZ] }}
      onCreated={(state) => {
        state.camera.lookAt(cameraTarget)
        state.scene.background = new THREE.Color('#eaf6fb')

        // A soft, neutral studio environment map -- generated entirely
        // procedurally (no HDRI file, no network fetch), it's what makes
        // the glossy fiberglass clearcoat and the water actually look
        // glossy/wet instead of flat. Without SOMETHING in the environment
        // to reflect, a "glossy" material has nothing to show and just
        // reads as a plain tinted diffuse surface -- this single addition
        // is the biggest lever on the scene not looking "plain."
        const pmrem = new THREE.PMREMGenerator(state.gl)
        const envRenderTarget = pmrem.fromScene(buildStudioEnvironmentScene(), 0.04)
        state.scene.environment = envRenderTarget.texture
        pmrem.dispose()

        onCanvasReady?.(state.gl.domElement)
      }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight
        castShadow
        // A lower sun angle than the first pass -- at high noon-ish angles
        // shadows fall almost straight down and barely peek out from under
        // an object; a lower, more raking angle throws longer, clearly
        // visible shadows across the deck, which is one of the strongest
        // remaining cues (beyond the lowered camera) that objects actually
        // have height and are sitting ON a surface rather than painted flat
        // onto it.
        position={[26, 20, 16]}
        intensity={1.5}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-near={1}
        shadow-camera-far={shadowExtent * 4}
        shadow-bias={-0.0015}
      />
      <directionalLight position={[-22, 16, -26]} intensity={0.3} />
      <primitive object={group} />
    </Canvas>
  )
}
