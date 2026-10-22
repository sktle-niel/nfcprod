import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { createMemoryRouter, type RouteObject } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { dashboardRoutes } from '@/app/dashboardRoutes'
import { RequireSession } from '@/app/RequireSession'
import { copy } from '@/config/copy'
import { dashboardCopy } from '@/config/dashboardCopy'
import { createMockAuth } from '@/data/auth'
import { createMockBilling, type BillingRepository } from '@/data/billing'
import { createMockOwner } from '@/data/owner'
import { OwnerError, type OwnerRepository } from '@/data/ownerRepository'
import { createMockPricing } from '@/data/pricing'
import { DashboardProvider } from '@/features/dashboard/DashboardProvider'
import { testOwner } from '@/test/auth'
import { loadSampleMenu, NOW, renderDashboardApp, type DashboardHarness, type DashboardOptions } from '@/test/dashboard'
import { DashboardFrame, WentTo } from '@/test/DashboardFrame'
import { sampleBusiness, sampleImageFile } from '@/test/ownerFixtures'

/*
 * Edge flows of the owner dashboard: what happens when the repository fails, when the session ends in the middle of a save,
 * when a button is pressed twice, when the owner leaves a page with unsaved changes, when the plan runs out, with the
 * smallest and the largest businesses, with an owner who has no business, and with the browser's Back and Forward.
 *
 * Every step is checked twice, like in DashboardFlow.test.tsx: on screen, and in what the repository really holds. The repository
 * is wrapped by `spy`, which counts the calls that reach it and can replace one of its methods (to make it fail, or slow).
 * A fault that is the product's and is not fixed yet is an `it.skip` with a "BUG:" comment, not a bent assertion. The faults the
 * first run of this file found are fixed, and their tests now guard the fixes.
 */

const { shell, setup, overview, items, productEditor, addons, design, share, account } = dashboardCopy
const checklist = overview.checklist
const errors = shell.errors

// ---------------------------------------------------------------------------------------------------------------------
// Helpers

type Method = keyof OwnerRepository
type Hook = (...args: never[]) => Promise<unknown>
type Calls = Partial<Record<Method, number>>

/**
 * The repository with every call counted in `calls`, and the methods in `hooks` run in place of the real ones. Spread by the
 * harness, so it must answer `ownKeys` and `get` like the object it wraps.
 */
function spy(real: OwnerRepository, calls: Calls, hooks: Partial<Record<Method, Hook>> = {}): OwnerRepository {
  return new Proxy(real, {
    get(target, key: string) {
      const member: unknown = Reflect.get(target, key)
      if (typeof member !== 'function') return member
      return (...args: never[]) => {
        const method = key as Method
        calls[method] = (calls[method] ?? 0) + 1
        const hook = hooks[method]
        return hook ? hook(...args) : (member as (...rest: never[]) => Promise<unknown>).apply(target, args)
      }
    },
  })
}

/** A method that is refused with `error` the first `times` times, and does its work after that. */
function failFirst<Args extends unknown[], Result>(times: number, error: Error, work: (...args: Args) => Promise<Result>) {
  let left = times
  return async (...args: Args): Promise<Result> => {
    if (left > 0) {
      left -= 1
      throw error
    }
    return work(...args)
  }
}

/** A method that takes `ms` to answer. The work is done at once, only the answer is late. */
function lateAnswer<Args extends unknown[], Result>(ms: number, work: (...args: Args) => Promise<Result>) {
  return async (...args: Args): Promise<Result> => {
    const result = await work(...args)
    await new Promise((resolve) => setTimeout(resolve, ms))
    return result
  }
}

/** The repository with `calls` counted and the answer of each method in `methods` 150 ms late, so a second click lands while the first call is still out. */
function slowed(real: OwnerRepository, calls: Calls, ...methods: Method[]): OwnerRepository {
  const hooks: Partial<Record<Method, Hook>> = {}
  for (const method of methods) {
    const work = real[method] as (...args: never[]) => Promise<unknown>
    hooks[method] = lateAnswer(SLOW_MS, (...args: never[]) => work.apply(real, args))
  }
  return spy(real, calls, hooks)
}

const SLOW_MS = 150

const network = () => new OwnerError('network')

async function savedBusiness(owner: OwnerRepository) {
  const business = await owner.getBusiness()
  if (!business) throw new Error('The owner has no business')
  return business
}

async function productNamed(owner: OwnerRepository, name: string) {
  const found = (await owner.getMenu()).products.find((product) => product.name === name)
  if (!found) throw new Error(`The saved menu has no item called ${name}`)
  return found
}

const hasProduct = async (owner: OwnerRepository, name: string) => (await owner.getMenu()).products.some((product) => product.name === name)

const sidebar = () => within(screen.getByRole('navigation', { name: shell.menu }))

/** Clicks an item of the sidebar and waits for the page it leads to (found by its one h1). */
async function visit(user: UserEvent, label: string, title: string) {
  await user.click(sidebar().getByRole('link', { name: label }))
  await screen.findByRole('heading', { level: 1, name: title })
}

async function panel(name: string) {
  const section = (await screen.findByRole('heading', { level: 2, name })).closest('section')
  if (!section) throw new Error(`No panel called "${name}"`)
  return within(section)
}

const noDialogOpen = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

function fileInputIn(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('No file input to choose a picture with')
  return input
}

const typeOver = async (user: UserEvent, box: HTMLElement, value: string) => {
  await user.clear(box)
  await user.type(box, value)
}

/** Pastes a long text at once (typing 300 characters one by one is slow). */
async function pasteOver(user: UserEvent, box: HTMLElement, value: string) {
  await user.clear(box)
  await user.click(box)
  await user.paste(value)
}

/** The dashboard behind the real session guard, with the repositories built here so a test can reach all of them. */
type Guarded = DashboardHarness & { router: ReturnType<typeof createMemoryRouter> }

type GuardedOptions = {
  business?: false
  published?: boolean
  wrapOwner?: (real: OwnerRepository, auth: ReturnType<typeof createMockAuth>) => OwnerRepository
  wrapBilling?: (real: BillingRepository) => BillingRepository
  /** Reuse the repositories of an earlier render (a reload that keeps the server). */
  keep?: Guarded
}

type Parts = { auth: ReturnType<typeof createMockAuth>; owner: OwnerRepository; billing: BillingRepository; pricing: ReturnType<typeof createMockPricing> }
const kept = new WeakMap<object, Parts>()

async function renderGuarded(path: string, options: GuardedOptions = {}): Promise<Guarded> {
  let parts: Parts | undefined = options.keep ? kept.get(options.keep.router) : undefined
  if (!parts) {
    const auth = createMockAuth({ delay: 0 })
    await auth.signUp(testOwner)
    let counter = 0
    const owner = createMockOwner(auth, { delay: 0, now: () => NOW, newId: () => `id-${++counter}` })
    const billing = createMockBilling(auth, { delay: 0, now: () => NOW })
    if (options.business !== false) {
      await owner.createBusiness({ name: 'Kape Kanto', slug: 'kape-kanto', types: ['coffee'], samples: false })
      const { tagline, phone, address, hours, social } = sampleBusiness()
      await owner.saveBusiness({ tagline, phone, address, hours, social })
      await loadSampleMenu(owner)
      if (options.published) await owner.setPublished(true)
    }
    parts = { auth, owner, billing, pricing: createMockPricing() }
  }
  const { auth, owner, billing, pricing } = parts
  const provided = options.wrapOwner ? options.wrapOwner(owner, auth) : owner
  const bill = options.wrapBilling ? options.wrapBilling(billing) : billing
  const guard = (children: ReactNode) => <RequireSession>{children}</RequireSession>
  const routes: RouteObject[] = [
    { path: '/', element: <WentTo /> },
    {
      path: '/dashboard',
      element: guard(<DashboardProvider owner={provided} billing={bill} pricing={pricing} now={() => NOW} />),
      children: [...dashboardRoutes, { path: '*', element: <WentTo /> }],
    },
  ]
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<DashboardFrame auth={auth} router={router} />)
  await waitFor(() => expect(router.state.initialized).toBe(true))
  const harness: Guarded = { user: userEvent.setup(), auth, owner, billing, pricing, now: NOW, router }
  kept.set(router, parts)
  return harness
}

/** The Overview, Share and Account pages each describe the menu and the plan. */
const PAGES = {
  overview: { path: '/dashboard', label: shell.nav.overview, title: overview.title },
  menu: { path: '/dashboard/menu', label: shell.nav.menu, title: shell.menuPage.title },
  design: { path: '/dashboard/design', label: shell.nav.design, title: design.title },
  share: { path: '/dashboard/share', label: shell.nav.share, title: share.title },
  account: { path: '/dashboard/account', label: shell.nav.account, title: account.title },
} as const

async function open(path: string, options: DashboardOptions = {}) {
  const harness = await renderDashboardApp(path, options)
  await screen.findByRole('heading', { level: 1 })
  return harness
}

// ---------------------------------------------------------------------------------------------------------------------
// 1. The repository fails

describe('When the owner repository fails: Design', () => {
  it('keeps what the owner typed when saving the details fails, says why in words, and saves them when the owner tries again', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.design.path, {
      wrapOwner: (real) => spy(real, calls, { saveBusiness: failFirst(1, network(), (patch) => real.saveBusiness(patch)) }),
    })
    const before = await savedBusiness(owner)

    await typeOver(user, screen.getByLabelText(design.details.name), 'Kape Kanto Cebu')
    await user.type(screen.getByLabelText(design.details.phone), '1')
    await user.click(screen.getByRole('button', { name: design.bar.save }))

    expect(await screen.findByText(errors.network)).toBeInTheDocument()
    expect(screen.getByText(design.bar.status.error)).toBeInTheDocument()
    expect(screen.getByLabelText(design.details.name)).toHaveValue('Kape Kanto Cebu')
    expect(screen.getByLabelText(design.details.phone)).toHaveValue(`${before.phone}1`)
    expect(screen.getByText(design.bar.unsaved)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: design.bar.save })).toBeEnabled()
    expect(await savedBusiness(owner)).toEqual(before)

    await user.click(screen.getByRole('button', { name: design.bar.save }))

    expect(await screen.findByText(design.bar.status.saved)).toBeInTheDocument()
    expect(screen.queryByText(errors.network)).not.toBeInTheDocument()
    expect(await savedBusiness(owner)).toMatchObject({ name: 'Kape Kanto Cebu', phone: `${before.phone}1` })
    expect(calls.saveBusiness).toBe(2)
  })

  it('says it could not save when the repository refuses the details without naming a field, and keeps the draft', async () => {
    const { user, owner } = await open(PAGES.design.path, {
      wrapOwner: (real) => spy(real, {}, { saveBusiness: failFirst(1, new OwnerError('notFound'), (patch) => real.saveBusiness(patch)) }),
    })
    await typeOver(user, screen.getByLabelText(design.details.name), 'Moon Cafe')
    await user.click(screen.getByRole('button', { name: design.bar.save }))

    expect(await screen.findByText(errors.notFound)).toBeInTheDocument()
    expect(screen.getByLabelText(design.details.name)).toHaveValue('Moon Cafe')
    expect((await savedBusiness(owner)).name).toBe('Kape Kanto')
  })

  it('shows the words under the logo when the upload fails, keeps the other changes, and takes the same picture on the next try', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.design.path, {
      wrapOwner: (real) => spy(real, calls, { uploadImage: failFirst(1, network(), (file) => real.uploadImage(file)) }),
    })
    await typeOver(user, screen.getByLabelText(design.details.name), 'Moon Cafe')
    const file = sampleImageFile('png')

    await user.upload(fileInputIn(document.body), file)

    expect(await screen.findByText(errors.network)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: design.details.logo.alt })).not.toBeInTheDocument()
    expect(screen.getByLabelText(design.details.name)).toHaveValue('Moon Cafe')
    // Choose is usable again, and Save works for the name.
    expect(screen.getByRole('button', { name: design.details.logo.choose })).toBeEnabled()
    await user.upload(fileInputIn(document.body), file)
    expect(await screen.findByRole('img', { name: design.details.logo.alt })).toBeInTheDocument()
    expect(screen.queryByText(errors.network)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: design.bar.save }))
    await screen.findByText(design.bar.status.saved)
    expect(await savedBusiness(owner)).toMatchObject({ name: 'Moon Cafe', logo: expect.stringMatching(/^data:image\/png;base64,/) })
    expect(calls.uploadImage).toBe(2)
  })

  it('refuses a file that only looks like a picture, in words, and leaves the saved logo alone', async () => {
    const { user, owner } = await open(PAGES.design.path)
    const fake = new File([new Uint8Array(64)], 'logo.png', { type: 'image/png' })

    await user.upload(fileInputIn(document.body), fake)

    expect(await screen.findByText(errors.unsupported)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: design.bar.save })).toBeDisabled()
    expect((await savedBusiness(owner)).logo).toBeNull()
  })
})

describe('When the owner repository fails: Menu', () => {
  it('keeps the item form open with everything typed when saving an item fails, and saves it once on the next try', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.menu.path, {
      wrapOwner: (real) => spy(real, calls, { saveProduct: failFirst(1, network(), (input) => real.saveProduct(input)) }),
    })
    await user.click(await screen.findByRole('button', { name: items.category.addItemLabel.replace('{name}', 'Hot') }))
    const dialog = within(await screen.findByRole('dialog', { name: productEditor.addTitle }))
    await user.type(dialog.getByRole('textbox', { name: productEditor.name }), 'Flat White')
    await user.type(dialog.getByRole('textbox', { name: productEditor.description }), 'Silky milk over a double shot.')
    await user.type(dialog.getByRole('textbox', { name: productEditor.price }), '155')
    await user.click(dialog.getByRole('button', { name: productEditor.save }))

    expect(await dialog.findByText(errors.network)).toBeInTheDocument()
    expect(dialog.getByRole('textbox', { name: productEditor.name })).toHaveValue('Flat White')
    expect(dialog.getByRole('textbox', { name: productEditor.description })).toHaveValue('Silky milk over a double shot.')
    expect(dialog.getByRole('textbox', { name: productEditor.price })).toHaveValue('155')
    expect(dialog.getByRole('button', { name: productEditor.save })).toBeEnabled()
    expect(await hasProduct(owner, 'Flat White')).toBe(false)

    await user.click(dialog.getByRole('button', { name: productEditor.save }))
    await noDialogOpen()

    expect(await productNamed(owner, 'Flat White')).toMatchObject({ price: 15500, description: 'Silky milk over a double shot.' })
    expect((await owner.getMenu()).products.filter((product) => product.name === 'Flat White')).toHaveLength(1)
    expect(calls.saveProduct).toBe(2)
  })

  it('leaves the sold-out switch where it was when the change fails, says why on the row, and flips it on the next try', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.menu.path, {
      wrapOwner: (real) => spy(real, calls, { setAvailable: failFirst(1, network(), (id, on) => real.setAvailable(id, on)) }),
    })
    const available = () => screen.getByRole('switch', { name: `${items.product.available}: Cold Brew` })

    await user.click(await screen.findByRole('switch', { name: `${items.product.available}: Cold Brew` }))

    expect(await screen.findByText(errors.network)).toBeInTheDocument()
    await waitFor(() => expect(available()).not.toHaveAttribute('aria-busy'))
    expect(available()).toHaveAttribute('aria-checked', 'true')
    expect((await productNamed(owner, 'Cold Brew')).available).toBe(true)

    await user.click(available())

    expect(await screen.findByText(items.product.nowSoldOut.replace('{name}', 'Cold Brew'))).toBeInTheDocument()
    expect(available()).toHaveAttribute('aria-checked', 'false')
    expect((await productNamed(owner, 'Cold Brew')).available).toBe(false)
    expect(calls.setAvailable).toBe(2)
  })

  it('keeps the delete question open with the reason when deleting an item fails, and deletes it on the next try', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.menu.path, {
      wrapOwner: (real) => spy(real, calls, { deleteProduct: failFirst(1, network(), (id) => real.deleteProduct(id)) }),
    })
    await user.click(await screen.findByRole('button', { name: items.product.deleteLabel.replace('{name}', 'Cold Brew') }))
    const question = within(await screen.findByRole('dialog'))
    await user.click(question.getByRole('button', { name: items.product.confirmDelete }))

    expect(await question.findByText(errors.network)).toBeInTheDocument()
    expect(question.getByRole('button', { name: items.product.confirmDelete })).toBeEnabled()
    expect(await hasProduct(owner, 'Cold Brew')).toBe(true)

    await user.click(question.getByRole('button', { name: items.product.confirmDelete }))
    await noDialogOpen()

    expect(await hasProduct(owner, 'Cold Brew')).toBe(false)
    expect(screen.queryByRole('button', { name: items.product.editLabel.replace('{name}', 'Cold Brew') })).not.toBeInTheDocument()
    expect(calls.deleteProduct).toBe(2)
  })

  it('does not show an old delete failure when the question is opened again after Keep it', async () => {
    const { user, owner } = await open(PAGES.menu.path, {
      wrapOwner: (real) => spy(real, {}, { deleteProduct: failFirst(1, network(), (id) => real.deleteProduct(id)) }),
    })
    const ask = async () => user.click(await screen.findByRole('button', { name: items.product.deleteLabel.replace('{name}', 'Cold Brew') }))
    await ask()
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: items.product.confirmDelete }))
    await screen.findByText(errors.network)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: items.dialog.cancel }))
    await noDialogOpen()

    await ask()

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByText(errors.network)).not.toBeInTheDocument()
    expect(await hasProduct(owner, 'Cold Brew')).toBe(true)
  })

  it('says why a new category was not saved, keeps its name in the box, and saves it on the next try', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.menu.path, {
      wrapOwner: (real) => spy(real, calls, { saveCategory: failFirst(1, network(), (input) => real.saveCategory(input)) }),
    })
    await user.click(await screen.findByRole('button', { name: items.toolbar.addCategory }))
    await user.type(screen.getByRole('textbox', { name: items.category.nameLabel }), 'Seasonal')
    await user.click(screen.getByRole('button', { name: items.category.save }))

    expect(await screen.findByText(errors.network)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: items.category.nameLabel })).toHaveValue('Seasonal')
    expect((await owner.getMenu()).categories.map((category) => category.name)).not.toContain('Seasonal')

    await user.click(screen.getByRole('button', { name: items.category.save }))

    expect(await screen.findByText(items.category.added.replace('{name}', 'Seasonal'))).toBeInTheDocument()
    expect((await owner.getMenu()).categories.filter((category) => category.name === 'Seasonal')).toHaveLength(1)
    expect(calls.saveCategory).toBe(2)
  })

  it('shows the failure of moving an item on its row and leaves the order as it was', async () => {
    const { user, owner } = await open(PAGES.menu.path, {
      wrapOwner: (real) => spy(real, {}, { moveProduct: failFirst(1, network(), (id, delta) => real.moveProduct(id, delta)) }),
    })
    await user.click(await screen.findByRole('button', { name: items.product.moveDown.replace('{name}', 'Americano') }))

    expect(await screen.findByText(errors.network)).toBeInTheDocument()
    const hot = (await owner.getMenu()).products.filter((product) => ['Americano', 'Spanish Latte'].includes(product.name)).map((product) => product.name)
    expect(hot).toEqual(['Americano', 'Spanish Latte'])
    expect(screen.getByRole('button', { name: items.product.moveDown.replace('{name}', 'Americano') })).toBeEnabled()
  })

  it('keeps the add-on form open with the typed options when saving a group fails, and saves it once on the next try', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(`${PAGES.menu.path}?tab=addons`, {
      wrapOwner: (real) => spy(real, calls, { saveGroup: failFirst(1, network(), (input) => real.saveGroup(input)) }),
    })
    await user.click(await screen.findByRole('button', { name: addons.add }))
    const dialog = within(await screen.findByRole('dialog', { name: addons.editor.addTitle }))
    await user.type(dialog.getByRole('textbox', { name: addons.editor.name }), 'Syrup')
    await user.type(dialog.getByRole('textbox', { name: addons.editor.optionName.replace('{n}', '1') }), 'Vanilla')
    await user.type(dialog.getByRole('textbox', { name: addons.editor.optionPrice.replace('{n}', '1') }), '20')
    await user.click(dialog.getByRole('button', { name: addons.editor.save }))

    expect(await dialog.findByText(errors.network)).toBeInTheDocument()
    expect(dialog.getByRole('textbox', { name: addons.editor.name })).toHaveValue('Syrup')
    expect(dialog.getByRole('textbox', { name: addons.editor.optionName.replace('{n}', '1') })).toHaveValue('Vanilla')
    expect((await owner.getMenu()).groups.map((group) => group.name)).not.toContain('Syrup')

    await user.click(dialog.getByRole('button', { name: addons.editor.save }))
    await noDialogOpen()

    expect((await owner.getMenu()).groups.filter((group) => group.name === 'Syrup')).toHaveLength(1)
    expect(calls.saveGroup).toBe(2)
  })

  it('keeps the add-on delete question open with the reason when deleting fails, and deletes on the next try', async () => {
    const { user, owner } = await open(`${PAGES.menu.path}?tab=addons`, {
      wrapOwner: (real) => spy(real, {}, { deleteGroup: failFirst(1, network(), (id) => real.deleteGroup(id)) }),
    })
    await user.click(await screen.findByRole('button', { name: addons.group.deleteLabel.replace('{name}', 'Milk') }))
    const question = within(await screen.findByRole('dialog'))
    await user.click(question.getByRole('button', { name: addons.confirmDelete.confirm }))

    expect(await question.findByText(errors.network)).toBeInTheDocument()
    expect((await owner.getMenu()).groups).toHaveLength(1)

    await user.click(question.getByRole('button', { name: addons.confirmDelete.confirm }))
    await noDialogOpen()
    expect((await owner.getMenu()).groups).toHaveLength(0)
  })
})

describe('When the owner repository fails: Share and the plan', () => {
  it('leaves the publish switch where it was when publishing fails, says why, and publishes on the next try', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.share.path, {
      wrapOwner: (real) => spy(real, calls, { setPublished: failFirst(1, network(), (on) => real.setPublished(on)) }),
    })
    const publish = () => screen.getByRole('switch', { name: share.publish.label })

    await user.click(await screen.findByRole('switch', { name: share.publish.label }))

    expect(await screen.findByText(errors.network)).toBeInTheDocument()
    await waitFor(() => expect(publish()).not.toHaveAttribute('aria-busy'))
    expect(publish()).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByText(share.publish.nowPublished)).not.toBeInTheDocument()
    expect((await savedBusiness(owner)).published).toBe(false)

    await user.click(publish())

    expect(await screen.findByText(share.publish.nowPublished)).toBeInTheDocument()
    expect(screen.queryByText(errors.network)).not.toBeInTheDocument()
    expect(publish()).toHaveAttribute('aria-checked', 'true')
    expect((await savedBusiness(owner)).published).toBe(true)
    expect(calls.setPublished).toBe(2)
  })

  it('keeps the change-link question open with the reason when changing the link fails, and changes it on the next try', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.share.path, {
      wrapOwner: (real) => spy(real, calls, { changeSlug: failFirst(1, network(), (slug) => real.changeSlug(slug)) }),
    })
    await user.click(await screen.findByRole('button', { name: share.link.change }))
    await typeOver(user, screen.getByLabelText(share.change.label), 'kape-kanto-cebu')
    await screen.findByText(share.change.status.available)
    await user.click(screen.getByRole('button', { name: share.change.submit }))
    const question = within(await screen.findByRole('dialog', { name: share.change.confirm.title }))
    await user.click(question.getByRole('button', { name: share.change.confirm.confirm }))

    expect(await question.findByText(errors.network)).toBeInTheDocument()
    expect((await savedBusiness(owner)).slug).toBe('kape-kanto')
    expect(question.getByRole('button', { name: share.change.confirm.confirm })).toBeEnabled()

    await user.click(question.getByRole('button', { name: share.change.confirm.confirm }))

    expect(await screen.findByText(share.link.changed)).toBeInTheDocument()
    expect((await savedBusiness(owner)).slug).toBe('kape-kanto-cebu')
    expect(calls.changeSlug).toBe(2)
  })

  it('says it could not check the link when the check fails, and checks again from the button with the focus kept in the field', async () => {
    const calls: Calls = {}
    const { user } = await open(PAGES.share.path, {
      wrapOwner: (real) => spy(real, calls, { checkSlug: failFirst(1, network(), (slug) => real.checkSlug(slug)) }),
    })
    await user.click(await screen.findByRole('button', { name: share.link.change }))
    const box = screen.getByLabelText(share.change.label)
    await typeOver(user, box, 'kape-kanto-cebu')

    expect(await screen.findByText(share.change.status.failed)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: share.change.submit })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: share.change.recheck }))

    expect(await screen.findByText(share.change.status.available)).toBeInTheDocument()
    expect(box).toHaveFocus()
    expect(screen.getByRole('button', { name: share.change.submit })).toBeEnabled()
    expect(calls.checkSlug).toBe(2)
  })

  it('says a link was taken in between when the check said free but the change is refused, and lets the owner pick another', async () => {
    const { user, owner } = await open(PAGES.share.path, {
      wrapOwner: (real) => spy(real, {}, { changeSlug: failFirst(1, new OwnerError('slugTaken'), (slug) => real.changeSlug(slug)) }),
    })
    await user.click(await screen.findByRole('button', { name: share.link.change }))
    const box = screen.getByLabelText(share.change.label)
    await typeOver(user, box, 'kape-kanto-cebu')
    await screen.findByText(share.change.status.available)
    await user.click(screen.getByRole('button', { name: share.change.submit }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: share.change.confirm.confirm }))

    expect(await screen.findByText(share.change.status.taken)).toBeInTheDocument()
    await noDialogOpen()
    await waitFor(() => expect(box).toHaveFocus())
    expect((await savedBusiness(owner)).slug).toBe('kape-kanto')
    expect(screen.getByRole('button', { name: share.change.submit })).toBeDisabled()

    await typeOver(user, box, 'kape-kanto-lahug')
    await screen.findByText(share.change.status.available)
    await user.click(screen.getByRole('button', { name: share.change.submit }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: share.change.confirm.confirm }))
    expect(await screen.findByText(share.link.changed)).toBeInTheDocument()
    expect((await savedBusiness(owner)).slug).toBe('kape-kanto-lahug')
  })

  it('shows a retry on Share when the plan cannot be loaded, and the page still works for the menu link', async () => {
    let fail = true
    const { user } = await renderGuarded(PAGES.share.path, {
      wrapBilling: (real) => ({
        ...real,
        current: async () => {
          if (fail) throw new Error('billing is down')
          return real.current()
        },
      }),
    })
    await screen.findByRole('heading', { level: 1, name: share.title })

    expect(await screen.findByText(overview.planError)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: share.link.change })).toBeInTheDocument()
    // Nothing is said about the state of the menu when the plan is unknown.
    expect(screen.queryByText(share.link.notLive)).not.toBeInTheDocument()
    expect(screen.queryByText(share.publish.draft)).not.toBeInTheDocument()

    fail = false
    await user.click(screen.getByRole('button', { name: shell.retry }))

    expect(await screen.findByText(share.publish.draft)).toBeInTheDocument()
    expect(screen.queryByText(overview.planError)).not.toBeInTheDocument()
  })

  it('shows a retry on Account when the plan cannot be loaded and loads it on the second try', async () => {
    let fail = true
    const { user } = await renderGuarded(PAGES.account.path, {
      wrapBilling: (real) => ({
        ...real,
        current: async () => {
          if (fail) throw new Error('billing is down')
          return real.current()
        },
      }),
    })

    expect(await screen.findByText(account.loadError)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /plan$/ })).not.toBeInTheDocument()

    fail = false
    await user.click(screen.getByRole('button', { name: account.retry }))

    expect(await screen.findByRole('heading', { level: 2, name: /Free trial/ })).toBeInTheDocument()
    expect(screen.queryByText(account.loadError)).not.toBeInTheDocument()
  })

  it('says the checkout could not be opened when starting a plan fails, keeps the trial, and starts the plan on the next try', async () => {
    const { user, billing } = await open(PAGES.account.path)
    const real = billing.startCheckout.bind(billing)
    let calls = 0
    let fail = true
    billing.startCheckout = async (plan) => {
      calls += 1
      if (fail) throw new Error('checkout is down')
      return real(plan)
    }
    const startName = account.plans.start.replace('{plan}', account.plans.names.year.toLowerCase())

    await user.click(await screen.findByRole('button', { name: startName }))

    expect(await screen.findByText(account.plans.error)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: startName })).toBeEnabled()
    expect(screen.getByRole('heading', { level: 2, name: /Free trial/ })).toBeInTheDocument()
    expect((await billing.current()).plan).toBeNull()

    fail = false
    await user.click(screen.getByRole('button', { name: startName }))

    expect(await screen.findByRole('heading', { level: 2, name: account.status.active.replace('{plan}', account.plans.names.year) })).toBeInTheDocument()
    expect(screen.queryByText(account.plans.error)).not.toBeInTheDocument()
    expect((await billing.current()).plan).toBe('year')
    expect(calls).toBe(2)
  })

  it('shows a retry in the visitors panel when the numbers fail to load, and shows them on the second try', async () => {
    const { user } = await open(PAGES.overview.path, {
      wrapOwner: (real) => spy(real, {}, { insights: failFirst(1, network(), () => real.insights()) }),
    })

    const visitors = await panel(overview.visitors.title)
    expect(await visitors.findByText(overview.visitors.error)).toBeInTheDocument()

    await user.click(visitors.getByRole('button', { name: shell.retry }))

    expect(await visitors.findByText(overview.visitors.demo)).toBeInTheDocument()
    expect(visitors.queryByText(overview.visitors.error)).not.toBeInTheDocument()
  })
})

/** The wizard from the name to the review, with the milk tea type and the link the name suggests. */
async function walkToReview(user: UserEvent, name: string) {
  await user.type(await screen.findByLabelText(setup.steps.name.label), name)
  await user.click(screen.getByRole('button', { name: setup.next }))
  await user.click(await screen.findByRole('checkbox', { name: setup.types.milkTea.label }))
  await user.click(screen.getByRole('button', { name: setup.next }))
  await screen.findByText(setup.steps.link.status.available)
  await user.click(screen.getByRole('button', { name: setup.next }))
  await screen.findByRole('button', { name: setup.steps.review.create })
}

describe('When the owner repository fails: loading and the wizard', () => {
  it('shows one retry when the business cannot be loaded, instead of a broken page, and opens the dashboard on the second try', async () => {
    const calls: Calls = {}
    const { user } = await renderGuarded(PAGES.menu.path, {
      wrapOwner: (real) => spy(real, calls, { getMenu: failFirst(1, network(), () => real.getMenu()) }),
    })

    expect(await screen.findByText(shell.loadError)).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: shell.menu })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: shell.retry }))

    expect(await screen.findByRole('heading', { level: 1, name: shell.menuPage.title })).toBeInTheDocument()
    expect(screen.queryByText(shell.loadError)).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: 'Hot' })).toBeInTheDocument()
  })

  it('keeps every answer of the wizard when creating the menu fails, says why on the last step, and creates one business on the next try', async () => {
    const calls: Calls = {}
    const { user, owner } = await renderGuarded('/dashboard/setup', {
      business: false,
      wrapOwner: (real) => spy(real, calls, { createBusiness: failFirst(1, network(), (input) => real.createBusiness(input)) }),
    })
    await walkToReview(user, 'Tsaa Tayo')
    await user.click(screen.getByRole('button', { name: setup.steps.review.create }))

    expect(await screen.findByText(errors.network)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: setup.steps.review.heading })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: setup.steps.review.create })).toBeEnabled()
    expect(await owner.getBusiness()).toBeNull()

    await user.click(screen.getByRole('button', { name: setup.steps.review.create }))

    expect(await screen.findByRole('heading', { level: 1, name: overview.title })).toBeInTheDocument()
    expect(await owner.getBusiness()).toMatchObject({ name: 'Tsaa Tayo', slug: 'tsaa-tayo', types: ['milkTea'] })
    expect(calls.createBusiness).toBe(2)
  })

  it('says the link could not be checked in the wizard, and goes on once the second check says it is free', async () => {
    const { user } = await renderGuarded('/dashboard/setup', {
      business: false,
      wrapOwner: (real) => spy(real, {}, { checkSlug: failFirst(1, network(), (slug) => real.checkSlug(slug)) }),
    })
    await user.type(await screen.findByLabelText(setup.steps.name.label), 'Tsaa Tayo')
    await user.click(screen.getByRole('button', { name: setup.next }))
    await user.click(await screen.findByRole('checkbox', { name: setup.types.milkTea.label }))
    await user.click(screen.getByRole('button', { name: setup.next }))

    expect(await screen.findByText(setup.steps.link.status.failed)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: setup.next })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: setup.steps.link.recheck }))

    expect(await screen.findByText(setup.steps.link.status.available)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: setup.next })).toBeEnabled()
  })

  it('sends the owner back to the link step when the link was taken while they were reviewing', async () => {
    const { user, owner } = await renderGuarded('/dashboard/setup', {
      business: false,
      wrapOwner: (real) => spy(real, {}, { createBusiness: failFirst(1, new OwnerError('slugTaken'), (input) => real.createBusiness(input)) }),
    })
    await walkToReview(user, 'Tsaa Tayo')
    await user.click(screen.getByRole('button', { name: setup.steps.review.create }))

    expect(await screen.findByRole('heading', { name: setup.steps.link.heading })).toHaveFocus()
    expect(screen.getByText(setup.steps.link.status.taken)).toBeInTheDocument()
    expect(screen.getByLabelText(setup.steps.link.label)).toHaveValue('tsaa-tayo')
    expect(screen.getByRole('button', { name: setup.next })).toBeDisabled()
    expect(await owner.getBusiness()).toBeNull()

    await typeOver(user, screen.getByLabelText(setup.steps.link.label), 'tsaa-tayo-cebu')
    await screen.findByText(setup.steps.link.status.available)
    await user.click(screen.getByRole('button', { name: setup.next }))
    await user.click(await screen.findByRole('button', { name: setup.steps.review.create }))
    expect(await screen.findByRole('heading', { level: 1, name: overview.title })).toBeInTheDocument()
    expect((await savedBusiness(owner)).slug).toBe('tsaa-tayo-cebu')
  })
})

// ---------------------------------------------------------------------------------------------------------------------
// 2. The session ends in the middle of a save

/** The owner is on the sign-in flow: the guard sent them to the home page with the sign-up modal address, and back to `next` after. */
async function expectSentToSignIn(harness: Guarded, next: string) {
  await waitFor(() => expect(harness.router.state.location.pathname).toBe('/'))
  const params = new URLSearchParams(harness.router.state.location.search)
  expect(params.get('auth')).toBe('signup')
  expect(params.get('next')).toBe(next)
  expect(screen.queryByRole('navigation', { name: shell.menu })).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  expect(await harness.auth.current()).toBeNull()
}

describe('When the session ends in the middle of a save', () => {
  it('sends the owner to sign in when the session ends during Save on Design, and has saved nothing', async () => {
    const calls: Calls = {}
    const harness = await renderGuarded(PAGES.design.path, {
      wrapOwner: (real, auth) =>
        spy(real, calls, {
          saveBusiness: async (patch) => {
            await auth.logOut()
            return real.saveBusiness(patch)
          },
        }),
    })
    const { user, auth, owner } = harness
    await typeOver(user, await screen.findByLabelText(design.details.name), 'Moon Cafe')

    await user.click(screen.getByRole('button', { name: design.bar.save }))

    await expectSentToSignIn(harness, '/dashboard/design')
    expect(calls.saveBusiness).toBe(1)
    // The owner signs in again: the saved business is the one from before.
    await auth.logIn({ email: testOwner.email, password: testOwner.password })
    expect((await savedBusiness(owner)).name).toBe('Kape Kanto')
  })

  it('sends the owner to sign in when the session ends during the save of an item, and has saved no item', async () => {
    const harness = await renderGuarded(PAGES.menu.path, {
      wrapOwner: (real, auth) =>
        spy(real, {}, {
          saveProduct: async (input) => {
            await auth.logOut()
            return real.saveProduct(input)
          },
        }),
    })
    const { user, auth, owner } = harness
    await user.click(await screen.findByRole('button', { name: items.category.addItemLabel.replace('{name}', 'Hot') }))
    const dialog = within(await screen.findByRole('dialog', { name: productEditor.addTitle }))
    await user.type(dialog.getByRole('textbox', { name: productEditor.name }), 'Flat White')
    await user.type(dialog.getByRole('textbox', { name: productEditor.price }), '155')
    await user.click(dialog.getByRole('button', { name: productEditor.save }))

    await expectSentToSignIn(harness, '/dashboard/menu')
    await auth.logIn({ email: testOwner.email, password: testOwner.password })
    expect(await hasProduct(owner, 'Flat White')).toBe(false)
  })

  it('sends the owner to sign in when the session ends as they flip the publish switch, and the menu stays a draft', async () => {
    const harness = await renderGuarded(PAGES.share.path, {
      wrapOwner: (real, auth) =>
        spy(real, {}, {
          setPublished: async (on) => {
            await auth.logOut()
            return real.setPublished(on)
          },
        }),
    })
    const { user, auth, owner } = harness

    await user.click(await screen.findByRole('switch', { name: share.publish.label }))

    await expectSentToSignIn(harness, '/dashboard/share')
    await auth.logIn({ email: testOwner.email, password: testOwner.password })
    expect((await savedBusiness(owner)).published).toBe(false)
  })

  it('sends the owner to sign in when the session ends as they confirm the new link, and the old link stays', async () => {
    const harness = await renderGuarded(PAGES.share.path, {
      wrapOwner: (real, auth) =>
        spy(real, {}, {
          changeSlug: async (slug) => {
            await auth.logOut()
            return real.changeSlug(slug)
          },
        }),
    })
    const { user, auth, owner } = harness
    await user.click(await screen.findByRole('button', { name: share.link.change }))
    await typeOver(user, screen.getByLabelText(share.change.label), 'kape-kanto-cebu')
    await screen.findByText(share.change.status.available)
    await user.click(screen.getByRole('button', { name: share.change.submit }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: share.change.confirm.confirm }))

    await expectSentToSignIn(harness, '/dashboard/share')
    await auth.logIn({ email: testOwner.email, password: testOwner.password })
    expect((await savedBusiness(owner)).slug).toBe('kape-kanto')
  })

  it('sends the owner to sign in when the session ends as they press Create my menu, and no business was made', async () => {
    const harness = await renderGuarded('/dashboard/setup', {
      business: false,
      wrapOwner: (real, auth) =>
        spy(real, {}, {
          createBusiness: async (input) => {
            await auth.logOut()
            return real.createBusiness(input)
          },
        }),
    })
    const { user, auth, owner } = harness
    await walkToReview(user, 'Tsaa Tayo')

    await user.click(screen.getByRole('button', { name: setup.steps.review.create }))

    await expectSentToSignIn(harness, '/dashboard/setup')
    await auth.logIn({ email: testOwner.email, password: testOwner.password })
    expect(await owner.getBusiness()).toBeNull()
  })

  it('sends the owner to sign in when the session ends while the link is being checked in the wizard', async () => {
    const harness = await renderGuarded('/dashboard/setup', {
      business: false,
      wrapOwner: (real, auth) =>
        spy(real, {}, {
          checkSlug: async (slug) => {
            await auth.logOut()
            return real.checkSlug(slug)
          },
        }),
    })
    const { user } = harness
    await user.type(await screen.findByLabelText(setup.steps.name.label), 'Tsaa Tayo')
    await user.click(screen.getByRole('button', { name: setup.next }))
    await user.click(await screen.findByRole('checkbox', { name: setup.types.milkTea.label }))
    await user.click(screen.getByRole('button', { name: setup.next }))

    await expectSentToSignIn(harness, '/dashboard/setup')
  })

  it('sends the owner to sign in when the session has ended before the dashboard loads, without showing a retry', async () => {
    const harness = await renderGuarded(PAGES.menu.path, {
      wrapOwner: (real, auth) => {
        void auth.logOut()
        return real
      },
    })

    await expectSentToSignIn(harness, '/dashboard/menu')
    expect(screen.queryByText(shell.loadError)).not.toBeInTheDocument()
  })

  it('sends the owner to sign in when the session ends as a photo is uploaded, and keeps nothing of the photo', async () => {
    const harness = await renderGuarded(PAGES.design.path, {
      wrapOwner: (real, auth) =>
        spy(real, {}, {
          uploadImage: async (file) => {
            await auth.logOut()
            return real.uploadImage(file)
          },
        }),
    })
    const { user, auth, owner } = harness
    await screen.findByLabelText(design.details.name)

    await user.upload(fileInputIn(document.body), sampleImageFile('png'))

    await expectSentToSignIn(harness, '/dashboard/design')
    await auth.logIn({ email: testOwner.email, password: testOwner.password })
    expect((await savedBusiness(owner)).logo).toBeNull()
  })
})

// ---------------------------------------------------------------------------------------------------------------------
// 3. Double clicks and fast repeats

describe('Double clicks and fast repeats', () => {
  it('sends one publish when the switch is clicked twice at once, and the menu ends up published', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.share.path, { wrapOwner: (real) => slowed(real, calls, 'setPublished') })
    const before = calls.setPublished ?? 0

    await user.dblClick(await screen.findByRole('switch', { name: share.publish.label }))

    await screen.findByText(share.publish.nowPublished)
    expect((calls.setPublished ?? 0) - before).toBe(1)
    expect((await savedBusiness(owner)).published).toBe(true)
    expect(screen.getByRole('switch', { name: share.publish.label })).toHaveAttribute('aria-checked', 'true')
  })

  it('sends one publish when the switch gets Space twice in a row from the keyboard', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.share.path, { wrapOwner: (real) => slowed(real, calls, 'setPublished') })
    const switchBox = await screen.findByRole('switch', { name: share.publish.label })
    switchBox.focus()

    await user.keyboard(' ')
    await user.keyboard(' ')

    await screen.findByText(share.publish.nowPublished)
    expect(calls.setPublished).toBe(1)
    expect((await savedBusiness(owner)).published).toBe(true)
  })

  it('sends one save when Save changes on Design is clicked twice at once', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.design.path, { wrapOwner: (real) => slowed(real, calls, 'saveBusiness') })
    await typeOver(user, await screen.findByLabelText(design.details.name), 'Kape Kanto Cebu')

    await user.dblClick(screen.getByRole('button', { name: design.bar.save }))

    await screen.findByText(design.bar.status.saved)
    expect(calls.saveBusiness).toBe(1)
    expect((await savedBusiness(owner)).name).toBe('Kape Kanto Cebu')
  })

  it('sends one save when Enter is pressed twice in a field of the Design form', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.design.path, { wrapOwner: (real) => slowed(real, calls, 'saveBusiness') })
    const phone = await screen.findByLabelText(design.details.phone)
    await user.type(phone, '1')

    await user.keyboard('{Enter}{Enter}')

    await screen.findByText(design.bar.status.saved)
    expect(calls.saveBusiness).toBe(1)
    expect((await savedBusiness(owner)).phone).toMatch(/1$/)
  })

  it('saves an item once when Save item is clicked twice at once', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.menu.path, { wrapOwner: (real) => slowed(real, calls, 'saveProduct') })
    await user.click(await screen.findByRole('button', { name: items.category.addItemLabel.replace('{name}', 'Hot') }))
    const dialog = within(await screen.findByRole('dialog', { name: productEditor.addTitle }))
    await user.type(dialog.getByRole('textbox', { name: productEditor.name }), 'Flat White')
    await user.type(dialog.getByRole('textbox', { name: productEditor.price }), '155')

    await user.dblClick(dialog.getByRole('button', { name: productEditor.save }))

    await noDialogOpen()
    expect(calls.saveProduct).toBe(1)
    expect((await owner.getMenu()).products.filter((product) => product.name === 'Flat White')).toHaveLength(1)
  })

  it('saves an add-on group once when Save group is clicked twice at once', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(`${PAGES.menu.path}?tab=addons`, { wrapOwner: (real) => slowed(real, calls, 'saveGroup') })
    await user.click(await screen.findByRole('button', { name: addons.add }))
    const dialog = within(await screen.findByRole('dialog', { name: addons.editor.addTitle }))
    await user.type(dialog.getByRole('textbox', { name: addons.editor.name }), 'Syrup')
    await user.type(dialog.getByRole('textbox', { name: addons.editor.optionName.replace('{n}', '1') }), 'Vanilla')

    await user.dblClick(dialog.getByRole('button', { name: addons.editor.save }))

    await noDialogOpen()
    expect(calls.saveGroup).toBe(1)
    expect((await owner.getMenu()).groups.filter((group) => group.name === 'Syrup')).toHaveLength(1)
  })

  it('adds a category once when Save is clicked twice at once', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.menu.path, { wrapOwner: (real) => slowed(real, calls, 'saveCategory') })
    await user.click(await screen.findByRole('button', { name: items.toolbar.addCategory }))
    await user.type(screen.getByRole('textbox', { name: items.category.nameLabel }), 'Seasonal')

    await user.dblClick(screen.getByRole('button', { name: items.category.save }))

    await screen.findByText(items.category.added.replace('{name}', 'Seasonal'))
    expect(calls.saveCategory).toBe(1)
    expect((await owner.getMenu()).categories.filter((category) => category.name === 'Seasonal')).toHaveLength(1)
  })

  it('sends one delete when Delete item is clicked twice at once in the question', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.menu.path, { wrapOwner: (real) => slowed(real, calls, 'deleteProduct') })
    await user.click(await screen.findByRole('button', { name: items.product.deleteLabel.replace('{name}', 'Cold Brew') }))

    await user.dblClick(within(await screen.findByRole('dialog')).getByRole('button', { name: items.product.confirmDelete }))

    await noDialogOpen()
    expect(calls.deleteProduct).toBe(1)
    expect(await hasProduct(owner, 'Cold Brew')).toBe(false)
  })

  it('sends one delete when Delete category is clicked twice at once in the question', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.menu.path, { wrapOwner: (real) => slowed(real, calls, 'deleteCategory') })
    await user.click(await screen.findByRole('button', { name: items.category.deleteLabel.replace('{name}', 'Iced') }))

    await user.dblClick(within(await screen.findByRole('dialog')).getByRole('button', { name: items.category.confirmDelete }))

    await noDialogOpen()
    expect(calls.deleteCategory).toBe(1)
    expect((await owner.getMenu()).categories.map((category) => category.name)).toEqual(['Hot'])
  })

  it('starts the plan once when Start is clicked twice at once', async () => {
    const { user, billing } = await open(PAGES.account.path)
    const real = billing.startCheckout.bind(billing)
    let calls = 0
    billing.startCheckout = async (plan) => {
      calls += 1
      await new Promise((resolve) => setTimeout(resolve, SLOW_MS))
      return real(plan)
    }

    await user.dblClick(await screen.findByRole('button', { name: account.plans.start.replace('{plan}', account.plans.names.year.toLowerCase()) }))

    await screen.findByRole('heading', { level: 2, name: account.status.active.replace('{plan}', account.plans.names.year) })
    expect(calls).toBe(1)
  })

  it('creates the business once when Create my menu is clicked twice at once', async () => {
    const calls: Calls = {}
    const { user, owner } = await renderGuarded('/dashboard/setup', { business: false, wrapOwner: (real) => slowed(real, calls, 'createBusiness') })
    await walkToReview(user, 'Tsaa Tayo')

    await user.dblClick(screen.getByRole('button', { name: setup.steps.review.create }))

    expect(await screen.findByRole('heading', { level: 1, name: overview.title })).toBeInTheDocument()
    expect(calls.createBusiness).toBe(1)
    expect(await savedBusiness(owner)).toMatchObject({ slug: 'tsaa-tayo' })
  })

  it('creates the business once when Enter is pressed twice on the last step', async () => {
    const calls: Calls = {}
    const { user, owner } = await renderGuarded('/dashboard/setup', { business: false, wrapOwner: (real) => slowed(real, calls, 'createBusiness') })
    await walkToReview(user, 'Tsaa Tayo')
    screen.getByRole('checkbox', { name: setup.steps.review.samples.label }).focus()

    await user.keyboard('{Enter}{Enter}')

    expect(await screen.findByRole('heading', { level: 1, name: overview.title })).toBeInTheDocument()
    expect(calls.createBusiness).toBe(1)
    expect(await savedBusiness(owner)).toMatchObject({ slug: 'tsaa-tayo' })
  })

  it('changes the link once when Change the link is clicked twice at once in the question', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.share.path, { wrapOwner: (real) => slowed(real, calls, 'changeSlug') })
    await user.click(await screen.findByRole('button', { name: share.link.change }))
    await typeOver(user, screen.getByLabelText(share.change.label), 'kape-kanto-cebu')
    await screen.findByText(share.change.status.available)
    await user.click(screen.getByRole('button', { name: share.change.submit }))

    await user.dblClick(within(await screen.findByRole('dialog')).getByRole('button', { name: share.change.confirm.confirm }))

    await screen.findByText(share.link.changed)
    expect(calls.changeSlug).toBe(1)
    expect((await savedBusiness(owner)).slug).toBe('kape-kanto-cebu')
  })

  it('opens one question when Save link is pressed twice at once, and one change follows', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.share.path, { wrapOwner: (real) => slowed(real, calls, 'changeSlug') })
    await user.click(await screen.findByRole('button', { name: share.link.change }))
    await typeOver(user, screen.getByLabelText(share.change.label), 'kape-kanto-cebu')
    await screen.findByText(share.change.status.available)

    await user.dblClick(screen.getByRole('button', { name: share.change.submit }))

    expect(await screen.findAllByRole('dialog')).toHaveLength(1)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: share.change.confirm.confirm }))
    await screen.findByText(share.link.changed)
    expect(calls.changeSlug).toBe(1)
    expect((await savedBusiness(owner)).slug).toBe('kape-kanto-cebu')
  })

  it('flips the sold-out switch once when it is clicked twice at once', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.menu.path, { wrapOwner: (real) => slowed(real, calls, 'setAvailable') })

    await user.dblClick(await screen.findByRole('switch', { name: `${items.product.available}: Cold Brew` }))

    await screen.findByText(items.product.nowSoldOut.replace('{name}', 'Cold Brew'))
    expect(calls.setAvailable).toBe(1)
    expect((await productNamed(owner, 'Cold Brew')).available).toBe(false)
  })

  it('moves an item one place when its arrow is clicked twice at once', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.menu.path, { wrapOwner: (real) => slowed(real, calls, 'moveProduct') })

    await user.dblClick(await screen.findByRole('button', { name: items.product.moveDown.replace('{name}', 'Americano') }))

    await screen.findByText(items.product.moved.replace('{name}', 'Americano').replace('{n}', '2').replace('{count}', '2'))
    expect(calls.moveProduct).toBe(1)
    const order = (await owner.getMenu()).products.map((product) => product.name)
    expect(order.indexOf('Spanish Latte')).toBeLessThan(order.indexOf('Americano'))
  })
})

// ---------------------------------------------------------------------------------------------------------------------
// 4. Leaving Design with unsaved changes

const previewRegion = () => screen.getByRole('region', { name: copy.menu.view.previewLabel })

describe('Leaving Design with unsaved changes', () => {
  it('shows the saved business again when the owner comes back, saves nothing on the way, and has nothing to discard', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.design.path, { wrapOwner: (real) => spy(real, calls) })
    const before = await savedBusiness(owner)
    await typeOver(user, await screen.findByLabelText(design.details.name), 'Moon Cafe')
    await user.click(screen.getByRole('tab', { name: design.tabs.look }))
    await typeOver(user, screen.getByLabelText(design.look.primary), '#6b3f1d')
    expect(screen.getByText(design.bar.unsaved)).toBeInTheDocument()

    await visit(user, shell.nav.menu, shell.menuPage.title)
    await visit(user, shell.nav.design, design.title)

    expect(screen.getByLabelText(design.details.name)).toHaveValue('Kape Kanto')
    expect(screen.getByText(design.bar.upToDate)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: design.bar.save })).toBeDisabled()
    expect(screen.getByRole('button', { name: design.bar.discard })).toBeDisabled()
    expect(within(previewRegion()).getByRole('heading', { name: 'Kape Kanto' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: design.tabs.look }))
    expect(screen.getByLabelText(design.look.primary)).toHaveValue(before.theme.primary)
    expect(calls.saveBusiness).toBeUndefined()
    expect(await savedBusiness(owner)).toEqual(before)
  })

  it('discards a new draft after coming back, and leaves the saved business as it was', async () => {
    const { user, owner } = await open(PAGES.design.path)
    await typeOver(user, await screen.findByLabelText(design.details.name), 'Moon Cafe')
    await visit(user, shell.nav.overview, overview.title)
    await visit(user, shell.nav.design, design.title)

    await typeOver(user, screen.getByLabelText(design.details.name), 'Sun Cafe')
    await user.type(screen.getByLabelText(design.details.phone), '9')
    expect(within(previewRegion()).getByRole('heading', { name: 'Sun Cafe' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: design.bar.discard }))

    expect(screen.getByLabelText(design.details.name)).toHaveValue('Kape Kanto')
    expect(screen.getByLabelText(design.details.phone)).toHaveValue((await savedBusiness(owner)).phone)
    expect(screen.getByRole('button', { name: design.bar.discard })).toBeDisabled()
    expect(screen.getByRole('button', { name: design.bar.save })).toBeDisabled()
    expect((await savedBusiness(owner)).name).toBe('Kape Kanto')
  })

  it('finishes the save when the owner leaves Design while it is still being sent, and shows the new name everywhere', async () => {
    const calls: Calls = {}
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { user, owner } = await open(PAGES.design.path, { wrapOwner: (real) => slowed(real, calls, 'saveBusiness') })
    await typeOver(user, await screen.findByLabelText(design.details.name), 'Moon Cafe')
    await user.click(screen.getByRole('button', { name: design.bar.save }))

    await visit(user, shell.nav.overview, overview.title)

    await waitFor(() => expect(screen.getByRole('main')).toHaveTextContent('Moon Cafe'))
    expect((await savedBusiness(owner)).name).toBe('Moon Cafe')
    await visit(user, shell.nav.design, design.title)
    expect(screen.getByLabelText(design.details.name)).toHaveValue('Moon Cafe')
    expect(screen.getByText(design.bar.upToDate)).toBeInTheDocument()
    expect(calls.saveBusiness).toBe(1)
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('drops a logo that finishes uploading after the owner left Design, without an error, and keeps the saved logo empty', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { user, owner } = await open(PAGES.design.path, { wrapOwner: (real) => slowed(real, {}, 'uploadImage') })
    await screen.findByLabelText(design.details.name)
    await user.upload(fileInputIn(document.body), sampleImageFile('png'))

    await visit(user, shell.nav.menu, shell.menuPage.title)
    await visit(user, shell.nav.design, design.title)
    await new Promise((resolve) => setTimeout(resolve, SLOW_MS + 50))

    expect(screen.queryByRole('img', { name: design.details.logo.alt })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: design.bar.save })).toBeDisabled()
    expect((await savedBusiness(owner)).logo).toBeNull()
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })
})

// ---------------------------------------------------------------------------------------------------------------------
// 5. Two quick edits of the same item, and an item that goes while its editor is open

describe('Quick edits and items that go away', () => {
  it('keeps both edits of an item when the owner cancels a slow save and edits the same item again at once', async () => {
    const { user, owner } = await open(PAGES.menu.path, { wrapOwner: (real) => slowed(real, {}, 'saveProduct') })
    await user.click(await screen.findByRole('button', { name: items.product.editLabel.replace('{name}', 'Cold Brew') }))
    let dialog = within(await screen.findByRole('dialog', { name: productEditor.editTitle }))
    await typeOver(user, dialog.getByRole('textbox', { name: productEditor.name }), 'Cold Brew Plus')
    await user.click(dialog.getByRole('button', { name: productEditor.save }))

    // The owner thinks the save is taking long and cancels. Whatever the page does with the dialog, the first save is on its way.
    const cancel = dialog.queryByRole('button', { name: productEditor.cancel })
    if (cancel && !(cancel as HTMLButtonElement).disabled) await user.click(cancel)
    await noDialogOpen()
    await user.click(screen.getByRole('button', { name: /^Edit Cold Brew/ }))
    dialog = within(await screen.findByRole('dialog', { name: productEditor.editTitle }))
    await typeOver(user, dialog.getByRole('textbox', { name: productEditor.description }), 'Steeped for twelve hours.')
    await user.click(dialog.getByRole('button', { name: productEditor.save }))
    await noDialogOpen()
    await waitFor(async () => expect((await owner.getMenu()).products.find((product) => product.description === 'Steeped for twelve hours.')).toBeDefined())

    // Both edits are in the saved item: the new name and the new description.
    const menu = await owner.getMenu()
    expect(menu.products.filter((product) => product.name.startsWith('Cold Brew'))).toHaveLength(1)
    expect(menu.products.find((product) => product.name.startsWith('Cold Brew'))).toMatchObject({
      name: 'Cold Brew Plus',
      description: 'Steeped for twelve hours.',
    })
  })

  it('does not let the owner keep the old link while the change to the new link is already on its way', async () => {
    const { user, owner } = await open(PAGES.share.path, { wrapOwner: (real) => slowed(real, {}, 'changeSlug') })
    await user.click(await screen.findByRole('button', { name: share.link.change }))
    await typeOver(user, screen.getByLabelText(share.change.label), 'kape-kanto-cebu')
    await screen.findByText(share.change.status.available)
    await user.click(screen.getByRole('button', { name: share.change.submit }))
    const question = within(await screen.findByRole('dialog'))
    await user.click(question.getByRole('button', { name: share.change.confirm.confirm }))

    // "Keep the old link" must not be offered as a way out of a change that cannot be called back.
    const keep = screen.queryByRole('button', { name: share.change.confirm.cancel })
    if (keep && !(keep as HTMLButtonElement).disabled) await user.click(keep)
    await screen.findByText(share.link.changed)

    // Whatever the owner pressed, the screen and the saved link agree with what they chose.
    expect(keep === null || (keep as HTMLButtonElement).disabled).toBe(true)
    expect((await savedBusiness(owner)).slug).toBe('kape-kanto-cebu')
  })

  it('does not let the owner keep an item while its delete is already on its way', async () => {
    const { user, owner } = await open(PAGES.menu.path, { wrapOwner: (real) => slowed(real, {}, 'deleteProduct') })
    await user.click(await screen.findByRole('button', { name: items.product.deleteLabel.replace('{name}', 'Cold Brew') }))
    const question = within(await screen.findByRole('dialog'))
    await user.click(question.getByRole('button', { name: items.product.confirmDelete }))

    const keep = screen.queryByRole('button', { name: items.dialog.cancel })
    if (keep && !(keep as HTMLButtonElement).disabled) await user.click(keep)
    await waitFor(async () => expect(await hasProduct(owner, 'Cold Brew')).toBe(false))
    await noDialogOpen()

    expect(keep === null || (keep as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows the same sold-out switches as the saved menu when two replies arrive in the other order', async () => {
    let call = 0
    const { user, owner } = await open(PAGES.menu.path, {
      wrapOwner: (real) =>
        spy(real, {}, {
          setAvailable: (id: string, on: boolean) => {
            call += 1
            // The first answer is slow, the second is not: the server did the first change first, and the second answer holds both.
            return call === 1 ? lateAnswer(300, (...args: [string, boolean]) => real.setAvailable(...args))(id, on) : real.setAvailable(id, on)
          },
        }),
    })
    const coldBrew = () => screen.getByRole('switch', { name: `${items.product.available}: Cold Brew` })
    const americano = () => screen.getByRole('switch', { name: `${items.product.available}: Americano` })

    await user.click(await screen.findByRole('switch', { name: `${items.product.available}: Cold Brew` }))
    await user.click(americano())
    await screen.findByText(items.product.nowSoldOut.replace('{name}', 'Cold Brew'))
    await waitFor(() => expect(coldBrew()).not.toHaveAttribute('aria-busy'))

    const menu = await owner.getMenu()
    expect(menu.products.find((product) => product.name === 'Cold Brew')?.available).toBe(false)
    expect(menu.products.find((product) => product.name === 'Americano')?.available).toBe(false)
    expect(coldBrew()).toHaveAttribute('aria-checked', 'false')
    expect(americano()).toHaveAttribute('aria-checked', 'false')
  })

  it('says it could not find the item, creates nothing and keeps the form when the item was deleted while its editor was open', async () => {
    const { user, owner } = await open(PAGES.menu.path)
    const gone = await productNamed(owner, 'Cold Brew')
    await user.click(await screen.findByRole('button', { name: items.product.editLabel.replace('{name}', 'Cold Brew') }))
    const dialog = within(await screen.findByRole('dialog', { name: productEditor.editTitle }))
    await typeOver(user, dialog.getByRole('textbox', { name: productEditor.name }), 'Cold Brew Plus')
    // Another tab deletes the item.
    await owner.deleteProduct(gone.id)

    await user.click(dialog.getByRole('button', { name: productEditor.save }))

    expect(await dialog.findByText(errors.notFound)).toBeInTheDocument()
    expect(dialog.getByRole('textbox', { name: productEditor.name })).toHaveValue('Cold Brew Plus')
    expect(await hasProduct(owner, 'Cold Brew Plus')).toBe(false)
    expect(await hasProduct(owner, 'Cold Brew')).toBe(false)
    await user.click(dialog.getByRole('button', { name: productEditor.cancel }))
    await noDialogOpen()

    // The row is still on the page (the page has not heard), and deleting it there is harmless and takes it away.
    await user.click(screen.getByRole('button', { name: items.product.deleteLabel.replace('{name}', 'Cold Brew') }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: items.product.confirmDelete }))
    await noDialogOpen()
    expect(screen.queryByRole('button', { name: items.product.editLabel.replace('{name}', 'Cold Brew') })).not.toBeInTheDocument()
  })

  it('refuses the item with words on the category when its category was deleted while the editor was open', async () => {
    const { user, owner } = await open(PAGES.menu.path)
    const iced = (await owner.getMenu()).categories.find((category) => category.name === 'Iced')
    await user.click(await screen.findByRole('button', { name: items.product.editLabel.replace('{name}', 'Cold Brew') }))
    const dialog = within(await screen.findByRole('dialog', { name: productEditor.editTitle }))
    await owner.deleteCategory(iced?.id ?? '')

    await user.click(dialog.getByRole('button', { name: productEditor.save }))

    expect(await dialog.findByText(productEditor.errors.categoryId.invalid)).toBeInTheDocument()
    expect((await owner.getMenu()).products.map((product) => product.name)).not.toContain('Cold Brew')
  })

  it('shows the message and no broken page when an add-on group was deleted while its editor was open', async () => {
    const { user, owner } = await open(`${PAGES.menu.path}?tab=addons`)
    const milk = (await owner.getMenu()).groups[0]
    await user.click(await screen.findByRole('button', { name: addons.group.editLabel.replace('{name}', 'Milk') }))
    const dialog = within(await screen.findByRole('dialog'))
    await owner.deleteGroup(milk?.id ?? '')

    await user.click(dialog.getByRole('button', { name: addons.editor.save }))

    expect(await dialog.findByText(errors.notFound)).toBeInTheDocument()
    expect((await owner.getMenu()).groups).toHaveLength(0)
    await user.click(dialog.getByRole('button', { name: addons.editor.cancel }))
    await noDialogOpen()
    expect(screen.getByRole('button', { name: addons.add })).toBeInTheDocument()
  })

  it('keeps the shared state whole when the business reply and the menu reply land in the same moment', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const { user, owner } = await open(PAGES.design.path, {
      wrapOwner: (real) =>
        spy(real, {}, {
          saveBusiness: async (patch: Parameters<OwnerRepository['saveBusiness']>[0]) => {
            const business = await real.saveBusiness(patch)
            await gate
            return business
          },
          setAvailable: async (id: string, on: boolean) => {
            const menu = await real.setAvailable(id, on)
            await gate
            return menu
          },
        }),
    })
    await typeOver(user, await screen.findByLabelText(design.details.name), 'Moon Cafe')
    await user.click(screen.getByRole('button', { name: design.bar.save }))
    await visit(user, shell.nav.menu, shell.menuPage.title)
    await user.click(await screen.findByRole('switch', { name: `${items.product.available}: Cold Brew` }))

    release()

    await screen.findByText(items.product.nowSoldOut.replace('{name}', 'Cold Brew'))
    await visit(user, shell.nav.overview, overview.title)
    expect((await savedBusiness(owner)).name).toBe('Moon Cafe')
    await waitFor(() => expect(screen.getByRole('main')).toHaveTextContent('Moon Cafe'))
    await visit(user, shell.nav.menu, shell.menuPage.title)
    expect(screen.getByRole('switch', { name: `${items.product.available}: Cold Brew` })).toHaveAttribute('aria-checked', 'false')
  })
})

// ---------------------------------------------------------------------------------------------------------------------
// 6. The trial ends or a plan lapses

const DAY = 86_400_000

describe('A trial that ends and a plan that lapses, on Overview, Share and Account', () => {
  it('says the published menu is paused on all three pages when the trial has ended, and that nothing was deleted', async () => {
    const { user } = await open(PAGES.overview.path, { published: true, plan: 'ended' })

    await panel(overview.status.paused.title)
    expect((await panel(overview.plan.title)).getByText(overview.plan.trialEnded)).toBeInTheDocument()
    expect(screen.queryByText(overview.status.live.title)).not.toBeInTheDocument()

    await visit(user, shell.nav.share, share.title)
    expect(await screen.findByText(share.publish.paused)).toBeInTheDocument()
    expect(screen.getByText(share.link.paused)).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: share.publish.label })).toHaveAttribute('aria-checked', 'true')

    await visit(user, shell.nav.account, account.title)
    expect(await screen.findByRole('heading', { level: 2, name: account.status.trialEnded })).toBeInTheDocument()
    const site = await panel(account.menu.title)
    expect(site.getByText(account.menu.paused)).toBeInTheDocument()
    expect(site.getByText(account.menu.body.paused)).toBeInTheDocument()
    expect(screen.queryByText(account.menu.live)).not.toBeInTheDocument()
  })

  it('tells an owner whose menu was never published to choose a plan first on all three pages when the trial has ended', async () => {
    const { user } = await open(PAGES.overview.path, { plan: 'ended' })

    const status = await panel(overview.status.paused.title)
    expect(status.getByText(overview.status.paused.bodyDraft)).toBeInTheDocument()

    await visit(user, shell.nav.share, share.title)
    expect(await screen.findByText(share.publish.endedDraft)).toBeInTheDocument()
    expect(screen.queryByText(share.link.notLive)).not.toBeInTheDocument()

    await visit(user, shell.nav.account, account.title)
    expect((await panel(account.menu.title)).getByText(account.menu.paused)).toBeInTheDocument()
    expect(screen.queryByText(account.menu.draft)).not.toBeInTheDocument()
  })

  it('says the monthly plan has ended, and offers to restart it, on all three pages when a paid plan lapses', async () => {
    const { user } = await open(PAGES.overview.path, { published: true, plan: 'active', at: NOW + 40 * DAY })

    await panel(overview.status.paused.title)
    expect((await panel(overview.plan.title)).getByText(overview.plan.lapsed.replace('{plan}', overview.plan.names.month))).toBeInTheDocument()
    expect((await panel(overview.freeCards.title.many.replace('{n}', '2'))).getByText(overview.freeCards.ready)).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: checklist.progress })).toHaveAttribute('aria-valuetext', checklist.progressText.replace('{done}', '3').replace('{total}', '5'))

    await visit(user, shell.nav.share, share.title)
    expect(await screen.findByText(share.publish.paused)).toBeInTheDocument()
    expect((await panel(share.cards.title.replace('{n}', '2'))).getByText(share.cards.ready)).toBeInTheDocument()

    await visit(user, shell.nav.account, account.title)
    expect(await screen.findByRole('heading', { level: 2, name: account.status.lapsed.replace('{plan}', 'monthly') })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: account.plans.restart.replace('{plan}', 'monthly') })).toBeEnabled()
    expect((await panel(account.freeCards.title.replace('{n}', '2'))).getByText(account.freeCards.ready)).toBeInTheDocument()
    expect((await panel(account.menu.title)).getByText(account.menu.paused)).toBeInTheDocument()
  })

  it('counts one day left in the last minutes of the trial on Overview and Account, and ends it at the minute', async () => {
    const lastDay = await open(PAGES.overview.path, { at: NOW + 7 * DAY - 2 * 60_000 })
    expect((await panel(overview.plan.title)).getByText(overview.plan.trial.one)).toBeInTheDocument()
    await visit(lastDay.user, shell.nav.account, account.title)
    expect(await screen.findByRole('heading', { level: 2, name: account.status.trial.one })).toBeInTheDocument()
  })

  it('ends the trial on the minute it runs out', async () => {
    await open(PAGES.account.path, { at: NOW + 7 * DAY })
    expect(await screen.findByRole('heading', { level: 2, name: account.status.trialEnded })).toBeInTheDocument()
  })

  it('says the menu is published but paused, and keeps it published, when the owner flips the switch after the trial ended', async () => {
    const { user, owner } = await open(PAGES.share.path, { plan: 'ended' })

    await user.click(await screen.findByRole('switch', { name: share.publish.label }))

    expect(await screen.findByText(share.publish.nowPaused)).toBeInTheDocument()
    expect((await savedBusiness(owner)).published).toBe(true)
    await visit(user, shell.nav.overview, overview.title)
    await panel(overview.status.paused.title)
    expect(screen.queryByText(overview.status.live.title)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------------------------------------------------
// 7. Small businesses: only a logo, only a phone, no hours

describe('A business with very little filled in', () => {
  it('shows only the phone in the Design preview, counts the contact step as done and the logo step as open', async () => {
    const { user } = await open(PAGES.overview.path, {
      details: false,
      seed: async (owner) => {
        await owner.saveBusiness({ phone: '+63 917 555 0142' })
      },
    })
    const list = await panel(checklist.title)
    expect(list.getByRole('link', { name: `${checklist.steps.details} ${checklist.done}` })).toBeInTheDocument()
    expect(list.getByRole('link', { name: `${checklist.steps.logo} ${checklist.todo}` })).toBeInTheDocument()

    await visit(user, shell.nav.design, design.title)

    const preview = within(previewRegion())
    expect(preview.getByText('+63 917 555 0142')).toBeInTheDocument()
    expect(preview.queryByText(copy.menu.view.footer.hours)).not.toBeInTheDocument()
    expect(preview.queryByText(copy.menu.view.footer.address)).not.toBeInTheDocument()
    expect(preview.queryByText(copy.menu.view.footer.social)).not.toBeInTheDocument()
    expect(previewRegion().querySelector('header img')).toBeNull()
    expect(screen.getByLabelText(design.details.hours)).toHaveValue('')
  })

  it('shows only the logo in the Design preview, counts the logo step as done and the contact step as open', async () => {
    let logo = ''
    const { user } = await open(PAGES.overview.path, {
      details: false,
      seed: async (owner) => {
        logo = await owner.uploadImage(sampleImageFile('webp'))
        await owner.saveBusiness({ logo })
      },
    })
    const list = await panel(checklist.title)
    expect(list.getByRole('link', { name: `${checklist.steps.logo} ${checklist.done}` })).toBeInTheDocument()
    expect(list.getByRole('link', { name: `${checklist.steps.details} ${checklist.todo}` })).toBeInTheDocument()

    await visit(user, shell.nav.design, design.title)

    expect(previewRegion().querySelector('header img')).toHaveAttribute('src', logo)
    expect(previewRegion().querySelector('footer')).toBeNull()
    expect(screen.getByRole('img', { name: design.details.logo.alt })).toHaveAttribute('src', logo)
    expect(screen.getByRole('button', { name: design.details.logo.replace })).toBeInTheDocument()
  })

  it('treats an address with no hours as filled in, and shows no hours block anywhere', async () => {
    const { user } = await open(PAGES.design.path, {
      details: false,
      seed: async (owner) => {
        await owner.saveBusiness({ address: '12 Mabini Street, Lahug' })
      },
    })
    await screen.findByLabelText(design.details.address)

    const preview = within(previewRegion())
    expect(preview.getByText('12 Mabini Street, Lahug')).toBeInTheDocument()
    expect(preview.queryByText(copy.menu.view.footer.hours)).not.toBeInTheDocument()
    await visit(user, shell.nav.overview, overview.title)
    expect((await panel(checklist.title)).getByRole('link', { name: `${checklist.steps.details} ${checklist.done}` })).toBeInTheDocument()
  })

  it('shows no empty block in the preview when the owner types only spaces in the address and the hours', async () => {
    const { user } = await open(PAGES.design.path, { details: false })

    await user.type(await screen.findByLabelText(design.details.address), '   ')
    await user.type(screen.getByLabelText(design.details.hours), '  ')

    expect(previewRegion().querySelector('footer')).toBeNull()
  })

  it('keeps every page usable for a business with no items, no details and no logo, and saves nothing by itself', async () => {
    const calls: Calls = {}
    const { user, owner } = await open(PAGES.overview.path, { details: false, menu: 'preset', wrapOwner: (real) => spy(real, calls) })
    const business = await savedBusiness(owner)
    await panel(checklist.title)
    expect((await panel(overview.visitors.title)).getByText(overview.visitors.empty)).toBeInTheDocument()

    await visit(user, shell.nav.design, design.title)
    expect(within(previewRegion()).getByRole('heading', { name: 'Kape Kanto' })).toBeInTheDocument()
    await visit(user, shell.nav.share, share.title)
    expect(await screen.findByLabelText(share.link.label)).toHaveValue(`${window.location.origin}/m/kape-kanto`)
    await visit(user, shell.nav.menu, shell.menuPage.title)
    expect((await screen.findAllByText(items.category.noItems, { selector: 'p' })).length).toBeGreaterThan(0)

    expect(calls.saveBusiness).toBeUndefined()
    expect(await savedBusiness(owner)).toEqual(business)
  })

  it('shows the empty-menu start when every category is gone, on Menu, Design and Overview', async () => {
    const { user } = await open(PAGES.menu.path, {
      seed: async (owner) => {
        for (const category of (await owner.getMenu()).categories) await owner.deleteCategory(category.id)
      },
    })

    expect(await screen.findByRole('heading', { level: 2, name: items.empty.title })).toBeInTheDocument()
    await visit(user, shell.nav.design, design.title)
    expect(within(previewRegion()).getByRole('heading', { name: 'Kape Kanto' })).toBeInTheDocument()
    await visit(user, shell.nav.overview, overview.title)
    expect((await panel(overview.visitors.title)).getByText(overview.visitors.empty)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------------------------------------------------
// 8. The longest values, and the first one over

const word = (length: number, letter = 'a') => letter.repeat(length)

describe('The longest allowed values and the first value over each limit', () => {
  it('saves the longest name, tagline, phone, address, hours and links on Design, as typed, and shows the name on the Overview', async () => {
    const { user, owner } = await open(PAGES.design.path)
    const hours = ['Mon to Fri 7am to 9pm', 'Sat 8am to 10pm', 'Sun 8am to 6pm', 'Holidays closed', 'Deliveries 10am to 4pm', 'Call to book events'].join('\n')

    await pasteOver(user, await screen.findByLabelText(design.details.name), word(60, 'N'))
    await pasteOver(user, screen.getByLabelText(design.details.tagline), word(100, 't'))
    await pasteOver(user, screen.getByLabelText(design.details.phone), word(20, '9'))
    await pasteOver(user, screen.getByLabelText(design.details.address), word(200, 'b'))
    await pasteOver(user, screen.getByLabelText(design.details.hours), hours)
    await pasteOver(user, screen.getByLabelText(design.details.website), `https://${word(60, 'w')}.com`)
    await user.click(screen.getByRole('button', { name: design.bar.save }))

    expect(await screen.findByText(design.bar.status.saved)).toBeInTheDocument()
    expect(await savedBusiness(owner)).toMatchObject({
      name: word(60, 'N'),
      tagline: word(100, 't'),
      phone: word(20, '9'),
      address: word(200, 'b'),
      hours,
    })
    await visit(user, shell.nav.overview, overview.title)
    expect(screen.getByRole('main')).toHaveTextContent(word(60, 'N'))
  })

  it('stops the business name at 60 characters when a longer one is pasted, and refuses 61 from the repository with words', async () => {
    const { user, owner } = await open(PAGES.design.path)
    const box = await screen.findByLabelText(design.details.name)

    await pasteOver(user, box, word(61, 'N'))

    expect((box as HTMLInputElement).value).toHaveLength(60)
    await user.click(screen.getByRole('button', { name: design.bar.save }))
    await screen.findByText(design.bar.status.saved)
    expect((await savedBusiness(owner)).name).toHaveLength(60)
    await expect(owner.saveBusiness({ name: word(61, 'N') })).rejects.toMatchObject({ code: 'invalid', fields: { name: 'tooLong' } })
    await expect(owner.saveBusiness({ hours: word(301, 'h') })).rejects.toMatchObject({ code: 'invalid', fields: { hours: 'tooLong' } })
  })

  it('merges a seventh line of hours into the sixth on save, keeping every word, and shows the six lines after', async () => {
    const { user, owner } = await open(PAGES.design.path)
    const lines = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat 8 to 5', 'Sun 8 to 2']

    await pasteOver(user, await screen.findByLabelText(design.details.hours), lines.join('\n'))
    await user.click(screen.getByRole('button', { name: design.bar.save }))

    await screen.findByText(design.bar.status.saved)
    expect((await savedBusiness(owner)).hours).toBe('Mon\nTue\nWed\nThu\nFri\nSat 8 to 5 Sun 8 to 2')
    expect(screen.getByLabelText(design.details.hours)).toHaveValue('Mon\nTue\nWed\nThu\nFri\nSat 8 to 5 Sun 8 to 2')
  })

  it('saves an item with the longest name and description and the highest price', async () => {
    const { user, owner } = await open(PAGES.menu.path)
    await user.click(await screen.findByRole('button', { name: items.category.addItemLabel.replace('{name}', 'Hot') }))
    const dialog = within(await screen.findByRole('dialog', { name: productEditor.addTitle }))
    await pasteOver(user, dialog.getByRole('textbox', { name: productEditor.name }), word(80, 'M'))
    await pasteOver(user, dialog.getByRole('textbox', { name: productEditor.description }), word(280, 'd'))
    await user.type(dialog.getByRole('textbox', { name: productEditor.price }), '100000')
    await user.click(dialog.getByRole('button', { name: productEditor.save }))
    await noDialogOpen()

    expect(await productNamed(owner, word(80, 'M'))).toMatchObject({ description: word(280, 'd'), price: 10_000_000 })
    expect(screen.getByRole('button', { name: items.product.editLabel.replace('{name}', word(80, 'M')) })).toBeInTheDocument()
  })

  it('says the price is too high, not badly formed, when the owner types a price over the limit', async () => {
    const { user, owner } = await open(PAGES.menu.path)
    await user.click(await screen.findByRole('button', { name: items.category.addItemLabel.replace('{name}', 'Hot') }))
    const dialog = within(await screen.findByRole('dialog', { name: productEditor.addTitle }))
    await user.type(dialog.getByRole('textbox', { name: productEditor.name }), 'Gold Latte')
    await user.type(dialog.getByRole('textbox', { name: productEditor.price }), '100000.01')
    await user.click(dialog.getByRole('button', { name: productEditor.save }))

    expect(await dialog.findByText(productEditor.errors.price.range)).toBeInTheDocument()
    expect(await hasProduct(owner, 'Gold Latte')).toBe(false)
  })

  it('stops an item name at 80 and a description at 280 characters when longer text is pasted', async () => {
    const { user } = await open(PAGES.menu.path)
    await user.click(await screen.findByRole('button', { name: items.category.addItemLabel.replace('{name}', 'Hot') }))
    const dialog = within(await screen.findByRole('dialog', { name: productEditor.addTitle }))

    await pasteOver(user, dialog.getByRole('textbox', { name: productEditor.name }), word(81, 'M'))
    await pasteOver(user, dialog.getByRole('textbox', { name: productEditor.description }), word(281, 'd'))

    expect((dialog.getByRole('textbox', { name: productEditor.name }) as HTMLInputElement).value).toHaveLength(80)
    expect((dialog.getByRole('textbox', { name: productEditor.description }) as HTMLTextAreaElement).value).toHaveLength(280)
  })

  it('offers no ninth size on an item that has eight, says so, and still saves the item', async () => {
    const { user, owner } = await open(PAGES.menu.path, {
      seed: async (owner) => {
        const menu = await owner.getMenu()
        await owner.saveProduct({
          categoryId: menu.categories[0]?.id ?? '',
          name: 'Soda',
          description: '',
          price: 5000,
          variants: Array.from({ length: 8 }, (_, index) => ({ label: `Size ${index + 1}`, price: 5000 + index * 500 })),
          tags: [],
          available: true,
          image: null,
          groupIds: [],
        })
      },
    })
    await user.click(await screen.findByRole('button', { name: items.product.editLabel.replace('{name}', 'Soda') }))
    const dialog = within(await screen.findByRole('dialog', { name: productEditor.editTitle }))

    expect(dialog.getByRole('button', { name: productEditor.sizes.add })).toBeDisabled()
    expect(dialog.getByText(productEditor.sizes.full.replace('{max}', '8'))).toBeInTheDocument()
    expect(dialog.getByRole('textbox', { name: productEditor.sizes.nameLabel.replace('{n}', '8') })).toHaveValue('Size 8')
    await user.click(dialog.getByRole('button', { name: productEditor.sizes.remove.replace('{name}', 'Size 8') }))
    expect(dialog.getByRole('button', { name: productEditor.sizes.add })).toBeEnabled()
    await user.click(dialog.getByRole('button', { name: productEditor.sizes.add }))
    await user.type(dialog.getByRole('textbox', { name: productEditor.sizes.nameLabel.replace('{n}', '8') }), 'Jumbo')
    await user.type(dialog.getByRole('textbox', { name: productEditor.sizes.priceLabel.replace('{n}', '8') }), '90')
    await user.click(dialog.getByRole('button', { name: productEditor.save }))
    await noDialogOpen()

    expect((await productNamed(owner, 'Soda')).variants.map((variant) => variant.label)).toEqual([...Array.from({ length: 7 }, (_, index) => `Size ${index + 1}`), 'Jumbo'])
  })

  it('offers no twenty-first option in a group that has twenty, and still saves the group', async () => {
    const { user, owner } = await open(`${PAGES.menu.path}?tab=addons`, {
      seed: async (owner) => {
        await owner.saveGroup({
          name: 'Toppings',
          required: false,
          min: 0,
          max: 3,
          options: Array.from({ length: 20 }, (_, index) => ({ label: `Topping ${index + 1}`, price: index * 100 })),
        })
      },
    })
    await user.click(await screen.findByRole('button', { name: addons.group.editLabel.replace('{name}', 'Toppings') }))
    const dialog = within(await screen.findByRole('dialog'))

    expect(dialog.getByText(addons.editor.optionCount.replace('{n}', '20').replace('{max}', '20'))).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: addons.editor.addOption })).toBeDisabled()
    await typeOver(user, dialog.getByRole('textbox', { name: addons.editor.optionName.replace('{n}', '20') }), 'Last one')
    await user.click(dialog.getByRole('button', { name: addons.editor.save }))
    await noDialogOpen()

    const group = (await owner.getMenu()).groups.find((candidate) => candidate.name === 'Toppings')
    expect(group?.options).toHaveLength(20)
    expect(group?.options.at(-1)?.label).toBe('Last one')
  })

  it('refuses the forty-first category in words, and shows all forty with the longest names', async () => {
    const { user, owner } = await open(PAGES.menu.path, {
      seed: async (owner) => {
        let menu = await owner.getMenu()
        for (const category of menu.categories) menu = await owner.deleteCategory(category.id)
        for (let index = 1; index <= 40; index += 1) menu = await owner.saveCategory({ name: `${word(37, 'c')}${String(index).padStart(3, '0')}`, visible: true })
      },
    })

    expect(await screen.findAllByRole('heading', { level: 2 })).toHaveLength(40)
    await user.click(screen.getByRole('button', { name: items.toolbar.addCategory }))
    await user.type(screen.getByRole('textbox', { name: items.category.nameLabel }), 'One too many')
    await user.click(screen.getByRole('button', { name: items.category.save }))

    expect(await screen.findByText(items.category.errors.name.tooMany.replace('{max}', '40'))).toBeInTheDocument()
    expect((await owner.getMenu()).categories).toHaveLength(40)
  })

  it('refuses the thirty-first add-on group by turning the Add group button off and saying why', async () => {
    await open(`${PAGES.menu.path}?tab=addons`, {
      seed: async (owner) => {
        for (let index = 1; index <= 29; index += 1) await owner.saveGroup({ name: `Group ${index}`, required: false, min: 0, max: 1, options: [{ label: 'Yes', price: 0 }] })
      },
    })

    expect(await screen.findByText(addons.limit.replace('{max}', '30'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: addons.add })).toBeDisabled()
  })
})

// ---------------------------------------------------------------------------------------------------------------------
// 9. An owner without a business, and 10. history

describe('An owner without a business', () => {
  it.each([
    ['Overview', PAGES.overview.path],
    ['Menu', PAGES.menu.path],
    ['Design', PAGES.design.path],
    ['Share', PAGES.share.path],
  ])('sends the owner who has no business from %s to the setup wizard, without a flash of the page', async (_name, path) => {
    const { router } = await open(path, { business: false })

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/setup'))
    expect(await screen.findByRole('heading', { level: 1, name: setup.title })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: shell.menu })).not.toBeInTheDocument()
    expect(screen.queryByText(shell.loadError)).not.toBeInTheDocument()
  })

  it('lets the owner with no business open Account, shows who they are and that the menu is not set up, and leads to the wizard', async () => {
    const { user, router } = await open(PAGES.account.path, { business: false })

    expect(router.state.location.pathname).toBe('/dashboard/account')
    expect((await panel(account.profile.title)).getByText(testOwner.email)).toBeInTheDocument()
    const site = await panel(account.menu.title)
    expect(site.getByText(account.menu.none)).toBeInTheDocument()
    expect(sidebar().getAllByRole('link')).toHaveLength(5)

    await user.click(site.getByRole('link', { name: account.menu.setup }))
    expect(await screen.findByRole('heading', { level: 1, name: setup.title })).toBeInTheDocument()
  })

  it('can start a plan before the wizard, and the wizard is still waiting afterwards', async () => {
    const { user, router, billing } = await open(PAGES.account.path, { business: false })

    await user.click(await screen.findByRole('button', { name: account.plans.start.replace('{plan}', account.plans.names.year.toLowerCase()) }))

    await screen.findByRole('heading', { level: 2, name: account.status.active.replace('{plan}', account.plans.names.year) })
    expect((await billing.current()).plan).toBe('year')
    await router.navigate('/dashboard/menu')
    expect(await screen.findByRole('heading', { level: 1, name: setup.title })).toBeInTheDocument()
  })

  it('sends an owner who already has a business from the wizard back to the Overview', async () => {
    const { router } = await open('/dashboard/setup')

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'))
    expect(await screen.findByRole('heading', { level: 1, name: overview.title })).toBeInTheDocument()
  })
})

describe('Browser Back and Forward, and reloads', () => {
  it('follows Back and Forward through the pages the owner visited, one title and one current item each time', async () => {
    const { user, router } = await open(PAGES.overview.path)
    await visit(user, shell.nav.menu, shell.menuPage.title)
    await visit(user, shell.nav.design, design.title)
    await visit(user, shell.nav.share, share.title)

    for (const page of [PAGES.design, PAGES.menu, PAGES.overview]) {
      await router.navigate(-1)
      await screen.findByRole('heading', { level: 1, name: page.title })
      expect(router.state.location.pathname).toBe(page.path)
      expect(sidebar().getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page').map((link) => link.textContent)).toEqual([page.label])
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    }
    for (const page of [PAGES.menu, PAGES.design, PAGES.share]) {
      await router.navigate(1)
      await screen.findByRole('heading', { level: 1, name: page.title })
      expect(router.state.location.pathname).toBe(page.path)
    }
  })

  it('does not step through the Menu tabs with Back, because a tab replaces the address instead of adding to it', async () => {
    const { user, router } = await open(PAGES.overview.path)
    await visit(user, shell.nav.menu, shell.menuPage.title)
    await user.click(screen.getByRole('tab', { name: shell.menuPage.addons }))
    expect(router.state.location.search).toBe('?tab=addons')
    await user.click(screen.getByRole('tab', { name: shell.menuPage.items }))
    expect(router.state.location.search).toBe('')

    await router.navigate(-1)

    expect(await screen.findByRole('heading', { level: 1, name: overview.title })).toBeInTheDocument()
  })

  it('opens the Add-ons tab straight from the address, and falls back to Items for a tab that does not exist', async () => {
    const first = await open(`${PAGES.menu.path}?tab=addons`)
    expect(await screen.findByRole('tab', { name: shell.menuPage.addons })).toHaveAttribute('aria-selected', 'true')
    void first.router.navigate('/dashboard/menu?tab=nope')
    await waitFor(() => expect(screen.getByRole('tab', { name: shell.menuPage.items })).toHaveAttribute('aria-selected', 'true'))
  })

  it('does not trap the owner in a redirect loop: Back from the wizard leaves it, and Forward shows a fresh wizard', async () => {
    const { user, router } = await renderDashboardApp('/', { business: false })
    await router.navigate('/dashboard')
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/setup'))
    await user.type(await screen.findByLabelText(setup.steps.name.label), 'Tsaa Tayo')

    await router.navigate(-1)
    expect(await screen.findByText('Went to /')).toBeInTheDocument()
    await router.navigate(1)
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/setup'))

    expect(await screen.findByLabelText(setup.steps.name.label)).toHaveValue('')
    expect(screen.getByText(setup.progress.replace('{n}', '1').replace('{total}', '4'))).toBeInTheDocument()
  })

  it('goes back from the Overview, after the wizard made the business, to a page that is not the wizard', async () => {
    const { user, router } = await renderGuarded('/', { business: false })
    await router.navigate('/dashboard')
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/setup'))
    await walkToReview(user, 'Tsaa Tayo')
    await user.click(screen.getByRole('button', { name: setup.steps.review.create }))
    await screen.findByRole('heading', { level: 1, name: overview.title })
    await visit(user, shell.nav.menu, shell.menuPage.title)

    await router.navigate(-1)
    expect(await screen.findByRole('heading', { level: 1, name: overview.title })).toBeInTheDocument()
    await router.navigate(-1)
    await waitFor(() => expect(router.state.location.pathname).not.toBe('/dashboard/setup'))
    expect(screen.queryByRole('heading', { level: 1, name: setup.title })).not.toBeInTheDocument()
  })

  it('shows what the server holds after a reload that keeps the server, and loses an unsaved draft', async () => {
    const first = await renderGuarded(PAGES.design.path)
    await typeOver(first.user, await screen.findByLabelText(design.details.name), 'Moon Cafe')
    await first.user.click(screen.getByRole('button', { name: design.bar.save }))
    await screen.findByText(design.bar.status.saved)
    await typeOver(first.user, screen.getByLabelText(design.details.tagline), 'An unsaved line')
    cleanup()

    const second = await renderGuarded(PAGES.design.path, { keep: first })

    expect(await screen.findByLabelText(design.details.name)).toHaveValue('Moon Cafe')
    expect(screen.getByLabelText(design.details.tagline)).toHaveValue(sampleBusiness().tagline)
    expect(screen.getByText(design.bar.upToDate)).toBeInTheDocument()
    expect((await savedBusiness(second.owner)).tagline).toBe(sampleBusiness().tagline)
  })

  it('finishes a save that was sent before a reload, and shows it after', async () => {
    const first = await renderGuarded(PAGES.design.path, { wrapOwner: (real) => slowed(real, {}, 'saveBusiness') })
    await typeOver(first.user, await screen.findByLabelText(design.details.name), 'Moon Cafe')
    await first.user.click(screen.getByRole('button', { name: design.bar.save }))
    cleanup()

    const second = await renderGuarded(PAGES.design.path, { keep: first })

    expect(await screen.findByLabelText(design.details.name)).toHaveValue('Moon Cafe')
    expect((await savedBusiness(second.owner)).name).toBe('Moon Cafe')
  })
})
