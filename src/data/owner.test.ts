import { describe, expect, it } from 'vitest'
import { BUSINESS_TYPES, type BusinessPatch, type BusinessType, type NewBusinessInput } from '@/entities/business/business'
import { isValidSlug } from '@/entities/business/slug'
import { validateBusinessPatch, validateNewBusiness } from '@/entities/business/validate'
import { IMAGE_MAX_BYTES, type CategoryInput, type Menu, type Product, type ProductInput, type ProductTag } from '@/entities/menu/menu'
import { validateCategoryInput, validateGroupInput } from '@/entities/menu/validate'
import { validateProductInput } from '@/entities/menu/validateProduct'
import { mergePresets, PRESETS } from '@/presets'
import { TEST_PASSWORD, testOwner } from '@/test/auth'
import { sampleBusiness, sampleImageFile, sampleMenu } from '@/test/ownerFixtures'
import { createMockAuth } from './auth'
import { createMockOwner, DEMO_TAKEN_SLUGS } from './owner'
import { OwnerError } from './ownerRepository'

// 21 Oct 2026, 12:00 in Manila.
const NOW = Date.parse('2026-10-21T04:00:00Z')
const DAY = 86_400_000
const anotherOwner = { name: 'Ana Reyes', email: 'ana@tsaa.ph', password: TEST_PASSWORD }
const kapeKanto: NewBusinessInput = { name: 'Kape Kanto', slug: 'kape-kanto', types: ['coffee'], samples: true }
const MADE_ID = /^id-\d+$/

/** A repository on its own accounts, with `testOwner` signed in. Ids count up: id-1, id-2 and so on. */
async function setUp(options: { now?: () => number; takenSlugs?: readonly string[] } = {}) {
  const accounts = createMockAuth({ delay: 0 })
  await accounts.signUp(testOwner)
  let count = 0
  const owner = createMockOwner(accounts, { delay: 0, now: () => NOW, newId: () => `id-${++count}`, ...options })
  return { accounts, owner }
}

/** A coffee shop set up with its samples: Americano and Spanish Latte in Hot, then one product each in Iced, Blended, Pastries. */
async function withCoffee() {
  const { accounts, owner } = await setUp()
  const { menu } = await owner.createBusiness(kapeKanto)
  return { accounts, owner, menu, hot: idOf(menu.categories, 'Hot'), iced: idOf(menu.categories, 'Iced') }
}

/** The code and fields of the OwnerError the call fails with. Anything else fails the test. */
async function refusal(call: Promise<unknown>) {
  const error: unknown = await call.then(
    () => undefined,
    (reason: unknown) => reason,
  )
  if (!(error instanceof OwnerError)) throw new Error(`Expected an OwnerError, got ${String(error)}`)
  return { code: error.code, fields: error.fields }
}

const names = (list: readonly { name: string }[]) => list.map((item) => item.name)
const idOf = (list: readonly { id: string; name: string }[], name: string) => list.find((item) => item.name === name)?.id ?? ''

function productNamed(menu: Menu, name: string): Product {
  const product = menu.products.find((item) => item.name === name)
  if (!product) throw new Error(`No product named ${name}`)
  return product
}

/** A new product, "Flat White" at ₱140 with no sizes. Pass the category. */
function productInput(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    categoryId: '',
    name: 'Flat White',
    description: '',
    price: 14000,
    variants: [],
    tags: [],
    available: true,
    image: null,
    groupIds: [],
    ...overrides,
  }
}

/** The categories' places of the products, in array order: never decreasing when products stay with their category. */
const categoryPlaces = (menu: Menu) => menu.products.map((product) => menu.categories.findIndex((category) => category.id === product.categoryId))

describe('the owner repository without a business', () => {
  it('refuses every call when nobody is signed in', async () => {
    const owner = createMockOwner(createMockAuth({ delay: 0 }), { delay: 0 })
    const calls = [
      () => owner.getBusiness(),
      () => owner.createBusiness(kapeKanto),
      () => owner.checkSlug('kape-kanto'),
      () => owner.getMenu(),
      () => owner.uploadImage(sampleImageFile()),
      () => owner.insights(),
    ]
    for (const call of calls) expect(await refusal(call())).toEqual({ code: 'signedOut', fields: {} })
  })

  it('has no business before the setup wizard, and refuses business and menu calls until then', async () => {
    const { owner } = await setUp()
    expect(await owner.getBusiness()).toBeNull()
    const calls = [
      () => owner.getMenu(),
      () => owner.saveBusiness({ name: 'Kape Kanto' }),
      () => owner.changeSlug('kape-kanto'),
      () => owner.setPublished(true),
      () => owner.saveCategory({ name: 'Hot', visible: true }),
      () => owner.moveCategory('id-1', 1),
      () => owner.deleteGroup('id-1'),
      () => owner.insights(),
    ]
    for (const call of calls) expect(await refusal(call())).toEqual({ code: 'notFound', fields: {} })
  })
})

describe('createBusiness', () => {
  it('creates an unpublished business with the categories, add-ons and look of its type', async () => {
    const { owner } = await setUp()
    const { business, menu } = await owner.createBusiness({ ...kapeKanto, samples: false })
    expect(business).toEqual({
      id: 'id-1',
      slug: 'kape-kanto',
      name: 'Kape Kanto',
      tagline: '',
      types: ['coffee'],
      logo: null,
      phone: '',
      address: '',
      hours: '',
      social: { facebook: '', instagram: '', tiktok: '', website: '' },
      theme: PRESETS.coffee.theme,
      published: false,
    })
    expect(menu.categories.map(({ name, visible }) => ({ name, visible }))).toEqual(
      PRESETS.coffee.categories.map((name) => ({ name, visible: true })),
    )
    const groups = menu.groups.map(({ name, required, min, max, options }) => ({
      ...{ name, required, min, max },
      options: options.map(({ label, price }) => ({ label, price })),
    }))
    expect(groups).toEqual(PRESETS.coffee.groups)
    expect(menu.products).toEqual([])
    const ids = [...menu.categories, ...menu.groups, ...menu.groups.flatMap((group) => group.options)].map((item) => item.id)
    expect(ids.every((id) => MADE_ID.test(id))).toBe(true)
    expect(new Set([business.id, ...ids]).size).toBe(ids.length + 1)
    expect(await owner.getBusiness()).toEqual(business)
    expect(await owner.getMenu()).toEqual(menu)
  })

  it('fills the menu with the samples in their categories, with a size per preset size stepping up ₱20', async () => {
    const { menu } = await withCoffee()
    expect(names(menu.products)).toEqual(PRESETS.coffee.samples.map((sample) => sample.name))
    for (const sample of PRESETS.coffee.samples) {
      expect(productNamed(menu, sample.name)).toMatchObject({
        categoryId: idOf(menu.categories, sample.category),
        description: sample.description,
        price: sample.price,
        tags: sample.tags,
        available: true,
        image: null,
        groupIds: [],
      })
    }
    const americano = productNamed(menu, 'Americano')
    expect(americano.variants.map(({ label, price }) => [label, price])).toEqual([
      ['S', 12000],
      ['M', 14000],
      ['L', 16000],
    ])
    expect(americano.variants.every((variant) => MADE_ID.test(variant.id))).toBe(true)
  })

  it('leaves a sample that is marked as not sized, like the pastry on a coffee menu, with one price', async () => {
    const { menu } = await withCoffee()
    expect(productNamed(menu, 'Ensaymada').variants).toEqual([])
    expect(productNamed(menu, 'Ensaymada').price).toBe(8500)
  })

  it('gives the samples of a preset without sizes one price', async () => {
    const { owner } = await setUp()
    const { menu } = await owner.createBusiness({ name: 'Ihaw Ihaw', slug: 'ihaw-ihaw', types: ['casualDining'], samples: true })
    const prices = (list: readonly { name: string; price: number }[]) => Object.fromEntries(list.map(({ name, price }) => [name, price]))
    expect(prices(menu.products)).toEqual(prices(PRESETS.casualDining.samples))
    expect(menu.products.every((product) => product.variants.length === 0)).toBe(true)
  })

  it('merges a hybrid business: the setup of both types, the look of the first, each sample sized by its own preset', async () => {
    const { owner } = await setUp()
    const types: BusinessType[] = ['milkTea', 'coffee']
    const { business, menu } = await owner.createBusiness({ name: 'Kape at Tsaa', slug: 'kape-at-tsaa', types, samples: true })
    const merged = mergePresets(types)
    expect(business.theme).toEqual(PRESETS.milkTea.theme)
    expect(names(menu.categories)).toEqual(merged.categories)
    expect(names(menu.groups)).toEqual(merged.groups.map((group) => group.name))
    expect(menu.products).toHaveLength(merged.samples.length)
    const sizes = (name: string) => productNamed(menu, name).variants.map(({ label, price }) => [label, price])
    expect(sizes('Classic Pearl Milk Tea')).toEqual([
      ['M', 9900],
      ['L', 11900],
    ])
    expect(sizes('Americano')).toEqual([
      ['S', 12000],
      ['M', 14000],
      ['L', 16000],
    ])
  })

  it('keeps the products of each category together, in the order of the categories', async () => {
    const { owner } = await setUp()
    const { menu } = await owner.createBusiness({ name: 'Panaderia', slug: 'panaderia', types: ['bakery', 'coffee'], samples: true })
    const places = categoryPlaces(menu)
    expect(places).toEqual([...places].sort((a, b) => a - b))
    expect(places.every((place) => place >= 0)).toBe(true)
  })

  it.each([...BUSINESS_TYPES.map((type) => ({ types: [type] })), { types: [...BUSINESS_TYPES] }])(
    'sets up $types with samples the editors accept',
    async ({ types }) => {
      const { owner } = await setUp()
      const { menu } = await owner.createBusiness({ name: 'Test Business', slug: 'test-business', types, samples: true })
      expect(menu.products).toHaveLength(mergePresets(types).samples.length)
      for (const product of menu.products) expect(validateProductInput(product, menu)).toEqual({ ok: true, value: product })
    },
  )

  it('refuses a setup that does not pass, naming each field, and makes nothing', async () => {
    const { owner } = await setUp()
    const broken = { name: ' ', slug: 'Kape Kanto', types: [], samples: 'yes' } as unknown as NewBusinessInput
    expect(await refusal(owner.createBusiness(broken))).toEqual({
      code: 'invalid',
      fields: { name: 'required', slug: 'invalid', types: 'required', samples: 'invalid' },
    })
    const pizza = { ...kapeKanto, types: ['pizza'] } as unknown as NewBusinessInput
    expect(await refusal(owner.createBusiness(pizza))).toEqual({ code: 'invalid', fields: { types: 'invalid' } })
    expect(await refusal(owner.createBusiness({ ...kapeKanto, slug: 'admin' }))).toEqual({ code: 'invalid', fields: { slug: 'invalid' } })
    expect(await owner.getBusiness()).toBeNull()
  })

  it('refuses a second setup, so it cannot replace the menu', async () => {
    const { owner, menu } = await withCoffee()
    expect(await refusal(owner.createBusiness({ ...kapeKanto, slug: 'kape-kanto-two', samples: false }))).toEqual({
      code: 'invalid',
      fields: {},
    })
    expect(await owner.getMenu()).toEqual(menu)
    expect((await owner.getBusiness())?.slug).toBe('kape-kanto')
  })
})

describe('links (slugs)', () => {
  it('says where a link stands, before and after the setup', async () => {
    const { owner } = await setUp({ takenSlugs: ['brew-lab'] })
    expect(await owner.checkSlug('kape-kanto')).toBe('available')
    await owner.createBusiness(kapeKanto)
    expect(await owner.checkSlug('kape-kanto')).toBe('yours')
    expect(await owner.checkSlug('brew-lab')).toBe('taken')
    expect(await owner.checkSlug(DEMO_TAKEN_SLUGS[0] ?? '')).toBe('available')
    expect(await owner.checkSlug('admin')).toBe('reserved')
    for (const slug of ['', 'ab', 'Kape-Kanto', 'kape kanto', '-kape', 'kape--kanto', 'a'.repeat(41)]) {
      expect(await owner.checkSlug(slug)).toBe('invalid')
    }
  })

  it('treats the demo list as taken by default', async () => {
    const { owner } = await setUp()
    for (const slug of DEMO_TAKEN_SLUGS) {
      expect(isValidSlug(slug)).toBe(true)
      expect(await owner.checkSlug(slug)).toBe('taken')
    }
    expect(await refusal(owner.createBusiness({ ...kapeKanto, slug: 'cafe-luna' }))).toEqual({ code: 'slugTaken', fields: {} })
  })

  it('keeps a link to one business between two owners, and keeps it for that business after it changes the link', async () => {
    const { accounts, owner } = await setUp()
    await owner.createBusiness(kapeKanto)
    await accounts.logOut()
    await accounts.signUp(anotherOwner)
    expect(await owner.checkSlug('kape-kanto')).toBe('taken')
    expect(await refusal(owner.createBusiness({ ...kapeKanto, name: 'Tsaa Tayo' }))).toEqual({ code: 'slugTaken', fields: {} })
    await owner.createBusiness({ name: 'Tsaa Tayo', slug: 'tsaa-tayo', types: ['milkTea'], samples: false })
    expect(await refusal(owner.changeSlug('kape-kanto'))).toEqual({ code: 'slugTaken', fields: {} })

    await accounts.logOut()
    await accounts.logIn(testOwner)
    expect(await owner.checkSlug('tsaa-tayo')).toBe('taken')
    expect((await owner.changeSlug('kape-kanto-cebu')).slug).toBe('kape-kanto-cebu')

    // The old link is still the first business's: cards written with it must never open someone else's menu.
    await accounts.logOut()
    await accounts.logIn(anotherOwner)
    expect(await owner.checkSlug('kape-kanto')).toBe('taken')
    expect(await refusal(owner.changeSlug('kape-kanto'))).toEqual({ code: 'slugTaken', fields: {} })
    expect(await owner.checkSlug('kape-kanto-cebu')).toBe('taken')
  })

  it('lets a business go back to a link it had before, and then reserves the one it leaves', async () => {
    const { owner } = await withCoffee()
    await owner.changeSlug('kape-kanto-cebu')
    expect(await owner.checkSlug('kape-kanto')).toBe('available')
    expect((await owner.changeSlug('kape-kanto')).slug).toBe('kape-kanto')
    expect(await owner.checkSlug('kape-kanto')).toBe('yours')
    expect(await owner.checkSlug('kape-kanto-cebu')).toBe('available')
  })

  it('keeps every link a business ever had, not only the last one', async () => {
    const { accounts, owner } = await withCoffee()
    await owner.changeSlug('kape-one')
    await owner.changeSlug('kape-two')
    await accounts.logOut()
    await accounts.signUp(anotherOwner)
    for (const slug of ['kape-kanto', 'kape-one', 'kape-two']) expect(await owner.checkSlug(slug)).toBe('taken')
  })

  it('changes the link, and refuses one that is not valid with the code of the setup wizard', async () => {
    const { owner } = await withCoffee()
    const business = await owner.getBusiness()
    expect(await refusal(owner.changeSlug(''))).toEqual({ code: 'invalid', fields: { slug: 'required' } })
    expect(await refusal(owner.changeSlug('ab'))).toEqual({ code: 'invalid', fields: { slug: 'tooShort' } })
    expect(await refusal(owner.changeSlug('a'.repeat(41)))).toEqual({ code: 'invalid', fields: { slug: 'tooLong' } })
    expect(await refusal(owner.changeSlug('Kape Kanto'))).toEqual({ code: 'invalid', fields: { slug: 'invalid' } })
    expect(await refusal(owner.changeSlug('admin'))).toEqual({ code: 'invalid', fields: { slug: 'invalid' } })
    expect(await refusal(owner.changeSlug('la-bella'))).toEqual({ code: 'slugTaken', fields: {} })
    expect(await owner.changeSlug('kape-kanto')).toEqual(business)
    const moved = await owner.changeSlug('kape-kanto-cebu')
    expect(moved).toEqual({ ...business, slug: 'kape-kanto-cebu' })
    expect(await owner.getBusiness()).toEqual(moved)
  })
})

describe('the business', () => {
  it('saves the Design page fields cleaned, and keeps everything else', async () => {
    const { owner } = await withCoffee()
    const business = await owner.getBusiness()
    if (!business) throw new Error('No business')
    const saved = await owner.saveBusiness({
      name: '  Kape   Kanto Lahug ',
      tagline: 'Coffee on the corner',
      phone: '+63 917 555 0142',
      address: '12 Mabini Street, Cebu City',
      hours: 'Mon to Fri 7 to 9\n\n  Sat 8 to 10 ',
      social: { facebook: 'facebook.com/kapekanto', instagram: '', tiktok: '', website: '' },
      theme: { ...business.theme, primary: '#AA3300' },
    })
    expect(saved).toEqual({
      ...business,
      name: 'Kape Kanto Lahug',
      tagline: 'Coffee on the corner',
      phone: '+63 917 555 0142',
      address: '12 Mabini Street, Cebu City',
      hours: 'Mon to Fri 7 to 9\nSat 8 to 10',
      social: { facebook: 'https://facebook.com/kapekanto', instagram: '', tiktok: '', website: '' },
      theme: { ...business.theme, primary: '#aa3300' },
    })
    expect(await owner.getBusiness()).toEqual(saved)
    const logo = 'https://images.example.com/logo.png'
    expect(await owner.saveBusiness({ logo })).toEqual({ ...saved, logo })
  })

  it('ignores what the Design page does not change, such as the link and the publish switch', async () => {
    const { owner } = await withCoffee()
    const business = await owner.getBusiness()
    const patch = { name: 'Kape', slug: 'other-link', published: true, id: 'mine', types: ['bar'] } as BusinessPatch
    expect(await owner.saveBusiness(patch)).toEqual({ ...business, name: 'Kape' })
  })

  it('refuses Design page fields that do not pass, names them, and changes nothing', async () => {
    const { owner } = await withCoffee()
    const business = await owner.getBusiness()
    const patch: BusinessPatch = {
      name: '',
      phone: 'call me',
      logo: 'javascript:alert(1)',
      social: { facebook: 'https://evil.example/kapekanto', instagram: '', tiktok: '', website: '' },
    }
    expect(await refusal(owner.saveBusiness(patch))).toEqual({
      code: 'invalid',
      fields: { name: 'required', phone: 'invalid', logo: 'invalid', social: 'invalid' },
    })
    expect(await owner.getBusiness()).toEqual(business)
  })

  it('refuses a logo on an https host that is not the storage origin, and changes nothing', async () => {
    const { owner } = await withCoffee()
    const business = await owner.getBusiness()
    expect(await refusal(owner.saveBusiness({ logo: 'https://tracker.example.com/logo.png' }))).toEqual({ code: 'invalid', fields: { logo: 'invalid' } })
    expect(await owner.getBusiness()).toEqual(business)
  })

  it('refuses a page photo on an https host that is not the storage origin, exactly like the logo', async () => {
    const { owner } = await withCoffee()
    const business = await owner.getBusiness()
    if (business === null) throw new Error('the seeded business exists')
    const theme = { ...business.theme, backdrop: 'picture' as const, backdropPicture: 'https://tracker.example.com/bg.jpg' }
    expect(await refusal(owner.saveBusiness({ theme }))).toEqual({ code: 'invalid', fields: { theme: 'invalid' } })
    expect(await owner.getBusiness()).toEqual(business)
  })

  it('puts the menu on its link and takes it off', async () => {
    const { owner } = await withCoffee()
    expect((await owner.setPublished(true)).published).toBe(true)
    expect((await owner.getBusiness())?.published).toBe(true)
    expect((await owner.setPublished(false)).published).toBe(false)
    expect(await refusal(owner.setPublished('yes' as unknown as boolean))).toEqual({ code: 'invalid', fields: { published: 'invalid' } })
  })
})

describe('categories', () => {
  it('adds a category at the end and edits it in place', async () => {
    const { owner, menu } = await withCoffee()
    const added = await owner.saveCategory({ name: '  Cold   Brew ', visible: false })
    const cold = added.categories.at(-1)
    expect(cold).toEqual({ id: expect.stringMatching(MADE_ID), name: 'Cold Brew', visible: false })
    expect(added.categories.slice(0, -1)).toEqual(menu.categories)
    const edited = await owner.saveCategory({ id: cold?.id ?? '', name: 'Cold brews', visible: true })
    expect(edited.categories).toEqual([...menu.categories, { id: cold?.id, name: 'Cold brews', visible: true }])
    expect(edited.products).toEqual(menu.products)
  })

  it('refuses a category with an unknown id, a name another one has, or nothing usable', async () => {
    const { owner, menu } = await withCoffee()
    expect(await refusal(owner.saveCategory({ id: 'gone', name: 'Teas', visible: true }))).toEqual({ code: 'notFound', fields: {} })
    expect(await refusal(owner.saveCategory({ name: ' hot ', visible: true }))).toEqual({ code: 'invalid', fields: { name: 'duplicate' } })
    const broken = { name: ' ', visible: 'yes' } as unknown as CategoryInput
    expect(await refusal(owner.saveCategory(broken))).toEqual({ code: 'invalid', fields: { name: 'required', visible: 'invalid' } })
    expect(await owner.getMenu()).toEqual(menu)
  })

  it('moves a category one place, and its products move with it', async () => {
    const { owner, iced } = await withCoffee()
    const moved = await owner.moveCategory(iced, -1)
    expect(names(moved.categories)).toEqual(['Iced', 'Hot', 'Blended', 'Pastries'])
    expect(names(moved.products)).toEqual(['Iced Caramel Macchiato', 'Americano', 'Spanish Latte', 'Mocha Frappe', 'Ensaymada'])
    expect(await owner.moveCategory(iced, -1)).toEqual(moved)
    expect(await owner.moveCategory('gone', 1)).toEqual(moved)
    expect(await owner.getMenu()).toEqual(moved)
  })

  it('deletes a category with its products, and a second delete changes nothing', async () => {
    const { owner, hot } = await withCoffee()
    const menu = await owner.deleteCategory(hot)
    expect(names(menu.categories)).toEqual(['Iced', 'Blended', 'Pastries'])
    expect(names(menu.products)).toEqual(['Iced Caramel Macchiato', 'Mocha Frappe', 'Ensaymada'])
    expect(await owner.deleteCategory(hot)).toEqual(menu)
  })
})

describe('products', () => {
  it('adds a product at the end of its category, priced from its lowest size', async () => {
    const { owner, hot } = await withCoffee()
    const variants = [
      { label: 'M', price: 15500 },
      { label: 'S', price: 13500 },
    ]
    const menu = await owner.saveProduct(productInput({ categoryId: hot, price: 0, variants, tags: ['new'] }))
    expect(names(menu.products)).toEqual(['Americano', 'Spanish Latte', 'Flat White', 'Iced Caramel Macchiato', 'Mocha Frappe', 'Ensaymada'])
    expect(productNamed(menu, 'Flat White')).toEqual({
      id: expect.stringMatching(MADE_ID),
      categoryId: hot,
      name: 'Flat White',
      description: '',
      price: 13500,
      variants: variants.map((variant) => ({ id: expect.stringMatching(MADE_ID), ...variant })),
      tags: ['new'],
      available: true,
      image: null,
      groupIds: [],
    })
  })

  it('edits a product in place, keeping the ids of its sizes and giving new ids to the rest', async () => {
    const { owner, menu } = await withCoffee()
    const latte = productNamed(menu, 'Spanish Latte')
    const [small, medium] = latte.variants
    const edited = await owner.saveProduct({
      ...latte,
      name: 'Spanish Latte, hot',
      variants: [
        { id: small?.id ?? '', label: 'S', price: 15000 },
        { id: 'made-up', label: 'XL', price: 25000 },
        { label: 'M', price: 18000 },
      ],
    })
    expect(names(edited.products)[1]).toBe('Spanish Latte, hot')
    const saved = productNamed(edited, 'Spanish Latte, hot')
    expect(saved.id).toBe(latte.id)
    expect(saved.price).toBe(15000)
    const [keptSmall, extraLarge, newMedium] = saved.variants
    expect(keptSmall?.id).toBe(small?.id)
    expect(extraLarge?.id).toMatch(MADE_ID)
    expect(newMedium?.id).toMatch(MADE_ID)
    expect(newMedium?.id).not.toBe(medium?.id)
    expect(new Set(saved.variants.map((variant) => variant.id)).size).toBe(3)
  })

  it('moves a product to the end of its new category when its category changes', async () => {
    const { owner, menu, iced } = await withCoffee()
    const moved = await owner.saveProduct({ ...productNamed(menu, 'Americano'), categoryId: iced })
    expect(names(moved.products)).toEqual(['Spanish Latte', 'Iced Caramel Macchiato', 'Americano', 'Mocha Frappe', 'Ensaymada'])
    expect(productNamed(moved, 'Americano').categoryId).toBe(iced)
  })

  it('moves a product only among the products of its category', async () => {
    const { owner, menu } = await withCoffee()
    const latte = productNamed(menu, 'Spanish Latte').id
    const moved = await owner.moveProduct(latte, -1)
    expect(names(moved.products)).toEqual(['Spanish Latte', 'Americano', 'Iced Caramel Macchiato', 'Mocha Frappe', 'Ensaymada'])
    expect(await owner.moveProduct(latte, -1)).toEqual(moved)
    expect(await owner.moveProduct(productNamed(menu, 'Iced Caramel Macchiato').id, -1)).toEqual(moved)
    expect(await owner.moveProduct('gone', 1)).toEqual(moved)
  })

  it('refuses a product with an unknown id, category or add-on group, naming the fields', async () => {
    const { owner, menu, hot } = await withCoffee()
    expect(await refusal(owner.saveProduct(productInput({ id: 'gone', categoryId: hot })))).toEqual({ code: 'notFound', fields: {} })
    const broken = productInput({
      categoryId: 'gone',
      name: '',
      price: -1,
      tags: ['tasty' as ProductTag],
      groupIds: ['gone'],
      image: 'http://images.example.com/a.png',
    })
    expect(await refusal(owner.saveProduct(broken))).toEqual({
      code: 'invalid',
      fields: { categoryId: 'invalid', name: 'required', price: 'range', tags: 'invalid', groupIds: 'invalid', image: 'invalid' },
    })
    const sameSizes = [
      { label: 'S', price: 100 },
      { label: 's', price: 200 },
    ]
    expect(await refusal(owner.saveProduct(productInput({ categoryId: hot, variants: sameSizes })))).toEqual({
      code: 'invalid',
      fields: { variants: 'duplicate' },
    })
    expect(await owner.getMenu()).toEqual(menu)
  })

  it('keeps a picture from the storage origin and refuses an https picture from any other host', async () => {
    const { owner, menu, hot } = await withCoffee()
    const kept = await owner.saveProduct(productInput({ categoryId: hot, name: 'Mocha', image: 'https://images.example.com/mocha.webp' }))
    expect(kept.products.find((product) => product.name === 'Mocha')?.image).toBe('https://images.example.com/mocha.webp')

    const before = await owner.getMenu()
    expect(await refusal(owner.saveProduct(productInput({ categoryId: hot, name: 'Tracker', image: 'https://tracker.example.com/p.gif' })))).toEqual({
      code: 'invalid',
      fields: { image: 'invalid' },
    })
    expect(await owner.getMenu()).toEqual(before)
    expect(menu.products.length).toBeLessThan(before.products.length)
  })

  it('marks a product sold out and back, changing nothing else', async () => {
    const { owner, menu } = await withCoffee()
    const latte = productNamed(menu, 'Spanish Latte')
    const soldOut = await owner.setAvailable(latte.id, false)
    expect(soldOut).toEqual({ ...menu, products: menu.products.map((p) => (p.id === latte.id ? { ...p, available: false } : p)) })
    expect(await owner.setAvailable(latte.id, true)).toEqual(menu)
    expect(await refusal(owner.setAvailable('gone', false))).toEqual({ code: 'notFound', fields: {} })
    expect(await refusal(owner.setAvailable(latte.id, 'no' as unknown as boolean))).toEqual({
      code: 'invalid',
      fields: { available: 'invalid' },
    })
  })

  it('deletes a product, and a second delete changes nothing', async () => {
    const { owner, menu } = await withCoffee()
    const latte = productNamed(menu, 'Spanish Latte').id
    const after = await owner.deleteProduct(latte)
    expect(names(after.products)).toEqual(['Americano', 'Iced Caramel Macchiato', 'Mocha Frappe', 'Ensaymada'])
    expect(await owner.deleteProduct(latte)).toEqual(after)
  })
})

describe('add-on groups', () => {
  it('adds a group at the end, edits it keeping the ids of its options, and moves it', async () => {
    const { owner } = await withCoffee()
    const options = [
      { label: 'Less sweet', price: 0 },
      { label: 'Regular', price: 0 },
    ]
    const added = await owner.saveGroup({ name: 'Sweetness', required: true, min: 1, max: 1, options })
    const sweetness = added.groups.at(-1)
    if (!sweetness) throw new Error('No group')
    expect(sweetness).toEqual({
      id: expect.stringMatching(MADE_ID),
      name: 'Sweetness',
      required: true,
      min: 1,
      max: 1,
      options: options.map((option) => ({ id: expect.stringMatching(MADE_ID), ...option })),
    })
    const [less] = sweetness.options
    const edited = await owner.saveGroup({
      ...sweetness,
      max: 2,
      options: [
        { id: less?.id ?? '', label: 'Less sweet', price: 0 },
        { label: 'Extra sweet', price: 1000 },
      ],
    })
    expect(edited.groups.at(-1)?.options.map((option) => [option.id === less?.id, option.label])).toEqual([
      [true, 'Less sweet'],
      [false, 'Extra sweet'],
    ])
    const moved = await owner.moveGroup(sweetness.id, -1)
    expect(names(moved.groups)).toEqual(['Extra shot', 'Syrups', 'Sweetness', 'Milk alternatives'])
  })

  it('refuses a group that does not pass, or one with an unknown id', async () => {
    const { owner, menu } = await withCoffee()
    expect(await refusal(owner.saveGroup({ name: 'syrups', required: true, min: 0, max: 3, options: [] }))).toEqual({
      code: 'invalid',
      fields: { name: 'duplicate', options: 'required', min: 'invalid' },
    })
    const group = { id: 'gone', name: 'Cups', required: false, min: 0, max: 1, options: [{ label: 'Own cup', price: 0 }] }
    expect(await refusal(owner.saveGroup(group))).toEqual({ code: 'notFound', fields: {} })
    expect(await owner.getMenu()).toEqual(menu)
  })

  it('deletes a group and takes it off every product that offered it', async () => {
    const { owner, menu } = await withCoffee()
    const syrups = idOf(menu.groups, 'Syrups')
    const milk = idOf(menu.groups, 'Milk alternatives')
    await owner.saveProduct({ ...productNamed(menu, 'Americano'), groupIds: [syrups, milk] })
    await owner.saveProduct({ ...productNamed(menu, 'Spanish Latte'), groupIds: [syrups] })
    const after = await owner.deleteGroup(syrups)
    expect(names(after.groups)).toEqual(['Extra shot', 'Milk alternatives'])
    expect(productNamed(after, 'Americano').groupIds).toEqual([milk])
    expect(productNamed(after, 'Spanish Latte').groupIds).toEqual([])
    expect(await owner.deleteGroup(syrups)).toEqual(after)
  })
})

describe('owners and copies', () => {
  it('keeps the business and menu of each owner apart', async () => {
    const { accounts, owner } = await setUp()
    const first = await owner.createBusiness(kapeKanto)
    await accounts.logOut()
    await accounts.signUp(anotherOwner)
    expect(await owner.getBusiness()).toBeNull()
    expect(await refusal(owner.getMenu())).toEqual({ code: 'notFound', fields: {} })
    const second = await owner.createBusiness({ name: 'Tsaa Tayo', slug: 'tsaa-tayo', types: ['milkTea'], samples: true })
    await owner.saveCategory({ name: 'Seasonal', visible: true })
    await owner.setPublished(true)

    await accounts.logOut()
    await accounts.logIn(testOwner)
    expect(await owner.getBusiness()).toEqual(first.business)
    expect(await owner.getMenu()).toEqual(first.menu)
    expect(second.business.id).not.toBe(first.business.id)
  })

  it('hands out copies: changing what a call gave back, or what was sent, changes nothing stored', async () => {
    const { owner } = await setUp()
    const created = await owner.createBusiness(kapeKanto)
    const business = structuredClone(created.business)
    const menu = structuredClone(created.menu)
    created.business.social.facebook = 'https://facebook.com/someone-else'
    created.menu.products.length = 0

    const read = await owner.getBusiness()
    if (read) read.theme.primary = '#000000'
    const readMenu = await owner.getMenu()
    readMenu.categories.reverse()
    const firstVariant = readMenu.products[0]?.variants[0]
    if (firstVariant) firstVariant.price = 1

    const input = { name: 'Seasonal', visible: true }
    const saved = await owner.saveCategory(input)
    input.name = 'Changed later'
    saved.groups.pop()
    const savedBusiness = await owner.setPublished(false)
    savedBusiness.name = 'Changed'

    expect(await owner.getBusiness()).toEqual(business)
    expect(await owner.getMenu()).toEqual({ ...menu, categories: [...menu.categories, { id: expect.stringMatching(MADE_ID), name: 'Seasonal', visible: true }] })
  })
})

describe('uploadImage', () => {
  const base64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))

  it.each(['png', 'jpeg', 'webp'] as const)('takes a %s picture and gives back a data URL of its bytes', async (kind) => {
    const { owner } = await setUp()
    const file = sampleImageFile(kind)
    const bytes = new Uint8Array(await file.arrayBuffer())
    expect(await owner.uploadImage(file)).toBe(`data:image/${kind};base64,${base64(bytes)}`)
  })

  it('reads the kind of picture from its bytes, never from its name or declared type', async () => {
    const { owner } = await setUp()
    expect(await owner.uploadImage(sampleImageFile('jpeg', { name: 'photo.png', type: 'image/png' }))).toMatch(/^data:image\/jpeg;base64,/)
    expect(await owner.uploadImage(sampleImageFile('png', { name: 'logo', type: '' }))).toMatch(/^data:image\/png;base64,/)
    expect(await owner.uploadImage(sampleImageFile('webp', { name: 'menu.svg', type: 'image/svg+xml' }))).toMatch(/^data:image\/webp;base64,/)
  })

  it('refuses a text file named .png, an SVG, an empty file and something that is not a file', async () => {
    const { owner } = await setUp()
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    const files = [
      new File(['just some words'], 'photo.png', { type: 'image/png' }),
      new File([svg], 'logo.svg', { type: 'image/svg+xml' }),
      new File([svg], 'logo.png', { type: 'image/png' }),
      new File([], 'empty.png', { type: 'image/png' }),
      'data:image/png;base64,iVBORw0KGgo=' as unknown as File,
    ]
    for (const file of files) expect(await refusal(owner.uploadImage(file))).toEqual({ code: 'unsupported', fields: {} })
  })

  it('refuses a picture over 4 MB as too large', async () => {
    const { owner } = await setUp()
    const big = sampleImageFile('jpeg', { size: IMAGE_MAX_BYTES + 1 })
    expect(big.size).toBe(IMAGE_MAX_BYTES + 1)
    expect(await refusal(owner.uploadImage(big))).toEqual({ code: 'tooLarge', fields: {} })
  })

  it('gives back an address the product editor and the logo field take as it is', async () => {
    const { owner, menu } = await withCoffee()
    const url = await owner.uploadImage(sampleImageFile('webp'))
    const saved = await owner.saveProduct({ ...productNamed(menu, 'Americano'), image: url })
    expect(productNamed(saved, 'Americano').image).toBe(url)
    expect((await owner.saveBusiness({ logo: url })).logo).toBe(url)
  })
})

describe('insights', () => {
  async function insightsOf(slug: string, now = NOW, types: BusinessType[] = ['coffee']) {
    const { owner } = await setUp({ now: () => now })
    await owner.createBusiness({ name: 'Test Business', slug, types, samples: true })
    return owner.insights()
  }

  it('gives two weeks of sample numbers ending today in Manila, with fewer taps than views', async () => {
    // 01:00 on 21 October in Manila, still 20 October in UTC.
    const insights = await insightsOf('kape-kanto', Date.parse('2026-10-20T17:00:00Z'))
    expect(insights.demo).toBe(true)
    expect(insights.days).toHaveLength(14)
    expect(insights.days[0]?.date).toBe('2026-10-08')
    expect(insights.days[13]?.date).toBe('2026-10-21')
    insights.days.forEach((day, i) => {
      expect(Date.parse(day.date) - Date.parse('2026-10-08')).toBe(i * DAY)
      expect(Number.isInteger(day.views) && Number.isInteger(day.taps)).toBe(true)
      expect(day.taps).toBeGreaterThanOrEqual(0)
      expect(day.taps).toBeLessThan(day.views)
    })
  })

  it('gives the same numbers for the same link, and other numbers for another link', async () => {
    expect(await insightsOf('kape-kanto')).toEqual(await insightsOf('kape-kanto'))
    expect((await insightsOf('tsaa-tayo')).days).not.toEqual((await insightsOf('kape-kanto')).days)
  })

  it('keeps the numbers of a day as the two weeks move on', async () => {
    const today = await insightsOf('kape-kanto')
    const tomorrow = await insightsOf('kape-kanto', NOW + DAY)
    expect(tomorrow.days.slice(0, 13)).toEqual(today.days.slice(1))
  })

  it('names up to five items of the menu, most viewed first, and none for a menu without products', async () => {
    const { owner } = await setUp()
    await owner.createBusiness({ ...kapeKanto, types: ['coffee', 'milkTea'] })
    const { topItems } = await owner.insights()
    const menuNames = names((await owner.getMenu()).products)
    expect(topItems).toHaveLength(5)
    expect(new Set(topItems.map((item) => item.name)).size).toBe(5)
    expect(topItems.every((item) => menuNames.includes(item.name))).toBe(true)
    topItems.slice(1).forEach((item, i) => expect(item.views).toBeLessThan(topItems[i]?.views ?? 0))

    const { owner: empty } = await setUp()
    await empty.createBusiness({ ...kapeKanto, samples: false })
    expect((await empty.insights()).topItems).toEqual([])
  })
})

describe('the owner fixtures', () => {
  it('are what the editors would store as they are', () => {
    const business = sampleBusiness()
    const { name, tagline, logo, phone, address, hours, social, theme } = business
    const editable = { name, tagline, logo, phone, address, hours, social, theme }
    expect(validateBusinessPatch(editable)).toEqual({ ok: true, value: editable })
    expect(validateNewBusiness({ name, slug: business.slug, types: business.types, samples: false }).ok).toBe(true)

    const menu = sampleMenu()
    for (const category of menu.categories) expect(validateCategoryInput(category, menu.categories)).toEqual({ ok: true, value: category })
    for (const group of menu.groups) expect(validateGroupInput(group, menu.groups)).toEqual({ ok: true, value: group })
    for (const product of menu.products) expect(validateProductInput(product, menu)).toEqual({ ok: true, value: product })
    expect(categoryPlaces(menu)).toEqual([0, 0, 1, 1])
  })

  it('are fresh on every call and take overrides', () => {
    const menu = sampleMenu()
    const firstVariant = menu.products[0]?.variants[0]
    if (firstVariant) firstVariant.price = 1
    expect(sampleMenu().products[0]?.variants[0]?.price).toBe(12000)
    expect(sampleMenu({ groups: [] }).groups).toEqual([])
    expect(sampleBusiness({ published: true }).published).toBe(true)
    expect(sampleImageFile('png', { size: 1000 }).size).toBe(1000)
  })
})
