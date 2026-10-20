import { useCallback, useState } from 'react'
import type { ReverseGeocoder, SearchHit } from '@/data/geocoder'
import { useNewestRun } from './useMapPinRun'

export type SearchState = { phase: 'idle' } | { phase: 'searching' } | { phase: 'failed' } | { phase: 'done'; hits: SearchHit[] }

const IDLE: SearchState = { phase: 'idle' }
const MAX_HITS = 5

/**
 * One search at a time, run when the customer submits and never while they type. A new search aborts the
 * one before it, and leaving the panel aborts the last. An answer that is no longer the newest is dropped.
 */
export function useMapPinSearch(geocoder: ReverseGeocoder) {
  const [state, setState] = useState<SearchState>(IDLE)
  const run = useNewestRun()

  const search = useCallback(
    (query: string) => {
      const text = query.trim()
      if (text === '') return
      const { id, signal } = run.start()
      setState({ phase: 'searching' })
      geocoder.search(text, signal).then(
        (hits) => {
          if (run.isNewest(id)) setState({ phase: 'done', hits: hits.slice(0, MAX_HITS) })
        },
        () => {
          if (run.isNewest(id)) setState({ phase: 'failed' })
        },
      )
    },
    [geocoder, run],
  )

  /** Drops the results, and aborts the search if one is still running. */
  const clear = useCallback(() => {
    run.stop()
    setState(IDLE)
  }, [run])

  return { state, search, clear }
}
