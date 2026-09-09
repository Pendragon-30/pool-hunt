import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Client side of the generate-composite-photo edge function: requests (or
// reuses the cached result of) one fully-baked composite photo -- the base
// pool photo with its cover and/or extras edited directly into the same
// real image, instead of separate sticker images layered on top. See that
// function for the full architecture note.
//
// This hook is deliberately non-blocking and silent on failure: while a
// composite is loading (or unavailable/rate-limited), the caller just keeps
// showing whatever it already had -- the existing sticker-based preview --
// so a slow or failed generation never breaks or blanks the page.

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
    setUrl(null)

    if (!shouldRequestComposite(params)) {
      setStatus('idle')
      return
    }

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
      }

      void attempt()
    }, DEBOUNCE_MS)

    return () => clearTimeout(debounceTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { status, url }
}
