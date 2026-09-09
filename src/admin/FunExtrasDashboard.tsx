import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import AdminNav from './AdminNav'

// One sticker image per fun extra -- generated ONCE (not per pool combo)
// and layered on top of whichever pool photo is showing, at a fixed anchor
// position on the public site. See src/components/PoolVisual.tsx for the
// anchor layout and fallback-icon behavior.
const EXTRAS = [
  { slug: 'slide', label: 'Slide' },
  { slug: 'water_feature', label: 'Water Feature' },
  { slug: 'swim_up_bar', label: 'Swim-Up Bar' },
  { slug: 'tanning_ledge', label: 'Tanning Ledge' },
  { slug: 'diving_board', label: 'Diving Board' },
  { slug: 'led_lighting', label: 'LED Lighting' },
  { slug: 'hot_tub_spa_combo', label: 'Hot Tub / Spa Combo' },
  { slug: 'waterfall', label: 'Waterfall' },
]

type Status = 'idle' | 'generating' | 'done' | 'error'

export default function FunExtrasDashboard() {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<Record<string, Status>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [runningAll, setRunningAll] = useState(false)

  const loadExisting = async () => {
    const { data } = await supabase.storage.from('fun-extras').list('', { limit: 100 })
    if (!data) return
    const next: Record<string, string> = {}
    for (const file of data) {
      const key = file.name.replace(/\.png$/, '')
      const { data: pub } = supabase.storage.from('fun-extras').getPublicUrl(file.name)
      next[key] = `${pub.publicUrl}?v=${file.updated_at ?? Date.now()}`
    }
    setUrls(next)
  }

  useEffect(() => {
    loadExisting()
  }, [])

  const generateOne = async (slug: string) => {
    setStatus((s) => ({ ...s, [slug]: 'generating' }))
    setErrors((e) => ({ ...e, [slug]: '' }))

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    const { data, error } = await supabase.functions.invoke('generate-fun-extra', {
      body: { slug },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })

    if (error || !data?.url) {
      setStatus((s) => ({ ...s, [slug]: 'error' }))
      setErrors((e) => ({
        ...e,
        [slug]: (data && (data as any).error) || error?.message || 'Unknown error',
      }))
      return
    }

    setUrls((u) => ({ ...u, [slug]: `${data.url}?v=${Date.now()}` }))
    setStatus((s) => ({ ...s, [slug]: 'done' }))
  }

  const generateAllMissing = async () => {
    setRunningAll(true)
    for (const extra of EXTRAS) {
      if (urls[extra.slug]) continue
      await generateOne(extra.slug)
    }
    setRunningAll(false)
  }

  const regenerateAll = async () => {
    setRunningAll(true)
    for (const extra of EXTRAS) {
      await generateOne(extra.slug)
    }
    setRunningAll(false)
  }

  const missingCount = EXTRAS.filter((e) => !urls[e.slug]).length

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav onRefresh={loadExisting} />

      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Fun extras</h1>
            <p className="text-sm text-slate-500">
              One sticker image per extra, generated once and layered on top of any pool photo at a
              fixed spot — nothing is generated live for visitors. Until an extra is generated, the
              site shows a simple placeholder icon in its place.
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
                  ? 'All extras generated'
                  : `Generate all missing (${missingCount})`}
            </button>
            <button
              onClick={regenerateAll}
              disabled={runningAll}
              className="rounded-lg border border-sky-700 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-50"
            >
              Regenerate all ({EXTRAS.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EXTRAS.map((extra) => {
            const st = status[extra.slug] ?? (urls[extra.slug] ? 'done' : 'idle')
            return (
              <div key={extra.slug} className="rounded-xl border bg-white p-4">
                <div
                  className="aspect-square w-full overflow-hidden rounded-lg bg-slate-100"
                  style={
                    urls[extra.slug]
                      ? {
                          backgroundImage:
                            'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                          backgroundSize: '16px 16px',
                          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                        }
                      : undefined
                  }
                >
                  {urls[extra.slug] ? (
                    <img
                      src={urls[extra.slug]}
                      alt={extra.label}
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                      No image yet
                    </div>
                  )}
                </div>
                <div className="mt-2 text-sm font-medium text-slate-900">{extra.label}</div>
                {st === 'error' && errors[extra.slug] && (
                  <div className="mt-1 line-clamp-2 text-xs text-red-600">{errors[extra.slug]}</div>
                )}
                <button
                  onClick={() => generateOne(extra.slug)}
                  disabled={st === 'generating' || runningAll}
                  className="mt-2 w-full rounded-lg border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  {st === 'generating' ? 'Generating…' : urls[extra.slug] ? 'Regenerate' : 'Generate'}
                </button>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
