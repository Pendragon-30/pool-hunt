import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import AdminNav from './AdminNav'

type Combo = {
  poolType: 'inground' | 'above_ground'
  shape: string
  construction: string
}

const INGROUND_SHAPES = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'freeform', label: 'Freeform' },
  { value: 'kidney', label: 'Kidney' },
  { value: 'oval', label: 'Oval' },
  { value: 'round', label: 'Round' },
  { value: 'lap', label: 'Lap pool' },
]

const ABOVE_GROUND_SHAPES = [
  { value: 'round', label: 'Round' },
  { value: 'oval', label: 'Oval' },
]

const CONSTRUCTIONS = [
  { value: 'fiberglass', label: 'Fiberglass' },
  { value: 'vinyl_liner', label: 'Vinyl liner' },
  { value: 'concrete_gunite', label: 'Concrete / gunite' },
]

// Above-ground pools are built with a steel/resin/aluminum wall over a vinyl
// liner -- fiberglass and concrete/gunite above-ground pools aren't a real
// product, so we don't offer (or pay Gemini to generate) those combos.
const ABOVE_GROUND_CONSTRUCTIONS = [{ value: 'vinyl_liner', label: 'Vinyl liner' }]

const COMBOS: Combo[] = [
  ...INGROUND_SHAPES.flatMap((shape) =>
    CONSTRUCTIONS.map((construction) => ({
      poolType: 'inground' as const,
      shape: shape.value,
      construction: construction.value,
    })),
  ),
  ...ABOVE_GROUND_SHAPES.flatMap((shape) =>
    ABOVE_GROUND_CONSTRUCTIONS.map((construction) => ({
      poolType: 'above_ground' as const,
      shape: shape.value,
      construction: construction.value,
    })),
  ),
]

function comboKey(c: Combo) {
  return `${c.poolType}_${c.shape}_${c.construction}`
}

function comboLabel(c: Combo) {
  const shapeLabel =
    (c.poolType === 'above_ground' ? ABOVE_GROUND_SHAPES : INGROUND_SHAPES).find(
      (s) => s.value === c.shape,
    )?.label ?? c.shape
  const constructionLabel =
    (c.poolType === 'above_ground' ? ABOVE_GROUND_CONSTRUCTIONS : CONSTRUCTIONS).find(
      (m) => m.value === c.construction,
    )?.label ?? c.construction
  return `${c.poolType === 'above_ground' ? 'Above-ground' : 'Inground'} · ${shapeLabel} · ${constructionLabel}`
}

type Status = 'idle' | 'generating' | 'done' | 'error'

export default function PoolPhotosDashboard() {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<Record<string, Status>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [runningAll, setRunningAll] = useState(false)

  const loadExisting = async () => {
    const { data } = await supabase.storage.from('pool-photos').list('', { limit: 100 })
    if (!data) return
    const next: Record<string, string> = {}
    for (const file of data) {
      const key = file.name.replace(/\.png$/, '')
      const { data: pub } = supabase.storage.from('pool-photos').getPublicUrl(file.name)
      next[key] = `${pub.publicUrl}?v=${file.updated_at ?? Date.now()}`
    }
    setUrls(next)
  }

  useEffect(() => {
    loadExisting()
  }, [])

  const generateOne = async (combo: Combo) => {
    const key = comboKey(combo)
    setStatus((s) => ({ ...s, [key]: 'generating' }))
    setErrors((e) => ({ ...e, [key]: '' }))

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    const { data, error } = await supabase.functions.invoke('generate-pool-image', {
      body: combo,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })

    if (error || !data?.url) {
      setStatus((s) => ({ ...s, [key]: 'error' }))
      setErrors((e) => ({
        ...e,
        [key]: (data && (data as any).error) || error?.message || 'Unknown error',
      }))
      return
    }

    setUrls((u) => ({ ...u, [key]: `${data.url}?v=${Date.now()}` }))
    setStatus((s) => ({ ...s, [key]: 'done' }))
  }

  const generateAllMissing = async () => {
    setRunningAll(true)
    for (const combo of COMBOS) {
      const key = comboKey(combo)
      if (urls[key]) continue // already generated — use "Regenerate" on a single card to redo one
      await generateOne(combo)
    }
    setRunningAll(false)
  }

  const regenerateAll = async () => {
    setRunningAll(true)
    for (const combo of COMBOS) {
      await generateOne(combo)
    }
    setRunningAll(false)
  }

  const missingCount = COMBOS.filter((c) => !urls[comboKey(c)]).length

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav onRefresh={loadExisting} />

      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Pool photos</h1>
            <p className="text-sm text-slate-500">
              One generated photo per real pool type / shape / material combination. The public
              site swaps between these instantly once all three are picked — nothing is generated
              live for visitors.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={generateAllMissing}
              disabled={runningAll || missingCount === 0}
              className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
            >
              {runningAll
                ? 'Generating…'
                : missingCount === 0
                  ? 'All photos generated'
                  : `Generate all missing (${missingCount})`}
            </button>
            <button
              onClick={regenerateAll}
              disabled={runningAll || COMBOS.length === 0}
              className="rounded-lg border border-sky-700 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-50"
            >
              Regenerate all ({COMBOS.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COMBOS.map((combo) => {
            const key = comboKey(combo)
            const st = status[key] ?? (urls[key] ? 'done' : 'idle')
            return (
              <div key={key} className="rounded-xl border bg-white p-4">
                <div
                  className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100"
                  style={
                    urls[key]
                      ? {
                          backgroundImage:
                            'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                          backgroundSize: '16px 16px',
                          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                        }
                      : undefined
                  }
                >
                  {urls[key] ? (
                    <img src={urls[key]} alt={comboLabel(combo)} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                      No photo yet
                    </div>
                  )}
                </div>
                <div className="mt-2 text-sm font-medium text-slate-900">{comboLabel(combo)}</div>
                {st === 'error' && errors[key] && (
                  <div className="mt-1 line-clamp-2 text-xs text-red-600">{errors[key]}</div>
                )}
                <button
                  onClick={() => generateOne(combo)}
                  disabled={st === 'generating' || runningAll}
                  className="mt-2 w-full rounded-lg border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  {st === 'generating' ? 'Generating…' : urls[key] ? 'Regenerate' : 'Generate'}
                </button>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
