import { useCallback, useMemo } from 'react'
import { owner as defaultOwner } from '@/data/owner'
import { ownerDemo, type OwnerRepository } from '@/data/ownerRepository'
import { accessOf, isMenuLive, nextAccessChange } from '@/entities/account/subscription'
import type { Business } from '@/entities/business/business'
import type { Menu } from '@/entities/menu/menu'
import { useResource } from '@/shared/hooks/useResource'
import { useTimeAt } from '@/shared/hooks/useTimeAt'
import { useSession } from '@/shared/session/context'
import type { DashboardData, OwnerActions } from './dashboardData'
import { useAccount, type Repositories } from './useAccount'
import { watchOwner } from './watchOwner'

type Loaded = { business: Business | null; menu: Menu }

const EMPTY_MENU: Menu = { categories: [], products: [], groups: [] }
const MINUTE = 60_000

export type Options = Repositories & {
  owner?: OwnerRepository
  /** "Now" in ms, for tests. */
  now?: () => number
}

/**
 * Loads the owner's business, menu and plan once and keeps them current: every action calls the repository and puts its
 * answer (the new whole menu or business) in place. The pages share this through DashboardProvider.
 */
export function useOwnerData({ owner: repository = defaultOwner, now = Date.now, ...repositories }: Options = {}): DashboardData {
  // A refusal because the session ended signs the owner out here too (watchOwner).
  const { logOut } = useSession()
  const owner = useMemo(() => watchOwner(repository, () => void logOut()), [repository, logOut])

  const load = useCallback(async (): Promise<Loaded> => {
    const business = await owner.getBusiness()
    return { business, menu: business ? await owner.getMenu() : EMPTY_MENU }
  }, [owner])
  const { resource, retry, replace, retrying } = useResource(load)
  const account = useAccount(repositories)

  const actions = useMemo<OwnerActions>(() => {
    // Every reply is the whole menu or the whole business as the server held it. Calls are numbered per part in the order
    // they were sent, and a reply older than one already in place is dropped: a slow first answer must not undo a second.
    // The menu and the business count apart, so a business reply never drops a menu reply. The merge runs on the newest
    // state (replace with a function), so two replies that land before a render both stay.
    const issued = { menu: 0, business: 0 }
    const applied = { menu: 0, business: 0 }
    async function settle<K extends keyof typeof issued>(key: K, call: () => Promise<Loaded[K]>) {
      const version = ++issued[key]
      const value = await call()
      if (version < applied[key]) return
      applied[key] = version
      replace((current) => ({ ...current, [key]: value }))
    }
    const putMenu = (call: () => Promise<Menu>) => settle('menu', call)
    const putBusiness = (call: () => Promise<Business>) => settle('business', call)
    return {
      createBusiness: async (input) => {
        const created = await owner.createBusiness(input)
        replace(created)
      },
      saveBusiness: (patch) => putBusiness(() => owner.saveBusiness(patch)),
      checkSlug: (slug) => owner.checkSlug(slug),
      changeSlug: (slug) => putBusiness(() => owner.changeSlug(slug)),
      setPublished: (published) => putBusiness(() => owner.setPublished(published)),
      saveCategory: (input) => putMenu(() => owner.saveCategory(input)),
      moveCategory: (id, delta) => putMenu(() => owner.moveCategory(id, delta)),
      deleteCategory: (id) => putMenu(() => owner.deleteCategory(id)),
      saveProduct: (input) => putMenu(() => owner.saveProduct(input)),
      moveProduct: (id, delta) => putMenu(() => owner.moveProduct(id, delta)),
      deleteProduct: (id) => putMenu(() => owner.deleteProduct(id)),
      setAvailable: (id, available) => putMenu(() => owner.setAvailable(id, available)),
      saveGroup: (input) => putMenu(() => owner.saveGroup(input)),
      moveGroup: (id, delta) => putMenu(() => owner.moveGroup(id, delta)),
      deleteGroup: (id) => putMenu(() => owner.deleteGroup(id)),
      uploadImage: (file) => owner.uploadImage(file),
      loadInsights: () => owner.insights(),
    }
  }, [owner, replace])

  const loaded = resource.status === 'ready' ? resource.value : null
  // Rounded up, never down: a trial that started a moment ago must not read as eight days when it has seven.
  const time = Math.ceil(now() / MINUTE) * MINUTE
  const subscription = account.resource.status === 'ready' ? account.resource.value.subscription : null
  const access = subscription ? accessOf(subscription, time) : null
  const business = loaded?.business ?? null

  // A trial or plan can end while the page stays open: render again at the next moment its state or its day count changes.
  useTimeAt(subscription ? nextAccessChange(subscription, time) : null, now)

  return {
    loading: resource.status === 'loading',
    failed: resource.status === 'error',
    retrying,
    retry,
    demo: ownerDemo,
    now: time,
    business,
    menu: loaded?.menu ?? EMPTY_MENU,
    account,
    access,
    live: Boolean(business?.published && subscription && isMenuLive(subscription, time)),
    actions,
  }
}
