import { dashboardCopy } from '@/config/dashboardCopy'
import type { Menu, ModifierGroup } from '@/entities/menu/menu'
import { formatPeso } from '@/shared/lib/money'
import { plural } from '@/shared/lib/plural'
import { fill } from '@/shared/lib/fill'

const text = dashboardCopy.addons

/** How many items offer the group. */
export function usedByCount(menu: Menu, groupId: string): number {
  return menu.products.filter((product) => product.groupIds.includes(groupId)).length
}

/** The rule a customer follows, for example "Pick 1 to 3". Optional groups say "up to" because they can be skipped. */
export function ruleText(group: Pick<ModifierGroup, 'required' | 'min' | 'max'>): string {
  if (group.min === group.max) return text.rule.exactly.replace('{n}', String(group.max))
  if (group.required) return text.rule.between.replace('{min}', String(group.min)).replace('{max}', String(group.max))
  return text.rule.upTo.replace('{max}', String(group.max))
}

/** What an option adds: "+₱10", or "Free". */
export function optionPriceText(centavos: number): string {
  return centavos === 0 ? text.group.free : `+${formatPeso(centavos)}`
}

/**
 * The options in one line, for example "Oat milk +₱45, Soy milk +₱35". A free option is only named; when some options cost
 * something and some do not, the free ones say so ("Regular (free)"), so it is clear they are not missing a price.
 */
export function optionsSummary(options: readonly { label: string; price: number }[]): string {
  const mixed = options.some((option) => option.price > 0) && options.some((option) => option.price === 0)
  const words = text.suggestions
  return options
    .map((option) => {
      if (option.price > 0) return fill(words.pricedOption, { label: option.label, price: optionPriceText(option.price) })
      return mixed ? fill(words.freeOption, { label: option.label }) : option.label
    })
    .join(words.optionJoiner)
}

export function usedByText(count: number): string {
  return count === 0 ? text.group.unused : plural(count, text.group.usedBy)
}
