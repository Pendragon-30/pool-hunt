import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { chromaKeyAndUpload } from './chromaKey'

export type AssetItem = {
  /** Storage filename without the .png extension — also used as the React key. */
  key: string
  label: string
  /** Body sent to the edge function to (re)generate this one item. */
  requestBody: Record<string, unknown>
}

type Status = 'idle' | 'generating' | 'done' | 'error'

// Shared "grid of generated images with a Generate/Regenerate button per
// card" widget, reused across every image-generation category (pool
// photos, extras, covers, components). Each category just supplies which
// Supabase Storage bucket to read from, which edge function to call, and
// the list of items to show -- everything else (loading existing images,
// per-card generate, generate-all-missing, regenerate-all, the checkerboard
// preview backdrop for transparent PNGs) is identical.
export default function AssetGenerationGrid({
  bucket,
  functionName,
  items,
  title,
  description,
  aspect = 'photo',
  objectFit = 'cover',
  columns = 'lg:grid-cols-3',
}: {
  bucket: string
  functionName: string
  items: AssetItem[]
  title: string
  description: string
  aspect?: 'photo' | 'square'
  objectFit?: 'cover' | 'contain'
  columns?: string
}) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<Record<string, Status>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [runningAll, setRunningAll] = useState(false)

  const loadExisting = async () => {
    const { data } = await supabase.storage.from(bucket).list('', { limit: 200 })
    if (!data) return
    const next: Record<string, string> = {}
    for (const file of data) {
      const key = file.name.replace(/\.png$/, '')
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(file.name)
      next[key] = `${pub.publicUrl}?v=${file.updated_at ?? Date.now()}`
    }
    setUrls(next)
  }

  useEffect(() => {
    loadExisting()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket])

  const generateOne = async (item: AssetItem) => {
    setStatus((s) => ({ ...s, [item.key]: 'generating' }))
    setErrors((e) => ({ ...e, [item.key]: '' }))
    setNotes((n) => ({ ...n, [item.key]: '' }))

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: item.requestBody,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })

    if (error || !data?.dataBase64) {
      setStatus((s) => ({ ...s, [item.key]: 'error' }))
      setErrors((e) => ({
        ...e,
        [item.key]: (data && (data as any).error) || error?.message || 'Unknown error',
      }))
      return
    }

    // Some functions (e.g. generate-pool-image, for non-reference material
    // variants) attach a `note` when they had to fall back to a
    // lower-consistency generation path -- surface it as a heads-up rather
    // than an error, since the image still generated fine.
    if ((data as any).note) {
      setNotes((n) => ({ ...n, [item.key]: (data as any).note }))
    }

    // Gemini returns the image on a solid magenta chroma-key background
    // (it doesn't reliably support real alpha transparency) -- key that
    // out to true transparency in the browser, then upload the result.
    try {
      const url = await chromaKeyAndUpload(data.dataBase64, data.mimeType || 'image/png', bucket, `${item.key}.png`)
      setUrls((u) => ({ ...u, [item.key]: url }))
      setStatus((s) => ({ ...s, [item.key]: 'done' }))
    } catch (err) {
      setStatus((s) => ({ ...s, [item.key]: 'error' }))
      setErrors((e) => ({
        ...e,
        [item.key]: err instanceof Error ? err.message : 'Failed to process the generated image',
      }))
    }
  }

  const generateAllMissing = async () => {
    setRunningAll(true)
    for (const item of items) {
      if (urls[item.key]) continue
      await generateOne(item)
    }
    setRunningAll(false)
  }

  const regenerateAll = async () => {
    setRunningAll(true)
    for (const item of items) {
      await generateOne(item)
    }
    setRunningAll(false)
  }

  const missingCount = items.filter((item) => !urls[item.key]).length
  const aspectClass = aspect === 'square' ? 'aspect-square' : 'aspect-[4/3]'
  const objectFitClass = objectFit === 'contain' ? 'object-contain p-2' : 'object-cover'

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{description}</p>
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
                ? 'All generated'
                : `Generate all missing (${missingCount})`}
          </button>
          <button
            onClick={regenerateAll}
            disabled={runningAll || items.length === 0}
            className="rounded-lg border border-sky-700 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-50"
          >
            Regenerate all ({items.length})
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${columns}`}>
        {items.map((item) => {
          const st = status[item.key] ?? (urls[item.key] ? 'done' : 'idle')
          return (
            <div key={item.key} className="rounded-xl border bg-white p-4">
              <div
                className={`${aspectClass} w-full overflow-hidden rounded-lg bg-slate-100`}
                style={
                  urls[item.key]
                    ? {
                        backgroundImage:
                          'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                        backgroundSize: '16px 16px',
                        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                      }
                    : undefined
                }
              >
                {urls[item.key] ? (
                  <img
                    src={urls[item.key]}
                    alt={item.label}
                    className={`h-full w-full ${objectFitClass}`}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                    No image yet
                  </div>
                )}
              </div>
              <div className="mt-2 text-sm font-medium text-slate-900">{item.label}</div>
              {st === 'error' && errors[item.key] && (
                <div className="mt-1 line-clamp-2 text-xs text-red-600">{errors[item.key]}</div>
              )}
              {st !== 'error' && notes[item.key] && (
                <div className="mt-1 line-clamp-3 text-xs text-amber-600">{notes[item.key]}</div>
              )}
              <button
                onClick={() => generateOne(item)}
                disabled={st === 'generating' || runningAll}
                className="mt-2 w-full rounded-lg border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {st === 'generating' ? 'Generating…' : urls[item.key] ? 'Regenerate' : 'Generate'}
              </button>
            </div>
          )
        })}
      </div>
    </main>
  )
}
