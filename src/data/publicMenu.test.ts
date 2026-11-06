import { describe, expect, it } from 'vitest'
import { BUSINESS_TYPES } from '@/entities/business/business'
import { isValidSlug } from '@/entities/business/slug'
import { validateBusinessPatch } from '@/entities/business/validate'
import { PRODUCT_TAGS } from '@/entities/menu/menu'
import { samplePicture } from '@/entities/menu/samplePictures'
import { validateCategoryInput, validateGroupInput } from '@/entities/menu/validate'
import { validateProductInput } from '@/entities/menu/validateProduct'
import { styleTheme } from '@/entities/theme/styles'
import { validateTheme } from '@/entities/theme/validate'
import { visibleSections } from '@/shared/menu/sections'
import { DEMO_TAKEN_SLUGS } from './owner'
import { buildSample, createMockPublicMenu } from './publicMenu'
import { SAMPLE_BUSINESSES, type SampleBusiness } from './publicSamples'

const repository = createMockPublicMenu({ delay: 0 })

describe('the public menu repository (demo)', () => {
  it('answers for exactly the five links the demo treats as taken', async () => {
    expect(SAMPLE_BUSINESSES.map((sample) => sample.slug).sort()).toEqual([...DEMO_TAKEN_SLUGS].sort())
    for (const slug of DEMO_TAKEN_SLUGS) {
      expect(await repository.get(slug), slug).not.toBeNull()
    }
  })

  it('gives each sample the style its business suits, in the mode the brief names', async () => {
    const looks = Object.fromEntries(
      await Promise.all(
        DEMO_TAKEN_SLUGS.map(async (slug) => {
          const theme = (await repository.get(slug))?.business.theme
          return [slug, `${theme?.style} ${theme?.mode}`]
        }),
      ),
    )
    expect(looks).toEqual({
      'cafe-luna': 'lightbox light',
      'kapehan-ni-ana': 'daybreak light',
      'la-bella': 'sandstone light',
      'bean-there': 'drip light',
      'tea-hub': 'marmalade light',
    })
  })

  it.each(SAMPLE_BUSINESSES.map((sample) => [sample.slug, sample] as const))(
    '%s passes the validators of the business and of the menu, with the theme of its style',
    async (_slug, sample) => {
      const found = await repository.get(sample.slug)
      if (!found) throw new Error('missing')
      const { business, menu } = found

      const { types, ...details } = business
      expect(types).toEqual(sample.types)
      expect(validateBusinessPatch(details).ok).toBe(true)
      expect(business.theme).toEqual(styleTheme(sample.style, sample.mode))
      expect(validateTheme(business.theme).ok).toBe(true)

      for (const category of menu.categories) expect(validateCategoryInput(category, menu.categories).ok).toBe(true)
      for (const group of menu.groups) expect(validateGroupInput(group, menu.groups).ok).toBe(true)
      for (const product of menu.products) {
        // The picture is the one thing the editors would refuse: a sample's photo is a path of the demo's own files, which only
        // this seed may carry (`samplePicture`). Everything else about the product must pass. An item with no fitting photo has none.
        const { image, ...rest } = product
        const checked = validateProductInput({ ...rest, image: null }, menu)
        expect(checked.ok, product.name).toBe(true)
        if (image !== null) expect(samplePicture(image), product.name).not.toBeNull()
      }
      const ids = [...menu.categories, ...menu.products, ...menu.groups].map((item) => item.id)
      expect(new Set(ids).size).toBe(ids.length)
    },
  )

  it.each(SAMPLE_BUSINESSES.map((sample) => [sample.slug, sample] as const))(
    '%s looks like a real menu: details, a best seller, a New item, a sold-out item, and every category has items',
    async (_slug, sample) => {
      const found = await repository.get(sample.slug)
      if (!found) throw new Error('missing')
      const { business, menu } = found
      expect(business.tagline).not.toBe('')
      expect(business.phone).not.toBe('')
      expect(business.address).not.toBe('')
      expect(business.hours).not.toBe('')
      expect(business.logo).toBeNull()
      expect(menu.products.length).toBeGreaterThanOrEqual(10)
      expect(menu.products.some((product) => product.tags.includes('bestSeller') && product.available)).toBe(true)
      expect(menu.products.some((product) => product.tags.includes('new'))).toBe(true)
      expect(menu.products.filter((product) => !product.available)).toHaveLength(1)
      // Every category the presets gave shows on the page.
      expect(visibleSections(menu)).toHaveLength(menu.categories.length)
    },
  )

  it('shows a photo only on the dish it fits, and each photo once per menu', () => {
    const imagesOf = (slug: string) => {
      const sample = SAMPLE_BUSINESSES.find((candidate) => candidate.slug === slug)
      if (!sample) throw new Error(`no sample ${slug}`)
      return new Map(buildSample(sample).menu.products.map((product) => [product.name, product.image]))
    }

    expect(imagesOf('kapehan-ni-ana').get('Sinigang na Baboy')).toBe('/sample/bowl-3.jpg')
    expect(imagesOf('la-bella').get('Tiramisu')).toBe('/sample/slice-3.jpg')
    expect(imagesOf('la-bella').get('Pan-roasted Sea Bass')).toBe('/sample/plate-6.jpg')
    for (const name of ['Bicol Express', 'Halo-halo']) {
      expect(imagesOf('kapehan-ni-ana').get(name), name).toBeNull()
    }

    for (const { slug, items } of SAMPLE_BUSINESSES) {
      const names = Object.values(items).flat().map((item) => item.name)
      expect(new Set(names).size, slug).toBe(names.length)
      const shown = [...imagesOf(slug).values()].filter((image) => image !== null)
      expect(new Set(shown).size, slug).toBe(shown.length)
    }
  })

  it('refuses an item that names a photo the library does not have', () => {
    const [first] = SAMPLE_BUSINESSES
    if (!first) throw new Error('no samples')
    expect(() => buildSample({ ...first, items: { Hot: [{ name: 'X', description: '', price: 1, photo: 'cup-9' }] } })).toThrow(RangeError)
  })

  it('uses the sizes and add-ons of the presets where a sample asks for them', async () => {
    const luna = await repository.get('cafe-luna')
    const latte = luna?.menu.products.find((product) => product.name === 'Spanish Latte')
    expect(latte?.variants.map((variant) => variant.label)).toEqual(['S', 'M', 'L'])
    // The price is the lowest size, and each size up costs 20 pesos more.
    expect(latte?.price).toBe(16500)
    expect(latte?.variants.map((variant) => variant.price)).toEqual([16500, 18500, 20500])
    expect(latte?.groupIds.length).toBeGreaterThan(0)
    const bella = await repository.get('la-bella')
    expect(bella?.menu.products.every((product) => product.variants.length === 0)).toBe(true)
  })

  it('only uses tags and business types the app knows', () => {
    for (const sample of SAMPLE_BUSINESSES) {
      expect(sample.types.every((type) => BUSINESS_TYPES.includes(type))).toBe(true)
      for (const items of Object.values(sample.items)) {
        for (const item of items) expect(item.tags?.every((tag) => PRODUCT_TAGS.includes(tag)) ?? true).toBe(true)
      }
    }
  })

  it('keeps the same ids on every read', async () => {
    const first = await repository.get('tea-hub')
    const second = await createMockPublicMenu({ delay: 0 }).get('tea-hub')
    expect(second).toEqual(first)
  })

  it('has no menu at a link that is unknown, invalid or not a string', async () => {
    for (const slug of ['nobody-here', 'Cafe-Luna', 'cafe_luna', 'cafe luna', '..%2Fx', 'ab', 'admin', '__proto__', 'constructor', '', 'cafe-luna/']) {
      expect(await repository.get(slug), slug).toBeNull()
    }
    expect(isValidSlug('nobody-here')).toBe(true)
    // @ts-expect-error a caller that did not check its input
    expect(await repository.get(undefined)).toBeNull()
    // @ts-expect-error a caller that did not check its input
    expect(await repository.get({ toString: () => 'cafe-luna' })).toBeNull()
  })

  it('gives copies: changing an answer changes nothing the next one holds', async () => {
    const first = await repository.get('bean-there')
    if (!first) throw new Error('missing')
    first.business.name = 'Changed'
    first.business.theme.primary = '#000000'
    const [firstProduct] = first.menu.products
    if (firstProduct) firstProduct.name = 'Changed'
    first.menu.categories.length = 0
    const second = await repository.get('bean-there')
    expect(second?.business.name).toBe('Bean There')
    expect(second?.business.theme.primary).toBe(styleTheme('drip', 'light').primary)
    expect(second?.menu.products[0]?.name).not.toBe('Changed')
    expect(second?.menu.categories.length).toBeGreaterThan(0)
    expect(second).not.toBe(first)
  })

  it('waits before it answers, as the other mocks do, and the wait can be set', async () => {
    const slow = createMockPublicMenu({ delay: 40 })
    const start = Date.now()
    await slow.get('cafe-luna')
    expect(Date.now() - start).toBeGreaterThanOrEqual(30)
  })

  it('serves the samples it is given', async () => {
    const [first] = SAMPLE_BUSINESSES
    if (!first) throw new Error('no samples')
    const own: SampleBusiness = { ...first, slug: 'my-shop', name: 'My Shop' }
    const mine = createMockPublicMenu({ delay: 0, samples: [own] })
    expect((await mine.get('my-shop'))?.business.name).toBe('My Shop')
    expect(await mine.get('cafe-luna')).toBeNull()
  })

  it('refuses a sample that names a category the presets do not have', () => {
    const [first] = SAMPLE_BUSINESSES
    if (!first) throw new Error('no samples')
    expect(() => buildSample({ ...first, items: { 'No Such Category': [{ name: 'X', description: '', price: 1 }] } })).toThrow(RangeError)
  })
})
