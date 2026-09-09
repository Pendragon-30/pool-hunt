import { useState } from 'react'
import AdminNav from './AdminNav'
import PhotosSubNav from './PhotosSubNav'
import AssetGenerationGrid, { type AssetItem } from './AssetGenerationGrid'

// One sticker image per fun extra -- generated ONCE (not per pool combo)
// and layered on top of whichever pool photo is showing, at a fixed anchor
// position. See src/components/PoolVisual.tsx for the anchor layout and
// fallback-icon behavior.
//
// "LED Lighting" is NOT listed here -- it renders as a color glow on the
// water directly in code rather than a generated sticker (a translucent
// lighting effect can't survive the chroma-key background removal every
// other sticker goes through), so there's nothing to generate for it.
const ITEMS: AssetItem[] = [
  { key: 'slide', label: 'Slide', requestBody: { category: 'extra', slug: 'slide' } },
  { key: 'natural_slide', label: 'Natural Slide', requestBody: { category: 'extra', slug: 'natural_slide' } },
  { key: 'water_feature', label: 'Water Feature', requestBody: { category: 'extra', slug: 'water_feature' } },
  { key: 'swim_up_bar', label: 'Swim-Up Bar', requestBody: { category: 'extra', slug: 'swim_up_bar' } },
  { key: 'tanning_ledge', label: 'Tanning Ledge', requestBody: { category: 'extra', slug: 'tanning_ledge' } },
  { key: 'diving_board', label: 'Diving Board', requestBody: { category: 'extra', slug: 'diving_board' } },
  {
    key: 'hot_tub_spa_combo',
    label: 'Hot Tub / Spa Combo',
    requestBody: { category: 'extra', slug: 'hot_tub_spa_combo' },
  },
  { key: 'waterfall', label: 'Waterfall', requestBody: { category: 'extra', slug: 'waterfall' } },
]

export default function ExtrasDashboard() {
  const [refreshKey, setRefreshKey] = useState(0)
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav onRefresh={() => setRefreshKey((k) => k + 1)} />
      <PhotosSubNav />
      <AssetGenerationGrid
        key={refreshKey}
        bucket="fun-extras"
        functionName="generate-accessory"
        items={ITEMS}
        title="Fun extras"
        description="One sticker per extra, layered on top of any pool photo at a fixed spot. Until an extra is generated, the site shows a simple placeholder icon in its place."
        aspect="square"
        objectFit="contain"
        columns="lg:grid-cols-4"
      />
    </div>
  )
}
