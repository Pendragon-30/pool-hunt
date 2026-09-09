import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { buildPoolScene, type PoolSceneConfig } from './buildScene'

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

export type PoolSceneProps = PoolSceneConfig

export default function PoolScene(props: PoolSceneProps) {
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

  const { group, cameraDistance, cameraTarget, cameraElevation, cameraAzimuth } = built
  const camX = cameraTarget.x + cameraDistance * Math.sin(cameraAzimuth) * Math.cos(cameraElevation)
  const camY = cameraTarget.y + cameraDistance * Math.sin(cameraElevation)
  const camZ = cameraTarget.z + cameraDistance * Math.cos(cameraAzimuth) * Math.cos(cameraElevation)

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ fov: 32, near: 0.5, far: 500, position: [camX, camY, camZ] }}
      onCreated={(state) => {
        state.camera.lookAt(cameraTarget)
        state.scene.background = new THREE.Color('#eaf6fb')
      }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[30, 42, 22]} intensity={1.15} />
      <directionalLight position={[-22, 16, -26]} intensity={0.3} />
      <primitive object={group} />
    </Canvas>
  )
}
