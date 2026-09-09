import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Client side of the generate-composite-photo edge function: requests (or
// reuses the cached result of) one fully-baked composite photo -- the base
// pool photo with its cover and/or extras edited directly into the same
// real image, instead of separate sticker images layered on top. See that
// function for the full architecture note.
//
// This hook is deliberately non-blocking and silent on failure. While a NEW
// combo is loading, `url` keeps returning the LAST ready composite (if any)
// rather than clearing immediately -- that stale-but-real photo is a much
// cleaner thing to keep showing than reverting to the flat sticker overlay
// every time a selection changes, even though it doesn't yet reflect the
// newest pick. `status` still flips to 'loading' so the caller can show a
// small non-blocking indicator on top of it. `url` only goes back to null
// when no composite is needed at all (status 'idle') or a generation
// genuinely failed/was rate-limited (status 'unavailable') -- those are the
// only two states where the caller should fall back to sticker rendering.

export type CompositePhotoParams = {
  poolType: string
  shape: string
  construction: string
  /** Pass 'none' (or 'undecided') when there's no real cover selected. */
  cover: string
  /** Extra SLUGS (e.g. 'slide', 'water_feature'), not display names. */
  extras: string[]
}

type CompositeStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

const DEBOUNCE_MS = 700
const POLL_INTERVAL_MS = 2500
const MAX_POLLS = 6

function shouldRequestComposite(params: CompositePhotoParams): boolean {
  const hasRealCover = Boolean(params.cover) && params.cover !== 'none' && params.cover !== 'undecided'
  return hasRealCover || params.extras.length > 0
}

export function useCompositePhoto(params: CompositePhotoParams) {
  const [status, setStatus] = useState<CompositeStatus>('idle')
  const [url, setUrl] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  // Stable string identity for the effect dependency -- extras order
  // shouldn't matter (must match the same canonical sort the edge function
  // uses for its cache key) and we don't want a re-render on every new
  // array reference to re-trigger the request.
  const key = JSON.stringify({
    poolType: params.poolType,
    shape: params.shape,
    construction: params.construction,
    cover: params.cover,
    extras: [...params.extras].sort(),
  })

  useEffect(() => {
    requestIdRef.current += 1
    const thisRequestId = requestIdRef.current

    if (!shouldRequestComposite(params)) {
      setStatus('idle')
      setUrl(null)
      return
    }

    // Note: intentionally NOT clearing `url` here -- keep showing whatever
    // composite was last ready (even though it's for the previous combo)
    // while this new one loads, rather than reverting to nothing.
    setStatus('loading')

    const debounceTimer = setTimeout(() => {
      let pollsLeft = MAX_POLLS

      const attempt = async () => {
        if (requestIdRef.current !== thisRequestId) return // selections moved on since this fired

        const { data, error } = await supabase.functions.invoke('generate-composite-photo', {
          body: {
            poolType: params.poolType,
            shape: params.shape,
            construction: params.construction,
            cover: params.cover,
            extras: params.extras,
          },
        })

        if (requestIdRef.current !== thisRequestId) return

        if (error || !data) {
          setStatus('unavailable')
          setUrl(null)
          return
        }

        if (data.status === 'ready' && data.url) {
          setUrl(data.url)
          setStatus('ready')
          return
        }

        if (data.status === 'pending' && pollsLeft > 0) {
          pollsLeft -= 1
          setTimeout(attempt, POLL_INTERVAL_MS)
          return
        }

        setStatus('unavailable')
        setUrl(null)
      }

      void attempt()
    }, DEBOUNCE_MS)

    return () => clearTimeout(debounceTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { status, url }
}
