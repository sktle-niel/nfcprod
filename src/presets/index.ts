import { BUSINESS_TYPES, type BusinessType } from '@/entities/business/business'
import { LIMITS } from '@/entities/menu/menu'
import { DEFAULT_THEME } from '@/entities/theme/theme'
import { isOneOf, matchKey } from '@/shared/lib/checks'
import { deepFreeze } from '@/shared/lib/freeze'
import { bakeryPreset } from './bakery'
import { barPreset } from './bar'
import { casualDiningPreset } from './casualDining'
import { coffeePreset } from './coffee'
import { fineDiningPreset } from './fineDining'
import { milkTeaPreset } from './milkTea'
import type { MergedPreset, Preset, PresetGroup } from './types'

/** Every preset by business type (PROJECT_FLOW section 4). Frozen: `mergePresets` gives back copies to change. */
export const PRESETS: Readonly<Record<BusinessType, Preset>> = deepFreeze({
  coffee: coffeePreset,
  milkTea: milkTeaPreset,
  casualDining: casualDiningPreset,
  fineDining: fineDiningPreset,
  bakery: bakeryPreset,
  bar: barPreset,
})

/** The preset of one type (frozen). A type that does not exist is a bug in the caller, so it throws a RangeError. */
export function presetFor(type: BusinessType): Preset {
  if (!isOneOf(BUSINESS_TYPES, type)) throw new RangeError(`Unknown business type: ${String(type)}`)
  return PRESETS[type]
}

/** The items whose key was not seen before, in their first-seen order. */
function uniqueBy<T>(items: readonly T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const itemKey = key(item)
    if (seen.has(itemKey)) return false
    seen.add(itemKey)
    return true
  })
}

/** Groups with the same name become one, with the options of both (by label, the first price wins). */
function mergeGroups(groups: readonly PresetGroup[]): PresetGroup[] {
  const merged = new Map<string, PresetGroup>()
  for (const group of groups) {
    const key = matchKey(group.name)
    const options = group.options.map((option) => ({ ...option }))
    const same = merged.get(key)
    if (same === undefined) {
      merged.set(key, { ...group, options })
      continue
    }
    // `same` is this function's own copy, so it can grow. A group never passes the options limit.
    same.options = uniqueBy([...same.options, ...options], (option) => matchKey(option.label)).slice(0, LIMITS.options)
  }
  return [...merged.values()]
}

/**
 * The presets of a hybrid business as one (PROJECT_FLOW section 4, hybrid rule): categories, add-on groups, sizes and
 * samples without duplicates, ignoring case, in the order first seen. The look is the first type's. No types gives the
 * default look and nothing else. Everything given back is a fresh copy.
 */
export function mergePresets(types: readonly BusinessType[]): MergedPreset {
  const known = uniqueBy(Array.isArray(types) ? types.filter((type) => isOneOf(BUSINESS_TYPES, type)) : [], String)
  const presets = known.map((type) => PRESETS[type])
  const categories = uniqueBy(presets.flatMap((preset) => preset.categories), matchKey)
  // A sample names its category as the merged list spells it, so it always finds it.
  const spelling = new Map(categories.map((name) => [matchKey(name), name]))
  const samples = presets
    .flatMap((preset) => preset.samples)
    .map((sample) => ({ ...sample, category: spelling.get(matchKey(sample.category)) ?? sample.category, tags: [...sample.tags] }))
  return {
    types: known,
    categories,
    theme: { ...(presets[0]?.theme ?? DEFAULT_THEME) },
    groups: mergeGroups(presets.flatMap((preset) => preset.groups)),
    sizes: uniqueBy(presets.flatMap((preset) => preset.sizes), matchKey),
    samples: uniqueBy(samples, (sample) => `${matchKey(sample.category)}\n${matchKey(sample.name)}`),
  }
}
