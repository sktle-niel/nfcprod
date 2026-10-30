import { render, screen, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { createMemoryRouter, type RouteObject } from 'react-router-dom'
import { expect } from 'vitest'
import { dashboardRoutes } from '@/app/dashboardRoutes'
import { dashboardCopy } from '@/config/dashboardCopy'
import { createMockAuth, type AuthRepository } from '@/data/auth'
import { createMockBilling, type BillingRepository } from '@/data/billing'
import { createMockOwner } from '@/data/owner'
import type { OwnerRepository } from '@/data/ownerRepository'
import { createMockPricing, type PricingRepository } from '@/data/pricing'
import type { NewBusinessInput } from '@/entities/business/business'
import type { Menu } from '@/entities/menu/menu'
import { DashboardProvider } from '@/features/dashboard/DashboardProvider'
import { RequireBusiness } from '@/features/dashboard/RequireBusiness'
import { testOwner } from './auth'
import { DashboardFrame, WentTo } from './DashboardFrame'
import { sampleBusiness, sampleMenu } from './ownerFixtures'

/*
 * Tests of the owner dashboard run against the real mock repositories (owner, billing, pricing, auth) with no delay, so
 * a page is tested through the same calls it makes in the browser. A signed-in owner is made first, then seeded:
 *
 * - `business`: by default "Kape Kanto" (coffee shop) with the details of `sampleBusiness()` filled in. `false` is an
 *   owner who has not been through the setup wizard.
 * - `menu`: 'sample' (default) puts `sampleMenu()` in (Hot and Iced, four products, a Milk add-on group), found by name,
 *   because the repository makes its own ids. 'preset' keeps what the coffee preset starts with: categories and add-ons, no items.
 * - `details`: false leaves the contact details, hours, links and tagline empty.
 * - `look`: 'sample' (default) gives the business the look of `sampleBusiness()` (a cream page, brown accent, Urbanist, grid, light), so the
 *   tests do not move when a preset's look is tuned. 'preset' keeps the look its business types start with.
 * - `published`: true publishes the menu.
 * - `plan`: 'trial' (default, day 1 of 7), 'active' (a monthly plan) or 'ended' (the trial is over).
 * - `startedAt` and `at`: the clock the trial starts on and the clock the dashboard reads, in ms (both default to `NOW`).
 * - `seed`: more setup through the repository, after the above.
 * - `wrapOwner`: gives the provider a repository built from the real one, to make a call fail or to count calls.
 *
 * `renderDashboardPage(<Page />, '/dashboard/menu')` mounts one page the way the router does (behind RequireBusiness unless
 * `guard: false`). `renderDashboardApp('/dashboard/menu')` mounts the whole route tree with the shell and the real pages.
 * Another route shows "Went to <path>", so a redirect can be asserted.
 */

/** Day 1 of the owner's trial. */
export const NOW = Date.parse('2026-10-19T02:00:00Z')
const DAY = 86_400_000

export type DashboardOptions = {
  business?: false | Partial<NewBusinessInput>
  menu?: 'sample' | 'preset'
  details?: boolean
  look?: 'sample' | 'preset'
  published?: boolean
  plan?: 'trial' | 'active' | 'ended'
  startedAt?: number
  at?: number
  seed?: (owner: OwnerRepository) => Promise<void>
  wrapOwner?: (real: OwnerRepository) => OwnerRepository
}

export type DashboardHarness = {
  user: UserEvent
  owner: OwnerRepository
  auth: AuthRepository
  billing: BillingRepository
  pricing: PricingRepository
  /** What the dashboard thinks "now" is. */
  now: number
  router: ReturnType<typeof createMemoryRouter>
}

/**
 * Puts `sampleMenu()` into the owner's menu in place of what it has, by names (the repository makes its own ids).
 * Returns the new menu.
 */
export async function loadSampleMenu(owner: OwnerRepository): Promise<Menu> {
  let menu = await owner.getMenu()
  for (const category of menu.categories) menu = await owner.deleteCategory(category.id)
  for (const group of menu.groups) menu = await owner.deleteGroup(group.id)

  const sample = sampleMenu()
  const groupIds = new Map<string, string>()
  for (const group of sample.groups) {
    const { id, ...fields } = group
    menu = await owner.saveGroup({ ...fields, options: fields.options.map(({ label, price }) => ({ label, price })) })
    const made = menu.groups.find((candidate) => candidate.name === group.name)
    if (!made) throw new Error(`The sample group ${group.name} was not saved`)
    groupIds.set(id, made.id)
  }
  const categoryIds = new Map<string, string>()
  for (const category of sample.categories) {
    menu = await owner.saveCategory({ name: category.name, visible: category.visible })
    const made = menu.categories.find((candidate) => candidate.name === category.name)
    if (!made) throw new Error(`The sample category ${category.name} was not saved`)
    categoryIds.set(category.id, made.id)
  }
  for (const product of sample.products) {
    const categoryId = categoryIds.get(product.categoryId)
    if (!categoryId) throw new Error(`The sample product ${product.name} has no category`)
    menu = await owner.saveProduct({
      categoryId,
      name: product.name,
      description: product.description,
      price: product.price,
      variants: product.variants.map(({ label, price }) => ({ label, price })),
      tags: product.tags,
      available: product.available,
      image: product.image,
      groupIds: product.groupIds.flatMap((id) => groupIds.get(id) ?? []),
    })
  }
  return menu
}

async function prepare(options: DashboardOptions) {
  const auth = createMockAuth({ delay: 0 })
  await auth.signUp(testOwner)
  let counter = 0
  const owner = createMockOwner(auth, { delay: 0, now: () => NOW, newId: () => `id-${++counter}` })
  const billing = createMockBilling(auth, { delay: 0, now: () => options.startedAt ?? NOW })
  const pricing = createMockPricing()

  if (options.business !== false) {
    await owner.createBusiness({ name: 'Kape Kanto', slug: 'kape-kanto', types: ['coffee'], samples: false, ...options.business })
    if (options.look !== 'preset') await owner.saveBusiness({ theme: sampleBusiness().theme })
    if (options.details !== false) {
      const { tagline, phone, address, hours, social } = sampleBusiness()
      await owner.saveBusiness({ tagline, phone, address, hours, social })
    }
    if ((options.menu ?? 'sample') === 'sample') await loadSampleMenu(owner)
    if (options.published) await owner.setPublished(true)
  }
  if (options.plan === 'active') await billing.startCheckout('month')
  await options.seed?.(owner)

  const now = options.at ?? (options.plan === 'ended' ? NOW + 8 * DAY : NOW)
  // The provider asks for the business and then the menu: when the last answer is out, the data is loaded.
  let release!: () => void
  const loaded = new Promise<void>((resolve) => {
    release = resolve
  })
  const base = options.wrapOwner ? options.wrapOwner(owner) : owner
  const provided: OwnerRepository = {
    ...base,
    getBusiness: async () => {
      const business = await base.getBusiness()
      if (!business) release()
      return business
    },
    getMenu: async () => {
      const menu = await base.getMenu()
      release()
      return menu
    },
  }
  return { auth, owner, billing, pricing, now, provided, loaded }
}

type Prepared = Awaited<ReturnType<typeof prepare>>

function provider(prepared: Prepared, children: RouteObject[]): RouteObject[] {
  return [
    { path: '/', element: <WentTo /> },
    {
      path: '/dashboard',
      element: <DashboardProvider owner={prepared.provided} billing={prepared.billing} pricing={prepared.pricing} now={() => prepared.now} />,
      children: [...children, { path: '*', element: <WentTo /> }],
    },
  ]
}

/**
 * How long `ready` waits at most for the data. A failing repository never says so (and a refusal is no sign: the first ask
 * can be refused while the session is still on its way), so a test of one waits all of it. A second was too short on a busy
 * machine: `ready` went on before the provider had even shown its loading line, and the test read a page not drawn yet.
 */
const LOAD_WAIT_MS = 5000

async function ready(prepared: Prepared, router: ReturnType<typeof createMemoryRouter>) {
  // The lazy routes are in once the router is initialized; then the data arrives.
  await waitFor(() => expect(router.state.initialized).toBe(true))
  await Promise.race([prepared.loaded, new Promise((resolve) => setTimeout(resolve, LOAD_WAIT_MS))])
  // The skeleton RequireBusiness shows while the business loads.
  await waitFor(() => expect(screen.queryByText(dashboardCopy.shell.loading)).not.toBeInTheDocument())
}

function harness(prepared: Prepared, router: ReturnType<typeof createMemoryRouter>): DashboardHarness {
  const { auth, owner, billing, pricing, now } = prepared
  return { user: userEvent.setup(), auth, owner, billing, pricing, now, router }
}

/** Mounts one page where the router would (under DashboardProvider), at `path`, and waits until the data is in. */
export async function renderDashboardPage(
  page: ReactElement,
  path: string,
  options: DashboardOptions & { guard?: boolean } = {},
): Promise<DashboardHarness> {
  const prepared = await prepare(options)
  const { guard = true } = options
  const pathname = path.split('?')[0] ?? path
  const child = pathname.replace(/^\/dashboard\/?/, '')
  const element = guard ? <RequireBusiness>{page}</RequireBusiness> : page
  const route: RouteObject = child === '' ? { index: true, element } : { path: child, element }
  const router = createMemoryRouter(provider(prepared, [route, { path: 'setup', element: <WentTo /> }]), { initialEntries: [path] })
  render(<DashboardFrame auth={prepared.auth} router={router} />)
  await ready(prepared, router)
  return harness(prepared, router)
}

/** Mounts the whole dashboard: the shell, the sidebar and the real pages, at `path`. */
export async function renderDashboardApp(path: string, options: DashboardOptions = {}): Promise<DashboardHarness> {
  const prepared = await prepare(options)
  const router = createMemoryRouter(provider(prepared, dashboardRoutes), { initialEntries: [path] })
  render(<DashboardFrame auth={prepared.auth} router={router} />)
  await ready(prepared, router)
  return harness(prepared, router)
}
