import { useState } from 'react'
import AdminNav from './AdminNav'
import PhotosSubNav from './PhotosSubNav'
import AssetGenerationGrid, { type AssetItem } from './AssetGenerationGrid'

// One small icon per heater / filtration type, shown in the equipment chip
// row under the pool preview in place of the hand-drawn glyph, once
// generated. See src/components/PoolVisual.tsx for the fallback behavior.
const ITEMS: AssetItem[] = [
  { key: 'heater_gas', label: 'Heater · Gas', requestBody: { category: 'component', slug: 'heater_gas' } },
  {
    key: 'heater_electric_heat_pump',
    label: 'Heater · Electric Heat Pump',
    requestBody: { category: 'component', slug: 'heater_electric_heat_pump' },
  },
  { key: 'heater_solar', label: 'Heater · Solar', requestBody: { category: 'component', slug: 'heater_solar' } },
  {
    key: 'filtration_saltwater',
    label: 'Filtration · Saltwater',
    requestBody: { category: 'component', slug: 'filtration_saltwater' },
  },
  {
    key: 'filtration_traditional_chlorine',
    label: 'Filtration · Traditional Chlorine',
    requestBody: { category: 'component', slug: 'filtration_traditional_chlorine' },
  },
  {
    key: 'filtration_mineral_uv',
    label: 'Filtration · Mineral / UV',
    requestBody: { category: 'component', slug: 'filtration_mineral_uv' },
  },
  {
    key: 'filtration_ozone',
    label: 'Filtration · Ozone',
    requestBody: { category: 'component', slug: 'filtration_ozone' },
  },
]

export default function ComponentsDashboard() {
  const [refreshKey, setRefreshKey] = useState(0)
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav onRefresh={() => setRefreshKey((k) => k + 1)} />
      <PhotosSubNav />
      <AssetGenerationGrid
        key={refreshKey}
        bucket="pool-components"
        functionName="generate-accessory"
        items={ITEMS}
        title="Components"
        description="One icon per heater and filtration type, shown in the equipment row under the pool preview. Until a component is generated, the site shows a simple hand-drawn glyph in its place."
        aspect="square"
        objectFit="contain"
        columns="lg:grid-cols-4"
      />
    </div>
  )
}
