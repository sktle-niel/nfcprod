import { isTrustedPicture } from '@/config/pictures'
import type { Business } from '@/entities/business/business'
import { isValidSlug, slugProblem, SLUG_MAX, SLUG_MIN } from '@/entities/business/slug'
import { validateBusinessPatch, validateNewBusiness } from '@/entities/business/validate'
import { checkImage, checkImageAddress, IMAGE_HEAD_BYTES, sniffImageType } from '@/entities/menu/image'
import type { Menu } from '@/entities/menu/menu'
import { moveCategory, moveGroup, moveProduct, removeCategory, removeGroup } from '@/entities/menu/operations'
import { mergePresets } from '@/presets'
import type { ErrorCode } from '@/shared/lib/validation'
import { auth, type AuthRepository } from './auth'
import { sampleInsights } from './ownerInsights'
import { arrange, invalid, markAvailable, putCategory, putGroup, putProduct, startMenu } from './ownerMenu'
import { OwnerError, type OwnerRepository } from './ownerRepository'

/** Links the demo treats as other businesses', so the setup wizard and the Share page can show "taken". */
export const DEMO_TAKEN_SLUGS: readonly string[] = ['cafe-luna', 'kapehan-ni-ana', 'la-bella', 'bean-there', 'tea-hub']

/** The code the setup wizard gives a refused slug, so the Share page can use the same words. */
function slugError(slug: unknown): ErrorCode {
  if (slug === '') return 'required'
  if (typeof slug !== 'string') return 'invalid'
  if (slug.length < SLUG_MIN) return 'tooShort'
  return slug.length > SLUG_MAX ? 'tooLong' : 'invalid'
}

// A file that cannot be read (moved or deleted after it was picked) is no picture we can use: 'unsupported'.
async function readHead(file: Blob): Promise<Uint8Array> {
  try {
    return new Uint8Array(await file.slice(0, IMAGE_HEAD_BYTES).arrayBuffer())
  } catch {
    throw new OwnerError('unsupported')
  }
}

function readDataUrl(file: Blob): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new OwnerError('unsupported'))
    reader.readAsDataURL(file)
  })
}

/** The picture as a data URL of the type its first bytes show. Its name and declared type are never read. */
async function readPicture(file: unknown): Promise<string> {
  if (!(file instanceof Blob)) throw new OwnerError('unsupported')
  const head = await readHead(file)
  const verdict = checkImage({ size: file.size, head })
  if (verdict !== 'ok') throw new OwnerError(verdict)
  const dataUrl = await readDataUrl(file)
  // The reader labels the data with the declared type, so the label is replaced by the type the bytes show.
  const body = typeof dataUrl === 'string' ? dataUrl.slice(dataUrl.indexOf(',') + 1) : ''
  const address = checkImageAddress(`data:${sniffImageType(head) ?? ''};base64,${body}`)
  if (!address.ok || address.value === null) throw new OwnerError('unsupported')
  return address.value
}

type Options = { delay?: number; now?: () => number; newId?: () => string; takenSlugs?: readonly string[] }
/** `formerSlugs`: links this business used before. They stay its own, so a card written with one never opens another business. */
type Store = { business: Business; menu: Menu; formerSlugs: string[] }

/**
 * Demo mode: each owner's business and menu live in this tab's memory and are gone after a reload. Every value goes in
 * through the editors' validators and comes out as a copy, so a screen can never change what is stored by accident.
 * Calls need a session ('signedOut'); all but getBusiness, createBusiness, checkSlug and uploadImage need the business
 * too ('notFound'). A move or a delete of something that is gone changes nothing.
 */
export function createMockOwner(accounts: AuthRepository = auth, options: Options = {}): OwnerRepository {
  const { delay = 300, now = Date.now, newId = () => crypto.randomUUID(), takenSlugs = DEMO_TAKEN_SLUGS } = options
  const stores = new Map<string, Store>()
  const wait = () => new Promise((resolve) => setTimeout(resolve, delay))

  /** The signed-in account, after the wait every call has. */
  async function signedIn(): Promise<string> {
    await wait()
    const session = await accounts.current()
    if (!session) throw new OwnerError('signedOut')
    return session.account.id
  }

  function storeOf(ownerId: string): Store {
    const store = stores.get(ownerId)
    if (!store) throw new OwnerError('notFound')
    return store
  }

  function isTaken(slug: string, ownerId: string): boolean {
    return (
      takenSlugs.includes(slug) ||
      [...stores].some(([id, store]) => id !== ownerId && (store.business.slug === slug || store.formerSlugs.includes(slug)))
    )
  }

  // A change reads and writes the store with no wait in between, so two calls in flight cannot undo each other.
  async function changeBusiness(edit: (business: Business, ownerId: string) => Business): Promise<Business> {
    const id = await signedIn()
    const store = storeOf(id)
    const business = edit(store.business, id)
    stores.set(id, { ...store, business })
    return structuredClone(business)
  }

  async function changeMenu(edit: (menu: Menu) => Menu): Promise<Menu> {
    const id = await signedIn()
    const store = storeOf(id)
    const menu = arrange(edit(store.menu))
    stores.set(id, { ...store, menu })
    return structuredClone(menu)
  }

  return {
    async getBusiness() {
      const store = stores.get(await signedIn())
      return store ? structuredClone(store.business) : null
    },
    async createBusiness(input) {
      const id = await signedIn()
      // One business per account: a second setup is refused, so it can never wipe a menu.
      if (stores.has(id)) throw new OwnerError('invalid')
      const checked = validateNewBusiness(input)
      if (!checked.ok) throw invalid(checked.errors)
      const { name, slug, types, samples } = checked.value
      if (isTaken(slug, id)) throw new OwnerError('slugTaken')
      const preset = mergePresets(types)
      const business: Business = {
        id: newId(),
        slug,
        name,
        tagline: '',
        types,
        logo: null,
        phone: '',
        address: '',
        hours: '',
        social: { facebook: '', instagram: '', tiktok: '', website: '' },
        theme: preset.theme,
        published: false,
      }
      const store: Store = { business, menu: startMenu(preset, samples, newId), formerSlugs: [] }
      stores.set(id, store)
      return structuredClone({ business: store.business, menu: store.menu })
    },
    saveBusiness: (patch) =>
      changeBusiness((business) => {
        const checked = validateBusinessPatch(patch)
        if (!checked.ok) throw invalid(checked.errors)
        // The server only keeps pictures from its own storage. The mock keeps the same rule.
        const { logo } = checked.value
        if (typeof logo === 'string' && !isTrustedPicture(logo)) throw invalid({ logo: 'invalid' })
        return { ...business, ...checked.value }
      }),
    async checkSlug(slug) {
      const id = await signedIn()
      const problem = slugProblem(slug)
      if (problem !== null) return problem
      if (stores.get(id)?.business.slug === slug) return 'yours'
      return isTaken(slug, id) ? 'taken' : 'available'
    },
    async changeSlug(slug) {
      const id = await signedIn()
      const store = storeOf(id)
      if (!isValidSlug(slug)) throw new OwnerError('invalid', { slug: slugError(slug) })
      if (slug === store.business.slug) return structuredClone(store.business)
      if (isTaken(slug, id)) throw new OwnerError('slugTaken')
      // The old link stays reserved for this business, so a card or a QR code written with it can never open someone else's
      // menu. Going back to a former link is allowed and takes it off the list.
      const formerSlugs = [...store.formerSlugs.filter((former) => former !== slug), store.business.slug]
      const business = { ...store.business, slug }
      stores.set(id, { ...store, business, formerSlugs })
      return structuredClone(business)
    },
    setPublished: (published) =>
      changeBusiness((business) => {
        if (typeof published !== 'boolean') throw new OwnerError('invalid', { published: 'invalid' })
        return { ...business, published }
      }),

    async getMenu() {
      return structuredClone(storeOf(await signedIn()).menu)
    },
    saveCategory: (input) => changeMenu((menu) => putCategory(menu, input, newId)),
    moveCategory: (id, delta) => changeMenu((menu) => moveCategory(menu, id, delta)),
    deleteCategory: (id) => changeMenu((menu) => removeCategory(menu, id)),
    saveProduct: (input) => changeMenu((menu) => putProduct(menu, input, newId)),
    moveProduct: (id, delta) => changeMenu((menu) => moveProduct(menu, id, delta)),
    deleteProduct: (id) => changeMenu((menu) => ({ ...menu, products: menu.products.filter((product) => product.id !== id) })),
    setAvailable: (id, available) => changeMenu((menu) => markAvailable(menu, id, available)),
    saveGroup: (input) => changeMenu((menu) => putGroup(menu, input, newId)),
    moveGroup: (id, delta) => changeMenu((menu) => moveGroup(menu, id, delta)),
    deleteGroup: (id) => changeMenu((menu) => removeGroup(menu, id)),

    async uploadImage(file) {
      await signedIn()
      return readPicture(file)
    },
    async insights() {
      const { business, menu } = storeOf(await signedIn())
      return sampleInsights(business.slug, menu.products, now())
    },
  }
}

export const owner: OwnerRepository = createMockOwner()
