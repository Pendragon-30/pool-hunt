import { useState } from 'react'
import AdminNav from './AdminNav'
import PhotosSubNav from './PhotosSubNav'
import AssetGenerationGrid, { type AssetItem } from './AssetGenerationGrid'

// One sticker per real cover type -- layered over the water area of
// whichever pool photo is showing. See src/components/PoolVisual.tsx for
// the overlay region and fallback behavior.
const ITEMS: AssetItem[] = [
  { key: 'manual', label: 'Manual Cover', requestBody: { category: 'cover', slug: 'manual' } },
  { key: 'automatic', label: 'Automatic Cover', requestBody: { category: 'cover', slug: 'automatic' } },
  { key: 'safety_cover', label: 'Safety Cover', requestBody: { category: 'cover', slug: 'safety_cover' } },
]

export default function CoversDashboard() {
  const [refreshKey, setRefreshKey] = useState(0)
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav onRefresh={() => setRefreshKey((k) => k + 1)} />
      <PhotosSubNav />
      <AssetGenerationGrid
        key={refreshKey}
        bucket="pool-covers"
        functionName="generate-accessory"
        items={ITEMS}
        title="Covers"
        description="One sticker per cover type, layered over the water on any pool photo when a cover is selected. Until a cover is generated, the site just shows a text chip for it."
        aspect="square"
        objectFit="contain"
      />
    </div>
  )
}
