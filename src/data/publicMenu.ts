import { isValidSlug } from '@/entities/business/slug'
import { LIMITS } from '@/entities/menu/menu'
import { styleTheme } from '@/entities/theme/styles'
import { mergePresets } from '@/presets'
import { matchKey } from '@/shared/lib/checks'
import { putProduct, startMenu } from './ownerMenu'
import type { PublicMenu, PublicMenuRepository } from './publicRepository'
import { SAMPLE_BUSINESSES, type SampleBusiness } from './publicSamples'

// Each size up costs 20 pesos more, like the owner's own sample items (ownerMenu.ts).
const SIZE_STEP = 2000

/**
 * One sample business as a public menu. It is built through the same edits as the owner's editors (the presets give the
 * categories and add-ons, `putProduct` checks every item), so it holds nothing the editors would refuse. A category name
 * that the presets do not have is a mistake in the data and throws.
 */
export function buildSample(sample: SampleBusiness): PublicMenu {
  const preset = mergePresets(sample.types)
  let count = 0
  // Fixed ids, so the same menu has the same ids on every read (a link to a section never changes).
  const newId = () => `${sample.slug}-${++count}`
  let menu = startMenu(preset, false, newId)
  const groupIds = menu.groups.map((group) => group.id)

  for (const [name, items] of Object.entries(sample.items)) {
    const category = menu.categories.find((candidate) => matchKey(candidate.name) === matchKey(name))
    if (!category) throw new RangeError(`${sample.slug}: no category "${name}" in the presets`)
    for (const item of items) {
      const sizes = item.sized === true ? preset.sizes.slice(0, LIMITS.variants) : []
      menu = putProduct(
        menu,
        {
          categoryId: category.id,
          name: item.name,
          description: item.description,
          price: item.price * 100,
          variants: sizes.map((label, step) => ({ label, price: item.price * 100 + step * SIZE_STEP })),
          tags: item.tags ?? [],
          available: item.soldOut !== true,
          image: null,
          groupIds: item.addOns === true ? groupIds : [],
        },
        newId,
      )
    }
  }

  return {
    business: {
      name: sample.name,
      tagline: sample.tagline,
      logo: null,
      phone: sample.phone,
      address: sample.address,
      hours: sample.hours,
      social: { facebook: '', instagram: '', tiktok: '', website: '', ...sample.social },
      theme: styleTheme(sample.style, sample.mode),
      types: preset.types,
    },
    menu,
  }
}

type Options = { delay?: number; samples?: readonly SampleBusiness[] }

/**
 * Demo mode: five made-up businesses answer, and every other link has no menu. What an owner makes in the dashboard lives
 * in their own tab, so it is shown by the owner's preview (/dashboard/preview), not here. Answers are copies, so a screen
 * can never change what is stored. The samples are built on the first call, not when the page loads.
 */
export function createMockPublicMenu({ delay = 300, samples = SAMPLE_BUSINESSES }: Options = {}): PublicMenuRepository {
  let built: Map<string, PublicMenu> | null = null
  return {
    async get(slug) {
      await new Promise((resolve) => setTimeout(resolve, delay))
      if (!isValidSlug(slug)) return null
      built ??= new Map(samples.map((sample) => [sample.slug, buildSample(sample)]))
      const found = built.get(slug)
      return found ? structuredClone(found) : null
    },
  }
}

export const publicMenu: PublicMenuRepository = createMockPublicMenu()
