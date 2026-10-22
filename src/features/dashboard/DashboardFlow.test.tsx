import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { encode } from 'uqr'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/routes'
import { copy } from '@/config/copy'
import { dashboardCopy } from '@/config/dashboardCopy'
import { auth } from '@/data/auth'
import { DEMO_TAKEN_SLUGS } from '@/data/owner'
import type { OwnerRepository } from '@/data/ownerRepository'
import type { Product } from '@/entities/menu/menu'
import { contrastRatio } from '@/entities/theme/color'
import { mergePresets } from '@/presets'
import { formatPeso } from '@/shared/lib/money'
import { plural } from '@/shared/lib/plural'
import { testOwner } from '@/test/auth'
import { renderDashboardApp } from '@/test/dashboard'
import { sampleImageFile } from '@/test/ownerFixtures'

/*
 * Whole journeys through the owner dashboard: the real shell, the real pages and the real mock repositories, driven the way
 * an owner drives them (clicks, typing, the sidebar). Every step is checked twice: on screen, and in what the repository
 * really kept (`owner.getMenu()`, `owner.getBusiness()`), because a page can look right and have saved nothing.
 *
 * Journeys: 1 the setup wizard, 2 the menu, 3 the design, 4 sharing, 5 the plan, 6 the sidebar, 7 the whole setup checklist,
 * then the app's own route table. All words come from `copy`. The last block keeps the faults these journeys found, each as
 * a test of what should happen. A fault that is not fixed yet is an `it.skip` with a "BUG:" comment, not a bent assertion.
 */

const { shell, setup, overview, items, productEditor, addons, design, share, account } = dashboardCopy
const checklist = overview.checklist

const urlOf = (slug: string) => `${window.location.origin}/m/${slug}`

/** The sidebar (a tab bar on phones). */
const sidebar = () => within(screen.getByRole('navigation', { name: shell.menu }))

/** Clicks an item of the sidebar and waits for the page it leads to (found by its one h1). */
async function visit(user: UserEvent, label: string, title: string) {
  await user.click(sidebar().getByRole('link', { name: label }))
  await screen.findByRole('heading', { level: 1, name: title })
}

/** A panel of a page: the section whose h2 has this name. */
async function panel(name: string) {
  const section = (await screen.findByRole('heading', { level: 2, name })).closest('section')
  if (!section) throw new Error(`No panel called "${name}"`)
  return within(section)
}

type StepId = keyof typeof checklist.steps

/** The Overview's setup checklist: which steps are done, and the count the progress bar reads out. */
async function expectChecklist(done: Record<StepId, boolean>) {
  const list = await panel(checklist.title)
  for (const id of Object.keys(done) as StepId[]) {
    const state = done[id] ? checklist.done : checklist.todo
    expect(list.getByRole('link', { name: `${checklist.steps[id]} ${state}` }), `the step "${id}"`).toBeInTheDocument()
  }
  const count = Object.values(done).filter(Boolean).length
  const words = checklist.progressText.replace('{done}', String(count)).replace('{total}', String(Object.keys(done).length))
  expect(screen.getByRole('progressbar', { name: checklist.progress })).toHaveAttribute('aria-valuetext', words)
}

async function savedBusiness(owner: OwnerRepository) {
  const business = await owner.getBusiness()
  if (!business) throw new Error('The owner has no business')
  return business
}

async function productNamed(owner: OwnerRepository, name: string): Promise<Product> {
  const found = (await owner.getMenu()).products.find((product) => product.name === name)
  if (!found) throw new Error(`The saved menu has no item called ${name}`)
  return found
}

/** The names of the items of one category in the saved menu, in menu order. */
async function itemsOf(owner: OwnerRepository, categoryName: string): Promise<string[]> {
  const menu = await owner.getMenu()
  const category = menu.categories.find((candidate) => candidate.name === categoryName)
  return menu.products.filter((product) => product.categoryId === category?.id).map((product) => product.name)
}

function fileInputIn(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('No file input to choose a picture with')
  return input
}

const noDialogOpen = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

/** The modules of a QR code, read back out of the SVG path the page drew (one run `M x y h n v1 h-n z` per row piece). */
function drawnModules(picture: Element, side: number): { modules: boolean[][]; quietZone: number } {
  const viewBox = (picture.getAttribute('viewBox') ?? '').split(' ').map(Number)
  const quietZone = ((viewBox[2] ?? 0) - side) / 2
  const modules = Array.from({ length: side }, () => Array.from({ length: side }, () => false))
  for (const [, x = '', y = '', length = ''] of (picture.querySelector('path')?.getAttribute('d') ?? '').matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let step = 0; step < Number(length); step += 1) {
      const row = modules[Number(y) - quietZone]
      if (row) row[Number(x) - quietZone + step] = true
    }
  }
  return { modules, quietZone }
}

/** What `uqr` makes of a link, with the level and the (zero) border the Share page asks for. */
const matrixOf = (url: string) => encode(url, { ecc: 'M', border: 0 }).data

const previewRegion = () => screen.getByRole('region', { name: copy.menu.view.previewLabel })

/** The colors the Design preview paints the menu with (the --menu-* variables on its root). */
function previewColors(): Record<'--menu-bg' | '--menu-text' | '--menu-surface' | '--menu-accent', string> {
  const root = previewRegion().querySelector<HTMLElement>('[data-menu-layout]')
  if (!root) throw new Error('The preview has no menu in it')
  const read = (name: string) => root.style.getPropertyValue(name)
  return { '--menu-bg': read('--menu-bg'), '--menu-text': read('--menu-text'), '--menu-surface': read('--menu-surface'), '--menu-accent': read('--menu-accent') }
}

/** Closer to black than to white. */
const isDark = (hex: string) => contrastRatio(hex, '#000000') < contrastRatio(hex, '#ffffff')

/** The four steps of the setup wizard, then "Create my menu". The link is the one the wizard suggests from the name. */
async function runWizard(user: UserEvent, { name, types, samples }: { name: string; types: (keyof typeof setup.types)[]; samples: boolean }) {
  await user.type(await screen.findByLabelText(setup.steps.name.label), name)
  await user.click(screen.getByRole('button', { name: setup.next }))
  for (const type of types) await user.click(await screen.findByRole('checkbox', { name: setup.types[type].label }))
  await user.click(screen.getByRole('button', { name: setup.next }))
  await screen.findByText(setup.steps.link.status.available)
  await user.click(screen.getByRole('button', { name: setup.next }))
  if (!samples) await user.click(await screen.findByRole('checkbox', { name: setup.steps.review.samples.label }))
  await user.click(await screen.findByRole('button', { name: setup.steps.review.create }))
}

describe('Journey 1: a new owner and the setup wizard', () => {
  it('sends a new owner to the wizard, which makes the business with the merged presets and lands on the Overview', async () => {
    const { user, owner, router } = await renderDashboardApp('/dashboard', { business: false })

    // No business yet: the Overview sends the owner to the wizard, which has no sidebar.
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/setup'))
    expect(await screen.findByRole('heading', { level: 1, name: setup.title })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: shell.menu })).not.toBeInTheDocument()
    expect(await owner.getBusiness()).toBeNull()

    // Step 1: the name.
    expect(screen.getByText(setup.progress.replace('{n}', '1').replace('{total}', '4'))).toBeInTheDocument()
    await user.type(screen.getByLabelText(setup.steps.name.label), 'Tsaa Tayo')
    await user.click(screen.getByRole('button', { name: setup.next }))

    // Step 2: milk tea and bakery.
    expect(await screen.findByRole('heading', { name: setup.steps.types.heading })).toHaveFocus()
    await user.click(screen.getByRole('checkbox', { name: setup.types.milkTea.label }))
    await user.click(screen.getByRole('checkbox', { name: setup.types.bakery.label }))
    await user.click(screen.getByRole('button', { name: setup.next }))

    // Step 3: the link follows the name, and is free.
    expect(await screen.findByRole('heading', { name: setup.steps.link.heading })).toHaveFocus()
    expect(screen.getByLabelText(setup.steps.link.label)).toHaveValue('tsaa-tayo')
    expect(await screen.findByText(setup.steps.link.status.available)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: setup.next }))

    // Step 4: the review, with the example items on.
    expect(await screen.findByRole('heading', { name: setup.steps.review.heading })).toHaveFocus()
    expect(screen.getByText('Tsaa Tayo')).toBeInTheDocument()
    expect(screen.getByText(`${setup.types.milkTea.label}, ${setup.types.bakery.label}`)).toBeInTheDocument()
    expect(screen.getByText('/m/tsaa-tayo')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: setup.steps.review.samples.label })).toBeChecked()
    await user.click(screen.getByRole('button', { name: setup.steps.review.create }))

    // The Overview, with the sidebar around it.
    const title = await screen.findByRole('heading', { level: 1, name: overview.title })
    expect(router.state.location.pathname).toBe('/dashboard')
    // The wizard's button is gone, so the focus is on the title of the page the owner lands on.
    await waitFor(() => expect(title).toHaveFocus())
    expect(sidebar().getByRole('link', { name: shell.nav.overview })).toHaveAttribute('aria-current', 'page')

    // What the repository really kept: the business, and the merged menu.
    const merged = mergePresets(['milkTea', 'bakery'])
    const business = await savedBusiness(owner)
    expect(business).toMatchObject({ name: 'Tsaa Tayo', slug: 'tsaa-tayo', types: ['milkTea', 'bakery'], published: false })
    expect(business.theme).toEqual(merged.theme)
    const menu = await owner.getMenu()
    expect(menu.categories.map((category) => category.name)).toEqual(merged.categories)
    expect(menu.groups.map((group) => group.name)).toEqual(merged.groups.map((group) => group.name))
    expect(menu.products.map((product) => product.name).sort()).toEqual(merged.samples.map((sample) => sample.name).sort())
    for (const sample of merged.samples) {
      const product = menu.products.find((candidate) => candidate.name === sample.name)
      expect(menu.categories.find((category) => category.id === product?.categoryId)?.name, sample.name).toBe(sample.category)
      expect(product?.price, sample.name).toBe(sample.price)
    }
    // Milk tea comes in sizes, the bakery sells by the piece.
    expect((await productNamed(owner, 'Classic Pearl Milk Tea')).variants.map((variant) => variant.label)).toEqual(['M', 'L'])
    expect((await productNamed(owner, 'Pandesal, 10 pieces')).variants).toEqual([])

    // The Overview of a new menu: a draft, one step done (the items), the visitor panel has items to show.
    expect(await screen.findByRole('heading', { level: 2, name: overview.status.draft.title })).toBeInTheDocument()
    await expectChecklist({ items: true, details: false, logo: false, publish: false, plan: false })
    const visitors = await panel(overview.visitors.title)
    expect(await visitors.findByText(overview.visitors.demo)).toBeInTheDocument()
    expect(visitors.queryByText(overview.visitors.empty)).not.toBeInTheDocument()

    // The Menu page holds what the wizard made.
    await visit(user, shell.nav.menu, shell.menuPage.title)
    for (const category of merged.categories) {
      expect(screen.getByRole('heading', { level: 2, name: category })).toBeInTheDocument()
    }
    expect(screen.getByText(plural(merged.samples.length, items.toolbar.count))).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: shell.menuPage.addons }))
    for (const group of merged.groups) {
      expect(screen.getByRole('heading', { level: 3, name: group.name })).toBeInTheDocument()
    }
  }, 30_000)

  it('makes a menu with categories and add-ons but no items when the example items are turned off', async () => {
    const { user, owner, router } = await renderDashboardApp('/dashboard', { business: false })
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/setup'))

    await runWizard(user, { name: 'Tsaa Tayo', types: ['milkTea'], samples: false })

    await screen.findByRole('heading', { level: 1, name: overview.title })
    expect((await owner.getMenu()).products).toEqual([])
    expect((await owner.getMenu()).categories.length).toBeGreaterThan(0)
    // Nothing to count yet: the first step waits, and the visitor panel says what to do first.
    await expectChecklist({ items: false, details: false, logo: false, publish: false, plan: false })
    expect((await panel(overview.visitors.title)).getByText(overview.visitors.empty)).toBeInTheDocument()
  })
})

describe('Journey 2: the owner builds the menu', () => {
  it('adds a category and items with sizes and a photo, makes and attaches an add-on, marks sold out, moves, searches and deletes, with the saved menu right after each step', async () => {
    const { user, owner } = await renderDashboardApp('/dashboard', { menu: 'preset' })

    // The Overview starts with no items; its first step leads to the Menu page.
    await expectChecklist({ items: false, details: true, logo: false, publish: false, plan: false })
    await user.click(screen.getByRole('link', { name: `${checklist.steps.items} ${checklist.todo}` }))
    await screen.findByRole('heading', { level: 1, name: shell.menuPage.title })

    // 1. A category.
    await user.click(await screen.findByRole('button', { name: items.toolbar.addCategory }))
    await user.type(screen.getByRole('textbox', { name: items.category.nameLabel }), 'Seasonal')
    await user.click(screen.getByRole('button', { name: items.category.save }))
    expect(await screen.findByText(items.category.added.replace('{name}', 'Seasonal'))).toBeInTheDocument()
    const seasonal = (await owner.getMenu()).categories.at(-1)
    expect(seasonal).toMatchObject({ name: 'Seasonal', visible: true })
    const seasonalId = seasonal?.id ?? ''
    expect(screen.getByRole('heading', { level: 2, name: 'Seasonal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: items.toolbar.addCategory })).toHaveFocus()

    // 2a. A first, plain item in it, so the next one has a neighbour to move past.
    const addItemTo = () => screen.getByRole('button', { name: items.category.addItemLabel.replace('{name}', 'Seasonal') })
    await user.click(addItemTo())
    let dialog = await screen.findByRole('dialog', { name: productEditor.addTitle })
    expect(within(dialog).getByRole('combobox', { name: productEditor.category })).toHaveDisplayValue('Seasonal')
    await user.type(within(dialog).getByRole('textbox', { name: productEditor.name }), 'Maple Cold Brew')
    await user.type(within(dialog).getByRole('textbox', { name: productEditor.price }), '140')
    await user.click(within(dialog).getByRole('button', { name: productEditor.save }))
    await noDialogOpen()
    expect(await itemsOf(owner, 'Seasonal')).toEqual(['Maple Cold Brew'])
    expect(await productNamed(owner, 'Maple Cold Brew')).toMatchObject({ categoryId: seasonalId, price: 14000, variants: [], available: true, image: null })
    expect(addItemTo()).toHaveFocus()

    // The Overview now counts the first item.
    await visit(user, shell.nav.overview, overview.title)
    await expectChecklist({ items: true, details: true, logo: false, publish: false, plan: false })
    await visit(user, shell.nav.menu, shell.menuPage.title)
    expect(await screen.findByRole('heading', { level: 2, name: 'Seasonal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: items.product.editLabel.replace('{name}', 'Maple Cold Brew') })).toBeInTheDocument()

    // 2b. The item with two sizes and a photo.
    await user.click(addItemTo())
    dialog = await screen.findByRole('dialog', { name: productEditor.addTitle })
    const form = within(dialog)
    await user.type(form.getByRole('textbox', { name: productEditor.name }), 'Pumpkin Spice Latte')
    await user.click(form.getByRole('button', { name: productEditor.mode.sizes }))
    await user.type(form.getByRole('textbox', { name: productEditor.sizes.nameLabel.replace('{n}', '1') }), 'Tall')
    await user.type(form.getByRole('textbox', { name: productEditor.sizes.priceLabel.replace('{n}', '1') }), '150')
    await user.click(form.getByRole('button', { name: productEditor.sizes.add }))
    await user.type(form.getByRole('textbox', { name: productEditor.sizes.nameLabel.replace('{n}', '2') }), 'Grande')
    await user.type(form.getByRole('textbox', { name: productEditor.sizes.priceLabel.replace('{n}', '2') }), '170')
    await user.upload(fileInputIn(dialog), sampleImageFile('png'))
    expect(await form.findByRole('img', { name: productEditor.photo.alt })).toHaveAttribute('src', expect.stringMatching(/^data:image\/png;base64,/))
    await user.click(form.getByRole('button', { name: productEditor.save }))
    await noDialogOpen()

    const latte = await productNamed(owner, 'Pumpkin Spice Latte')
    expect(latte).toMatchObject({ categoryId: seasonalId, price: 15000, available: true, groupIds: [] })
    expect(latte.variants.map(({ label, price }) => ({ label, price }))).toEqual([
      { label: 'Tall', price: 15000 },
      { label: 'Grande', price: 17000 },
    ])
    expect(latte.image).toMatch(/^data:image\/png;base64,/)
    expect(await itemsOf(owner, 'Seasonal')).toEqual(['Maple Cold Brew', 'Pumpkin Spice Latte'])
    const rowOf = (name: string) => screen.getByRole('button', { name: items.product.editLabel.replace('{name}', name) }).closest('li') as HTMLElement
    expect(within(rowOf('Pumpkin Spice Latte')).getByText(new RegExp(items.product.from.replace('{price}', formatPeso(15000))))).toHaveTextContent(plural(2, items.product.sizes))
    expect(rowOf('Pumpkin Spice Latte').querySelector('img')).toHaveAttribute('src', latte.image)
    expect(addItemTo()).toHaveFocus()

    // 3. An add-on group, made on the Add-ons tab.
    await user.click(screen.getByRole('tab', { name: shell.menuPage.addons }))
    await user.click(screen.getByRole('button', { name: addons.add }))
    const groupDialog = within(await screen.findByRole('dialog', { name: addons.editor.addTitle }))
    await user.type(groupDialog.getByRole('textbox', { name: addons.editor.name }), 'Whipped cream')
    await user.type(groupDialog.getByRole('textbox', { name: addons.editor.optionName.replace('{n}', '1') }), 'Extra whip')
    await user.type(groupDialog.getByRole('textbox', { name: addons.editor.optionPrice.replace('{n}', '1') }), '15')
    await user.click(groupDialog.getByRole('button', { name: addons.editor.save }))
    await noDialogOpen()
    expect(await screen.findByText(addons.announce.added.replace('{name}', 'Whipped cream'))).toBeInTheDocument()
    const group = (await owner.getMenu()).groups.at(-1)
    expect(group).toMatchObject({ name: 'Whipped cream', required: false, min: 0, max: 1 })
    expect(group?.options.map(({ label, price }) => ({ label, price }))).toEqual([{ label: 'Extra whip', price: 1500 }])
    const card = within(screen.getByRole('heading', { level: 3, name: 'Whipped cream' }).closest('li') as HTMLElement)
    expect(card.getByText(addons.group.unused)).toBeInTheDocument()

    // 4. Attach it to the latte, from the item's editor on the Items tab.
    await user.click(screen.getByRole('tab', { name: shell.menuPage.items }))
    await user.click(screen.getByRole('button', { name: items.product.editLabel.replace('{name}', 'Pumpkin Spice Latte') }))
    const editing = within(await screen.findByRole('dialog', { name: productEditor.editTitle }))
    expect(editing.getByRole('textbox', { name: productEditor.name })).toHaveValue('Pumpkin Spice Latte')
    await user.click(editing.getByRole('checkbox', { name: 'Whipped cream' }))
    await user.click(editing.getByRole('button', { name: productEditor.save }))
    await noDialogOpen()
    const attached = await productNamed(owner, 'Pumpkin Spice Latte')
    expect(attached.groupIds).toEqual([group?.id])
    // Saving the editor changed the add-on and nothing else: same sizes (same ids), same photo, same place.
    expect(attached.variants).toEqual(latte.variants)
    expect(attached).toMatchObject({ price: 15000, image: latte.image, available: true, categoryId: seasonalId })
    expect(await itemsOf(owner, 'Seasonal')).toEqual(['Maple Cold Brew', 'Pumpkin Spice Latte'])
    expect(screen.getByRole('button', { name: items.product.editLabel.replace('{name}', 'Pumpkin Spice Latte') })).toHaveFocus()
    await user.click(screen.getByRole('tab', { name: shell.menuPage.addons }))
    expect(within(screen.getByRole('heading', { level: 3, name: 'Whipped cream' }).closest('li') as HTMLElement).getByText(plural(1, addons.group.usedBy))).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: shell.menuPage.items }))

    // 5. Sold out.
    const available = () => screen.getByRole('switch', { name: `${items.product.available}: Pumpkin Spice Latte` })
    expect(available()).toHaveAttribute('aria-checked', 'true')
    await user.click(available())
    expect(await screen.findByText(items.product.nowSoldOut.replace('{name}', 'Pumpkin Spice Latte'))).toBeInTheDocument()
    expect(available()).toHaveAttribute('aria-checked', 'false')
    expect(within(rowOf('Pumpkin Spice Latte')).getByText(items.product.soldOut)).toBeInTheDocument()
    expect(await productNamed(owner, 'Pumpkin Spice Latte')).toEqual({ ...attached, available: false })

    // The Design page's preview draws the menu as the Menu page left it: sold out, from the lowest size, with its photo and add-ons.
    await visit(user, shell.nav.design, design.title)
    const drawn = within(previewRegion()).getByRole('heading', { level: 4, name: 'Pumpkin Spice Latte' }).closest('li') as HTMLElement
    expect(drawn).toHaveTextContent(copy.menu.view.soldOut)
    expect(drawn).toHaveTextContent(copy.menu.view.from.replace('{price}', formatPeso(15000)))
    expect(drawn).toHaveTextContent(copy.menu.view.addOnsAvailable)
    expect(drawn.querySelector('img')).toHaveAttribute('src', latte.image)
    await visit(user, shell.nav.menu, shell.menuPage.title)
    expect(await screen.findByRole('heading', { level: 2, name: 'Seasonal' })).toBeInTheDocument()

    // 6. Moved above the first item of its category.
    await user.click(screen.getByRole('button', { name: items.product.moveUp.replace('{name}', 'Pumpkin Spice Latte') }))
    expect(await screen.findByText(items.product.moved.replace('{name}', 'Pumpkin Spice Latte').replace('{n}', '1').replace('{count}', '2'))).toBeInTheDocument()
    expect(await itemsOf(owner, 'Seasonal')).toEqual(['Pumpkin Spice Latte', 'Maple Cold Brew'])
    expect(screen.getByRole('button', { name: items.product.moveUp.replace('{name}', 'Pumpkin Spice Latte') })).toBeDisabled()
    expect(screen.getByRole('button', { name: items.product.moveDown.replace('{name}', 'Maple Cold Brew') })).toBeDisabled()

    // 7. Found by search: only its category is left, and nothing is moved while the list is partial.
    await user.type(screen.getByRole('searchbox', { name: items.toolbar.searchLabel }), 'pumpkin')
    expect(await screen.findByText(plural(1, items.toolbar.results))).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Seasonal' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Hot' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: items.product.editLabel.replace('{name}', 'Maple Cold Brew') })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: items.product.moveUp.replace('{name}', 'Pumpkin Spice Latte') })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: items.toolbar.clearSearch }))
    expect(screen.getByRole('heading', { level: 2, name: 'Hot' })).toBeInTheDocument()

    // 8. Deleted, after the question. "Keep it" keeps it; the saved menu still has it until the owner agrees.
    await user.click(screen.getByRole('button', { name: items.product.deleteLabel.replace('{name}', 'Pumpkin Spice Latte') }))
    const question = within(await screen.findByRole('dialog', { name: items.product.deleteTitle.replace('{name}', 'Pumpkin Spice Latte') }))
    await user.click(question.getByRole('button', { name: items.dialog.cancel }))
    await noDialogOpen()
    expect(await itemsOf(owner, 'Seasonal')).toEqual(['Pumpkin Spice Latte', 'Maple Cold Brew'])
    await user.click(screen.getByRole('button', { name: items.product.deleteLabel.replace('{name}', 'Pumpkin Spice Latte') }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: items.product.confirmDelete }))
    await noDialogOpen()
    expect(await screen.findByText(items.product.deleted.replace('{name}', 'Pumpkin Spice Latte'))).toBeInTheDocument()
    expect(await itemsOf(owner, 'Seasonal')).toEqual(['Maple Cold Brew'])
    expect(screen.getByRole('button', { name: items.product.editLabel.replace('{name}', 'Maple Cold Brew') })).toHaveFocus()

    // The group stays, and no item uses it any more.
    const menu = await owner.getMenu()
    expect(menu.groups.map((candidate) => candidate.id)).toContain(group?.id)
    await user.click(screen.getByRole('tab', { name: shell.menuPage.addons }))
    expect(within(screen.getByRole('heading', { level: 3, name: 'Whipped cream' }).closest('li') as HTMLElement).getByText(addons.group.unused)).toBeInTheDocument()
  }, 30_000)

  it('keeps the first checklist step of the Overview in step with the items: open, done once an item exists, open again when the last is gone', async () => {
    const { user, owner } = await renderDashboardApp('/dashboard/menu', { menu: 'preset' })

    await user.click(await screen.findByRole('button', { name: items.category.addItemLabel.replace('{name}', 'Hot') }))
    const form = within(await screen.findByRole('dialog', { name: productEditor.addTitle }))
    await user.type(form.getByRole('textbox', { name: productEditor.name }), 'Americano')
    await user.type(form.getByRole('textbox', { name: productEditor.price }), '120')
    await user.click(form.getByRole('button', { name: productEditor.save }))
    await noDialogOpen()
    expect(await itemsOf(owner, 'Hot')).toEqual(['Americano'])

    await visit(user, shell.nav.overview, overview.title)
    await expectChecklist({ items: true, details: true, logo: false, publish: false, plan: false })
    expect((await panel(overview.visitors.title)).queryByText(overview.visitors.empty)).not.toBeInTheDocument()

    await visit(user, shell.nav.menu, shell.menuPage.title)
    await user.click(await screen.findByRole('button', { name: items.product.deleteLabel.replace('{name}', 'Americano') }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: items.product.confirmDelete }))
    await noDialogOpen()
    expect((await owner.getMenu()).products).toEqual([])

    await visit(user, shell.nav.overview, overview.title)
    await expectChecklist({ items: false, details: true, logo: false, publish: false, plan: false })
    expect((await panel(overview.visitors.title)).getByText(overview.visitors.empty)).toBeInTheDocument()
  })
})

describe('Journey 3: the owner designs the business', () => {
  it('changes the name, phone, logo and accent, sees them unsaved in the preview, saves, and finds them again from the Overview', async () => {
    const { user, owner, router } = await renderDashboardApp('/dashboard', { details: false })
    const before = await savedBusiness(owner)

    // The Overview asks for the contact details and the logo, and the step leads to the Design page.
    await expectChecklist({ items: true, details: false, logo: false, publish: false, plan: false })
    await user.click(screen.getByRole('link', { name: `${checklist.steps.details} ${checklist.todo}` }))
    await screen.findByRole('heading', { level: 1, name: design.title })
    expect(router.state.location.pathname).toBe('/dashboard/design')

    const nameBox = () => screen.getByLabelText(design.details.name)
    const preview = () => within(previewRegion())
    const save = () => screen.getByRole('button', { name: design.bar.save })
    expect(save()).toBeDisabled()

    // Name, phone and logo on the Details tab.
    await user.clear(nameBox())
    await user.type(nameBox(), 'Kape Kanto Cebu')
    await user.type(screen.getByLabelText(design.details.phone), '+63 917 555 0199')
    await user.upload(fileInputIn(document.body), sampleImageFile('png'))
    const logo = await screen.findByRole('img', { name: design.details.logo.alt })
    expect(logo).toHaveAttribute('src', expect.stringMatching(/^data:image\/png;base64,/))

    // The accent on the Look tab.
    await user.click(screen.getByRole('tab', { name: design.tabs.look }))
    await user.clear(screen.getByLabelText(design.look.primary))
    await user.type(screen.getByLabelText(design.look.primary), '#6b3f1d')

    // The preview shows all of it, and nothing is saved yet.
    expect(preview().getByRole('heading', { name: 'Kape Kanto Cebu' })).toBeInTheDocument()
    // The preview is not interactive: the phone is text there, not a link to call (the public page draws the link).
    expect(preview().getByText('+63 917 555 0199')).toBeInTheDocument()
    expect(preview().queryByRole('link')).not.toBeInTheDocument()
    expect(previewRegion().querySelector('header img')).toHaveAttribute('src', logo.getAttribute('src'))
    expect(previewColors()['--menu-accent']).toBe('#6b3f1d')
    expect(screen.getByText(design.bar.unsaved)).toBeInTheDocument()
    expect(await savedBusiness(owner)).toEqual(before)

    // Save.
    await user.click(save())
    expect(await screen.findByText(design.bar.status.saved)).toBeInTheDocument()
    const saved = await savedBusiness(owner)
    expect(saved).toEqual({ ...before, name: 'Kape Kanto Cebu', phone: '+63 917 555 0199', logo: logo.getAttribute('src'), theme: { ...before.theme, primary: '#6b3f1d' } })
    expect(save()).toBeDisabled()
    expect(screen.getByText(design.bar.upToDate)).toBeInTheDocument()

    // The Overview, reached through the sidebar, reads the same business: the contact step and the logo step are done.
    await visit(user, shell.nav.overview, overview.title)
    await expectChecklist({ items: true, details: true, logo: true, publish: false, plan: false })

    // Back on the Design page, nothing is local to the first visit: the saved values fill the page.
    await visit(user, shell.nav.design, design.title)
    expect(nameBox()).toHaveValue('Kape Kanto Cebu')
    expect(screen.getByLabelText(design.details.phone)).toHaveValue('+63 917 555 0199')
    expect(screen.getByRole('img', { name: design.details.logo.alt })).toHaveAttribute('src', saved.logo)
    expect(preview().getByRole('heading', { name: 'Kape Kanto Cebu' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: design.tabs.look }))
    expect(screen.getByLabelText(design.look.primary)).toHaveValue('#6b3f1d')
    expect(save()).toBeDisabled()
  }, 30_000)

  it('shows the name the owner is typing in the preview, and Discard goes back to the saved name', async () => {
    const { user, owner } = await renderDashboardApp('/dashboard/design')
    await screen.findByRole('heading', { level: 1, name: design.title })
    const preview = () => within(previewRegion())

    await user.clear(screen.getByLabelText(design.details.name))
    await user.type(screen.getByLabelText(design.details.name), 'Moon Cafe')
    expect(preview().getByRole('heading', { name: 'Moon Cafe' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: design.bar.discard }))
    expect(preview().getByRole('heading', { name: 'Kape Kanto' })).toBeInTheDocument()
    expect(screen.getByLabelText(design.details.name)).toHaveValue('Kape Kanto')
    expect((await savedBusiness(owner)).name).toBe('Kape Kanto')
  })
})

describe('Journey 4: the owner shares the menu', () => {
  it('publishes from Share, the Overview says the menu is live with its link, and hiding it makes it a draft again', async () => {
    const { user, owner } = await renderDashboardApp('/dashboard/share')

    const publish = await screen.findByRole('switch', { name: share.publish.label })
    expect(publish).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText(share.link.notLive)).toBeInTheDocument()
    await user.click(publish)
    expect(await screen.findByText(share.publish.nowPublished)).toBeInTheDocument()
    expect(publish).toHaveAttribute('aria-checked', 'true')
    expect((await savedBusiness(owner)).published).toBe(true)
    expect(screen.queryByText(share.link.notLive)).not.toBeInTheDocument()

    await visit(user, shell.nav.overview, overview.title)
    const status = await panel(overview.status.live.title)
    expect(status.getByText(urlOf('kape-kanto'))).toBeInTheDocument()
    expect(status.getByRole('button', { name: share.link.copy })).toBeInTheDocument()
    const open = status.getByRole('link', { name: new RegExp(`^${share.link.open}`) })
    // Demo mode: a new tab would have none of this tab's data, so Open leads to the owner's preview in the same tab.
    expect(open).toHaveAttribute('href', '/dashboard/preview')
    expect(open).not.toHaveAttribute('target')
    await user.click(status.getByRole('button', { name: share.link.copy }))
    expect(await status.findByText(share.link.copied)).toBeInTheDocument()
    expect(await navigator.clipboard.readText()).toBe(urlOf('kape-kanto'))
    await expectChecklist({ items: true, details: true, logo: false, publish: true, plan: false })

    await visit(user, shell.nav.share, share.title)
    await user.click(await screen.findByRole('switch', { name: share.publish.label }))
    expect(await screen.findByText(share.publish.nowHidden)).toBeInTheDocument()
    expect((await savedBusiness(owner)).published).toBe(false)

    await visit(user, shell.nav.overview, overview.title)
    const draft = await panel(overview.status.draft.title)
    await user.click(draft.getByRole('link', { name: overview.status.draft.action }))
    expect(await screen.findByRole('heading', { level: 1, name: share.title })).toBeInTheDocument()
  })

  it('says a published menu is paused when the plan has ended, on Share and the Overview, and a new plan turns it on again', async () => {
    const { user } = await renderDashboardApp('/dashboard/share', { published: true, plan: 'ended' })

    // Share: still published, and told plainly that nothing was deleted.
    expect(await screen.findByRole('switch', { name: share.publish.label })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(share.publish.paused)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: share.publish.account })).toHaveAttribute('href', '/dashboard/account')

    // The Overview: paused, with no link to copy, and a way to the plans.
    await visit(user, shell.nav.overview, overview.title)
    const status = await panel(overview.status.paused.title)
    expect(status.queryByRole('button', { name: share.link.copy })).not.toBeInTheDocument()
    expect((await panel(overview.plan.title)).getByText(overview.plan.trialEnded)).toBeInTheDocument()
    await user.click(status.getByRole('link', { name: overview.status.paused.action }))
    await screen.findByRole('heading', { level: 1, name: account.title })

    // The monthly plan, started on the Account page, brings the menu back.
    expect(await screen.findByRole('heading', { level: 2, name: account.status.trialEnded })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: new RegExp(account.plans.names.month) }))
    await user.click(screen.getByRole('button', { name: account.plans.start.replace('{plan}', account.plans.names.month.toLowerCase()) }))
    expect(await screen.findByRole('heading', { level: 2, name: account.status.active.replace('{plan}', account.plans.names.month) })).toBeInTheDocument()

    await visit(user, shell.nav.overview, overview.title)
    expect((await panel(overview.status.live.title)).getByText(urlOf('kape-kanto'))).toBeInTheDocument()
  })

  it('changes the link: a taken one is refused, a free one is kept after the question, and the new link is the same on Share and on the Overview', async () => {
    const { user, owner } = await renderDashboardApp('/dashboard/share', { published: true })
    const taken = DEMO_TAKEN_SLUGS[0] ?? ''
    const newSlug = 'kape-kanto-cebu'
    const oldUrl = urlOf('kape-kanto')
    const newUrl = urlOf(newSlug)

    // The QR code on the page is the code of the link.
    const before = drawnModules(await screen.findByRole('img', { name: share.qr.label.replace('{url}', oldUrl) }), matrixOf(oldUrl).length)
    expect(before.modules).toEqual(matrixOf(oldUrl))
    expect(before.quietZone).toBeGreaterThanOrEqual(4)

    await user.click(screen.getByRole('button', { name: share.link.change }))
    const box = screen.getByLabelText(share.change.label)
    const submit = () => screen.getByRole('button', { name: share.change.submit })

    // A link someone else uses is refused, in words, and cannot be saved.
    await user.clear(box)
    await user.type(box, taken)
    expect(await screen.findByText(share.change.status.taken)).toBeInTheDocument()
    expect(submit()).toBeDisabled()

    // A free one is accepted, and shows the whole new link.
    await user.clear(box)
    await user.type(box, newSlug)
    expect(await screen.findByText(share.change.status.available)).toBeInTheDocument()
    expect(screen.getByText(share.change.preview.replace('{url}', newUrl))).toBeInTheDocument()

    // Nothing changes before the question is answered, and "Keep the old link" keeps it.
    await user.click(submit())
    const question = await screen.findByRole('dialog', { name: share.change.confirm.title })
    expect(question).toHaveTextContent(newUrl)
    expect(question).toHaveTextContent(oldUrl)
    expect((await savedBusiness(owner)).slug).toBe('kape-kanto')
    await user.click(within(question).getByRole('button', { name: share.change.confirm.cancel }))
    await noDialogOpen()
    expect((await savedBusiness(owner)).slug).toBe('kape-kanto')

    await user.click(submit())
    await user.click(within(await screen.findByRole('dialog', { name: share.change.confirm.title })).getByRole('button', { name: share.change.confirm.confirm }))
    expect(await screen.findByText(share.link.changed)).toBeInTheDocument()
    expect((await savedBusiness(owner)).slug).toBe(newSlug)
    expect(screen.getByRole('button', { name: share.link.change })).toHaveFocus()

    // Share shows the new link everywhere it shows a link, and the old one nowhere.
    expect(screen.getByLabelText(share.link.label)).toHaveValue(newUrl)
    expect(screen.getByRole('link', { name: new RegExp(`^${share.link.open}`) })).toHaveAttribute('href', '/dashboard/preview')
    expect(screen.getByText(newUrl, { selector: 'code' })).toBeInTheDocument()
    expect(screen.queryByText(oldUrl, { selector: 'code' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: share.qr.label.replace('{url}', oldUrl) })).not.toBeInTheDocument()

    // The QR code is drawn again, for the new link: it is the code `uqr` makes of the whole URL, and not the old one.
    const after = drawnModules(screen.getByRole('img', { name: share.qr.label.replace('{url}', newUrl) }), matrixOf(newUrl).length)
    expect(after.modules).toEqual(matrixOf(newUrl))
    expect(after.quietZone).toBeGreaterThanOrEqual(4)
    expect(matrixOf(newUrl)).not.toEqual(matrixOf(oldUrl))

    // The Overview, still live, has the same link.
    await visit(user, shell.nav.overview, overview.title)
    const status = await panel(overview.status.live.title)
    expect(status.getByText(newUrl)).toBeInTheDocument()
    expect(status.getByRole('link', { name: new RegExp(`^${share.link.open}`) })).toHaveAttribute('href', '/dashboard/preview')
    expect(screen.queryByText(oldUrl)).not.toBeInTheDocument()
  }, 30_000)
})

describe('Journey 5: the owner starts a plan', () => {
  it('starts the monthly plan on Account, and the Overview plan panel, the free cards and the checklist change with it', async () => {
    const { user } = await renderDashboardApp('/dashboard')

    // Before: a trial, and the free cards are waiting for a plan.
    const plan = await panel(overview.plan.title)
    expect(await plan.findByText(plural(7, overview.plan.trial))).toBeInTheDocument()
    expect(plan.getByRole('link', { name: overview.plan.start })).toBeInTheDocument()
    const cardsTitle = plural(2, overview.freeCards.title)
    expect((await panel(cardsTitle)).getByText(overview.freeCards.waiting)).toBeInTheDocument()
    await expectChecklist({ items: true, details: true, logo: false, publish: false, plan: false })

    // The plan is chosen and started on the Account page.
    await user.click(plan.getByRole('link', { name: overview.plan.start }))
    await screen.findByRole('heading', { level: 1, name: account.title })
    expect(await screen.findByRole('heading', { level: 2, name: plural(7, account.status.trial) })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: new RegExp(account.plans.names.month) }))
    await user.click(screen.getByRole('button', { name: account.plans.start.replace('{plan}', account.plans.names.month.toLowerCase()) }))
    expect(await screen.findByRole('heading', { level: 2, name: account.status.active.replace('{plan}', account.plans.names.month) })).toBeInTheDocument()
    const renews = screen.getByText(/^Renews on /).textContent ?? ''
    expect((await panel(account.freeCards.title.replace('{n}', '2'))).getByText(account.freeCards.ready)).toBeInTheDocument()

    // After: the same facts on the Overview.
    await visit(user, shell.nav.overview, overview.title)
    const active = await panel(overview.plan.title)
    expect(await active.findByText(overview.plan.active.replace('{plan}', overview.plan.names.month))).toBeInTheDocument()
    expect(active.getByText(renews)).toBeInTheDocument()
    expect(active.getByRole('link', { name: overview.plan.manage })).toBeInTheDocument()
    expect((await panel(cardsTitle)).getByText(overview.freeCards.ready)).toBeInTheDocument()
    await expectChecklist({ items: true, details: true, logo: false, publish: false, plan: true })

    // And on Share.
    await visit(user, shell.nav.share, share.title)
    expect((await panel(share.cards.title.replace('{n}', '2'))).getByText(share.cards.ready)).toBeInTheDocument()
  })
})

describe('Journey 6: moving around with the sidebar', () => {
  const pages = [
    { label: shell.nav.overview, title: overview.title, path: '/dashboard' },
    { label: shell.nav.menu, title: shell.menuPage.title, path: '/dashboard/menu' },
    { label: shell.nav.design, title: design.title, path: '/dashboard/design' },
    { label: shell.nav.share, title: share.title, path: '/dashboard/share' },
    { label: shell.nav.account, title: account.title, path: '/dashboard/account' },
  ]

  it('reaches every page from the sidebar, and the document title, the one h1 and the current item follow', async () => {
    const { user, router } = await renderDashboardApp('/dashboard')

    // Round the sidebar and back to the start, so every page is entered from every other kind of page.
    for (const page of [...pages, pages[0]!]) {
      await visit(user, page.label, page.title)
      expect(router.state.location.pathname).toBe(page.path)
      await waitFor(() => expect(document.title).toBe(page.title))
      expect(screen.getAllByRole('heading', { level: 1 }).map((heading) => heading.textContent)).toEqual([page.title])
      expect(screen.getAllByRole('main')).toHaveLength(1)
      const current = sidebar().getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page')
      expect(current.map((link) => link.textContent)).toEqual([page.label])
    }
  })

  it('lists the five pages in the sidebar and offers the skip link to the main content', async () => {
    await renderDashboardApp('/dashboard')
    expect(sidebar().getAllByRole('link').map((link) => link.textContent)).toEqual(pages.map((page) => page.label))
    expect(screen.getByRole('link', { name: shell.skip })).toHaveAttribute('href', `#${screen.getByRole('main').id}`)
  })
})

describe('Journey 7: finishing the setup checklist', () => {
  it('follows each step of the Overview checklist to its page, one by one, until the Overview says everything is set', async () => {
    const { user, owner } = await renderDashboardApp('/dashboard', { menu: 'preset', details: false })
    const done: Record<StepId, boolean> = { items: false, details: false, logo: false, publish: false, plan: false }
    const stepLink = (id: StepId) => screen.getByRole('link', { name: `${checklist.steps[id]} ${checklist.todo}` })
    const save = () => screen.getByRole('button', { name: design.bar.save })
    const backToOverview = async () => {
      await visit(user, shell.nav.overview, overview.title)
      await expectChecklist(done)
    }
    await expectChecklist(done)
    expect(screen.queryByText(checklist.allDone)).not.toBeInTheDocument()

    // The first item: the step leads to the Menu page.
    await user.click(stepLink('items'))
    await user.click(await screen.findByRole('button', { name: items.category.addItemLabel.replace('{name}', 'Hot') }))
    const form = within(await screen.findByRole('dialog', { name: productEditor.addTitle }))
    await user.type(form.getByRole('textbox', { name: productEditor.name }), 'Americano')
    await user.type(form.getByRole('textbox', { name: productEditor.price }), '120')
    await user.click(form.getByRole('button', { name: productEditor.save }))
    await noDialogOpen()
    done.items = true
    await backToOverview()

    // The contact details: the step leads to the Design page.
    await user.click(stepLink('details'))
    await user.type(await screen.findByLabelText(design.details.phone), '+63 917 555 0199')
    await user.click(save())
    await screen.findByText(design.bar.status.saved)
    done.details = true
    await backToOverview()

    // The logo: the same page, another field.
    await user.click(stepLink('logo'))
    await screen.findByRole('heading', { level: 1, name: design.title })
    await user.upload(fileInputIn(document.body), sampleImageFile('jpeg'))
    await screen.findByRole('img', { name: design.details.logo.alt })
    await user.click(save())
    await screen.findByText(design.bar.status.saved)
    done.logo = true
    await backToOverview()

    // Publishing: the step leads to the Share page.
    await user.click(stepLink('publish'))
    await user.click(await screen.findByRole('switch', { name: share.publish.label }))
    await screen.findByText(share.publish.nowPublished)
    done.publish = true
    await backToOverview()
    expect(screen.queryByText(checklist.allDone)).not.toBeInTheDocument()

    // The plan: the step leads to the Account page.
    await user.click(stepLink('plan'))
    await user.click(await screen.findByRole('radio', { name: new RegExp(account.plans.names.month) }))
    await user.click(screen.getByRole('button', { name: account.plans.start.replace('{plan}', account.plans.names.month.toLowerCase()) }))
    await screen.findByRole('heading', { level: 2, name: account.status.active.replace('{plan}', account.plans.names.month) })
    done.plan = true
    await backToOverview()

    // Everything is set, and the menu is live.
    expect(screen.getByText(checklist.allDone)).toBeInTheDocument()
    expect((await panel(overview.status.live.title)).getByText(urlOf('kape-kanto'))).toBeInTheDocument()
    const business = await savedBusiness(owner)
    expect(business).toMatchObject({ phone: '+63 917 555 0199', published: true })
    expect(business.logo).toMatch(/^data:image\/jpeg;base64,/)
    expect(await itemsOf(owner, 'Hot')).toEqual(['Americano'])
  }, 30_000)
})

describe('The real route table', () => {
  // Every other test mounts the dashboard through the test harness, which builds its own route tree. This one uses the app's
  // own (src/app/routes.tsx), with the real session guard and the real repositories (and so their real delays).
  it('takes a signed-in new owner from /dashboard through the wizard to the Overview and the other pages', async () => {
    await auth.signUp(testOwner)
    const user = userEvent.setup()
    const router = createMemoryRouter(routes, { initialEntries: ['/dashboard'] })
    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('heading', { level: 1, name: setup.title }, { timeout: 8000 })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard/setup')
    await runWizard(user, { name: 'Real Route Cafe', types: ['coffee'], samples: true })

    expect(await screen.findByRole('heading', { level: 1, name: overview.title }, { timeout: 8000 })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard')
    await expectChecklist({ items: true, details: false, logo: false, publish: false, plan: false })

    await visit(user, shell.nav.menu, shell.menuPage.title)
    for (const category of mergePresets(['coffee']).categories) {
      expect(await screen.findByRole('heading', { level: 2, name: category })).toBeInTheDocument()
    }
    await visit(user, shell.nav.share, share.title)
    expect(await screen.findByLabelText(share.link.label)).toHaveValue(urlOf('real-route-cafe'))
    await visit(user, shell.nav.account, account.title)
    expect((await panel(account.profile.title)).getByText(testOwner.email)).toBeInTheDocument()
  }, 60_000)
})

/*
 * Faults these journeys found, each kept as a test of what should happen. A fault that is not fixed yet stays an `it.skip`
 * with a "BUG:" comment: a fix turns the skip into a plain `it`.
 */
describe('Faults found by the journeys', () => {
  it('makes the menu preview dark when the owner picks Dark on a business made from a preset', async () => {
    const { user } = await renderDashboardApp('/dashboard/design')
    await user.click(await screen.findByRole('tab', { name: design.tabs.look }))
    expect(isDark(previewColors()['--menu-bg'])).toBe(false)

    await user.click(screen.getByRole('button', { name: design.look.mode.options.dark }))

    const dark = previewColors()
    expect(isDark(dark['--menu-bg'])).toBe(true)
    expect(contrastRatio(dark['--menu-text'], dark['--menu-bg'])).toBeGreaterThanOrEqual(4.5)
  })

  // Account used to say "Live" for a menu nobody published, because it looked at the plan alone. It reads the same state as the
  // Overview and Share now (`menuState`).
  it('does not say on Account that a menu nobody published is live', async () => {
    const { user } = await renderDashboardApp('/dashboard')
    await panel(overview.status.draft.title)

    await visit(user, shell.nav.account, account.title)

    const site = await panel(account.menu.title)
    expect(site.queryByText(account.menu.live)).not.toBeInTheDocument()
    expect(screen.queryByText(new RegExp(`^${account.status.trialBody.split('{date}')[0]}`))).not.toBeInTheDocument()
  })

  // The same, before the wizard: an owner with no menu at all.
  it('does not say on Account that a menu is live to an owner who has not made one yet', async () => {
    await renderDashboardApp('/dashboard/account', { business: false })
    await screen.findByRole('heading', { level: 1, name: account.title })

    const site = await panel(account.menu.title)
    expect(site.queryByText(account.menu.live)).not.toBeInTheDocument()
    expect(screen.queryByText(new RegExp(`^${account.status.trialBody.split('{date}')[0]}`))).not.toBeInTheDocument()
  })

  // A published menu whose plan has ended is paused. The link panel must not tell the owner to publish it.
  it('does not tell the owner of a published but paused menu to publish it', async () => {
    await renderDashboardApp('/dashboard/share', { published: true, plan: 'ended' })

    expect(await screen.findByText(share.publish.paused)).toBeInTheDocument()
    expect(screen.queryByText(share.link.notLive)).not.toBeInTheDocument()
  })

  // While a search shows nothing, the category's "Add item" button is gone, so the focus has to go to the search box.
  it('keeps the focus in the page after the owner deletes the only item a search found', async () => {
    const { user } = await renderDashboardApp('/dashboard/menu')
    await user.type(await screen.findByRole('searchbox', { name: items.toolbar.searchLabel }), 'cold brew')
    await user.click(await screen.findByRole('button', { name: items.product.deleteLabel.replace('{name}', 'Cold Brew') }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: items.product.confirmDelete }))
    await noDialogOpen()
    await screen.findByText(items.product.deleted.replace('{name}', 'Cold Brew'))

    expect(document.body).not.toHaveFocus()
  })

  // Starting a plan removes the button that was used: the focus must stay in the page and the plan must be announced.
  it('announces the plan that was started on Account and keeps the focus in the page', async () => {
    const { user } = await renderDashboardApp('/dashboard/account')
    await user.click(await screen.findByRole('button', { name: account.plans.start.replace('{plan}', account.plans.names.year.toLowerCase()) }))
    await screen.findByRole('heading', { level: 2, name: account.status.active.replace('{plan}', account.plans.names.year) })

    expect(document.body).not.toHaveFocus()
    expect(screen.getAllByRole('status').some((line) => /\S/.test(line.textContent ?? ''))).toBe(true)
  })

  // NotFound inside the shell must not draw a second <main>.
  it('has one main landmark on a dashboard address that does not exist', async () => {
    await renderDashboardApp('/dashboard/nope')
    await screen.findByRole('heading', { level: 1, name: copy.notFound.title })

    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  // Which business is this? The Overview names it, also after a rename on Design.
  it('shows the name of the business on the Overview, also after it was renamed on Design', async () => {
    const { user } = await renderDashboardApp('/dashboard')
    expect(await screen.findByRole('main')).toHaveTextContent('Kape Kanto')

    await visit(user, shell.nav.design, design.title)
    await user.clear(screen.getByLabelText(design.details.name))
    await user.type(screen.getByLabelText(design.details.name), 'Kape Kanto Cebu')
    await user.click(screen.getByRole('button', { name: design.bar.save }))
    await screen.findByText(design.bar.status.saved)
    await visit(user, shell.nav.overview, overview.title)

    expect(screen.getByRole('main')).toHaveTextContent('Kape Kanto Cebu')
  })
})
