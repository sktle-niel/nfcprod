import { useCallback, useEffect, useRef, useState } from 'react'
import type { PricingRepository } from '@/data/pricing'
import { OFFER_KEYS, PERKS_MAX, validatePricing, type OfferKey, type Pricing, type PricingErrors } from '@/entities/pricing/pricing'

/** One included item as the admin edits it. The id keeps a row's input when rows above it go away. */
export type PerkValue = { id: number; text: string }
/** One offer as typed: whole pesos, a percent, and the included items. */
export type OfferValues = { price: string; discount: string; perks: PerkValue[] }
export type PricingValues = Record<OfferKey, OfferValues>

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; saved: Pricing }
export type SavePhase = 'idle' | 'sending' | 'saved' | 'failed'

/** Saved offers in the form's shape. `makeId` names each included item. */
function valuesOf(pricing: Pricing, makeId: () => number): PricingValues {
  const offer = (key: OfferKey): OfferValues => ({
    price: String(Math.round(pricing[key].price / 100)),
    discount: String(pricing[key].discount),
    perks: pricing[key].perks.map((text) => ({ id: makeId(), text })),
  })
  return { card: offer('card'), month: offer('month'), year: offer('year') }
}

/** The same offers as plain text, to tell whether anything changed. */
function fingerprint(values: PricingValues): string {
  return JSON.stringify(OFFER_KEYS.map((key) => [values[key].price, values[key].discount, values[key].perks.map((perk) => perk.text)]))
}

/** The name of the first input with a problem, in the order the page shows them. */
export function firstError(errors: PricingErrors, values: PricingValues): string | null {
  for (const key of OFFER_KEYS) {
    const offer = errors[key]
    if (!offer) continue
    if (offer.price) return `${key}-price`
    if (offer.discount) return `${key}-discount`
    const index = offer.perks?.findIndex((error) => error !== null) ?? -1
    const perk = values[key].perks[index]
    if (perk) return `${key}-perk-${perk.id}`
    if (offer.list) return `${key}-perk-${values[key].perks.at(-1)?.id ?? ''}`
  }
  return null
}

/** Loads the offers, keeps the admin's edits apart from what is saved, and saves them. */
export function usePricingEditor(repository: PricingRepository) {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [values, setValues] = useState<PricingValues | null>(null)
  const [errors, setErrors] = useState<PricingErrors>({})
  const [phase, setPhase] = useState<SavePhase>('idle')
  const nextId = useRef(0)

  const toValues = useCallback((pricing: Pricing) => valuesOf(pricing, () => nextId.current++), [])

  useEffect(() => {
    let live = true
    repository.get().then(
      (pricing) => {
        if (!live) return
        setLoad({ status: 'ready', saved: pricing })
        setValues(toValues(pricing))
      },
      () => {
        if (live) setLoad({ status: 'error' })
      },
    )
    return () => {
      live = false
    }
  }, [repository, attempt, toValues])

  const retry = useCallback(() => {
    setLoad({ status: 'loading' })
    setAttempt((count) => count + 1)
  }, [])

  /** Applies an edit to one offer and drops that offer's old errors for the part that changed. */
  function edit(key: OfferKey, part: 'price' | 'discount' | 'perks', change: (offer: OfferValues) => OfferValues) {
    setValues((current) => (current ? { ...current, [key]: change(current[key]) } : current))
    setErrors((current) => {
      const offer = { ...current[key] }
      if (part === 'perks') {
        delete offer.perks
        delete offer.list
      } else delete offer[part]
      return { ...current, [key]: offer }
    })
    setPhase('idle')
  }

  const setPrice = (key: OfferKey, price: string) => edit(key, 'price', (offer) => ({ ...offer, price }))
  const setDiscount = (key: OfferKey, discount: string) => edit(key, 'discount', (offer) => ({ ...offer, discount }))
  const setPerk = (key: OfferKey, id: number, text: string) =>
    edit(key, 'perks', (offer) => ({ ...offer, perks: offer.perks.map((perk) => (perk.id === id ? { id, text } : perk)) }))
  const addPerk = (key: OfferKey) =>
    edit(key, 'perks', (offer) =>
      offer.perks.length >= PERKS_MAX ? offer : { ...offer, perks: [...offer.perks, { id: nextId.current++, text: '' }] },
    )
  const removePerk = (key: OfferKey, id: number) =>
    edit(key, 'perks', (offer) => ({ ...offer, perks: offer.perks.filter((perk) => perk.id !== id) }))

  /** Checks the offers and saves them. Returns the name of the first input with a problem, if any. */
  async function save(): Promise<string | null> {
    if (!values || phase === 'sending') return null
    const raw = Object.fromEntries(
      OFFER_KEYS.map((key) => [key, { ...values[key], perks: values[key].perks.map((perk) => perk.text) }]),
    ) as Record<OfferKey, { price: string; discount: string; perks: string[] }>
    const result = validatePricing(raw)
    if (!result.ok) {
      setErrors(result.errors)
      return firstError(result.errors, values)
    }
    setErrors({})
    setPhase('sending')
    try {
      const saved = await repository.save(result.pricing)
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

  const dirty = load.status === 'ready' && values !== null && fingerprint(values) !== fingerprint(valuesOf(load.saved, () => 0))

  return { status: load.status, values, errors, phase, dirty, setPrice, setDiscount, setPerk, addPerk, removePerk, save, reset, retry }
}

