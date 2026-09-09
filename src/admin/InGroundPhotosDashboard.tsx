import { useState } from 'react'
import AdminNav from './AdminNav'
import PhotosSubNav from './PhotosSubNav'
import AssetGenerationGrid, { type AssetItem } from './AssetGenerationGrid'

const SHAPES = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'freeform', label: 'Freeform' },
  { value: 'kidney', label: 'Kidney' },
  { value: 'oval', label: 'Oval' },
  { value: 'round', label: 'Round' },
  { value: 'lap', label: 'Lap pool' },
]

const CONSTRUCTIONS = [
  { value: 'fiberglass', label: 'Fiberglass' },
  { value: 'vinyl_liner', label: 'Vinyl liner' },
  { value: 'concrete_gunite', label: 'Concrete / gunite' },
]

const ITEMS: AssetItem[] = SHAPES.flatMap((shape) =>
  CONSTRUCTIONS.map((construction) => ({
    key: `inground_${shape.value}_${construction.value}`,
    label: `Inground · ${shape.label} · ${construction.label}`,
    requestBody: { poolType: 'inground', shape: shape.value, construction: construction.value },
  })),
)

export default function InGroundPhotosDashboard() {
  const [refreshKey, setRefreshKey] = useState(0)
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav onRefresh={() => setRefreshKey((k) => k + 1)} />
      <PhotosSubNav />
      <AssetGenerationGrid
        key={refreshKey}
        bucket="pool-photos"
        functionName="generate-pool-image"
        items={ITEMS}
        title="Inground pools"
        description="One generated photo per shape / material combination. The public site swaps between these instantly — nothing is generated live for visitors."
      />
    </div>
  )
}
