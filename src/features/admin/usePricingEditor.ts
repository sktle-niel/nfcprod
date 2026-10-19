import { useCallback, useEffect, useState } from 'react'
import type { PricingRepository } from '@/data/pricing'
import { PRICE_KEYS, validatePrices, type PriceErrors, type PriceKey, type Prices } from '@/entities/pricing/pricing'

/** What the admin typed, in whole pesos. */
export type PriceValues = Record<PriceKey, string>

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; saved: Prices }
export type SavePhase = 'idle' | 'sending' | 'saved' | 'failed'

function toValues(prices: Prices): PriceValues {
  return Object.fromEntries(PRICE_KEYS.map((key) => [key, String(Math.round(prices[key] / 100))])) as PriceValues
}

/** Loads the prices, keeps the admin's edits apart from what is saved, and saves them. */
export function usePricingEditor(repository: PricingRepository) {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [values, setValues] = useState<PriceValues | null>(null)
  const [errors, setErrors] = useState<PriceErrors>({})
  const [phase, setPhase] = useState<SavePhase>('idle')

  useEffect(() => {
    let live = true
    repository.get().then(
      (prices) => {
        if (!live) return
        setLoad({ status: 'ready', saved: prices })
        setValues(toValues(prices))
      },
      () => {
        if (live) setLoad({ status: 'error' })
      },
    )
    return () => {
      live = false
    }
  }, [repository, attempt])

  const retry = useCallback(() => {
    setLoad({ status: 'loading' })
    setAttempt((count) => count + 1)
  }, [])

  function change(key: PriceKey, value: string) {
    setValues((current) => (current ? { ...current, [key]: value } : current))
    setErrors((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    setPhase('idle')
  }

  /** Checks the prices and saves them. Returns the first field with a problem, if any. */
  async function save(): Promise<PriceKey | null> {
    if (!values || phase === 'sending') return null
    const result = validatePrices(values)
    if (!result.ok) {
      setErrors(result.errors)
      return PRICE_KEYS.find((key) => result.errors[key]) ?? null
    }
    setErrors({})
    setPhase('sending')
    try {
      const saved = await repository.save(result.prices)
      setLoad({ status: 'ready', saved })
      setValues(toValues(saved))
      setPhase('saved')
    } catch {
      setPhase('failed')
    }
    return null
  }

  function reset() {
    if (load.status !== 'ready') return
    setValues(toValues(load.saved))
    setErrors({})
    setPhase('idle')
  }

  const saved = load.status === 'ready' ? toValues(load.saved) : null
  const dirty = saved !== null && values !== null && PRICE_KEYS.some((key) => saved[key] !== values[key])

  return { status: load.status, values, errors, phase, dirty, change, save, reset, retry }
}
