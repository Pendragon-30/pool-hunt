import { useState } from 'react'
import AdminNav from './AdminNav'
import PhotosSubNav from './PhotosSubNav'
import AssetGenerationGrid, { type AssetItem } from './AssetGenerationGrid'

const SHAPES = [
  { value: 'round', label: 'Round' },
  { value: 'oval', label: 'Oval' },
]

// Above-ground pools are built with a steel/resin/aluminum wall over a
// vinyl liner -- fiberglass and concrete/gunite above-ground pools aren't a
// real product, so vinyl liner is the only construction offered here.
const CONSTRUCTIONS = [{ value: 'vinyl_liner', label: 'Vinyl liner' }]

const ITEMS: AssetItem[] = SHAPES.flatMap((shape) =>
  CONSTRUCTIONS.map((construction) => ({
    key: `above_ground_${shape.value}_${construction.value}`,
    label: `Above-ground · ${shape.label} · ${construction.label}`,
    requestBody: { poolType: 'above_ground', shape: shape.value, construction: construction.value },
  })),
)

export default function AboveGroundPhotosDashboard() {
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
        title="Above-ground pools"
        description="One generated photo per shape. Vinyl liner is the only real above-ground construction, so that's the only material offered here."
        columns="lg:grid-cols-2"
      />
    </div>
  )
}
