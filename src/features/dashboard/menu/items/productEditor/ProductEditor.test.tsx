import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { Product } from '@/entities/menu/menu'
import { openEditor } from './testHost'

const text = dashboardCopy.productEditor
const save = () => screen.getByRole('button', { name: text.save })
const nameBox = () => screen.getByRole('textbox', { name: text.name })
const priceBox = () => screen.getByRole('textbox', { name: text.price })

async function productNamed(owner: { getMenu(): Promise<{ products: Product[] }> }, name: string): Promise<Product> {
  const found = (await owner.getMenu()).products.find((product) => product.name === name)
  if (!found) throw new Error(`No product named ${name}`)
  return found
}

describe('ProductEditor: adding an item', () => {
  it('opens as a dialog titled for a new item, with the category it was opened from', async () => {
    await openEditor({ category: 'Iced' })
    expect(screen.getByRole('dialog', { name: text.addTitle })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: text.category })).toHaveDisplayValue('Iced')
    expect(screen.getByRole('switch', { name: text.available.label })).toBeChecked()
  })

  it('asks for a category when it was opened from none', async () => {
    await openEditor()
    expect(screen.getByRole('combobox', { name: text.category })).toHaveDisplayValue(text.categoryPlaceholder)
  })

  it('saves an item with one price in centavos, then closes', async () => {
    const { user, owner, onClose, dialog } = await openEditor({ category: 'Hot' })
    await user.type(nameBox(), 'Flat White')
    await user.type(screen.getByRole('textbox', { name: text.description }), 'Silky and strong.')
    await user.type(priceBox(), '99.50')
    await user.click(save())

    const menu = await owner.getMenu()
    const made = menu.products.find((product) => product.name === 'Flat White')
    expect(made).toMatchObject({
      description: 'Silky and strong.',
      price: 9950,
      variants: [],
      tags: [],
      available: true,
      image: null,
      groupIds: [],
      categoryId: menu.categories.find((category) => category.name === 'Hot')?.id,
    })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(dialog).not.toHaveAttribute('open')
  })

  it('reads a price with a thousands comma and the peso sign', async () => {
    const { user, owner } = await openEditor({ category: 'Hot' })
    await user.type(nameBox(), 'Sharing Pot')
    await user.type(priceBox(), '₱ 1,200')
    await user.click(save())
    expect((await productNamed(owner, 'Sharing Pot')).price).toBe(120000)
  })

  it('counts the characters of the description', async () => {
    const { user } = await openEditor({ category: 'Hot' })
    expect(screen.getByText('0 of 280 characters')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: text.description }), 'Rich')
    expect(screen.getByText('4 of 280 characters')).toBeInTheDocument()
  })

  it('saves an item with sizes, priced from the lowest size', async () => {
    const { user, owner } = await openEditor({ category: 'Iced' })
    await user.type(nameBox(), 'Frappe')
    await user.click(screen.getByRole('button', { name: text.mode.sizes }))
    expect(screen.queryByRole('textbox', { name: text.price })).not.toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Name of size 1' }), 'Regular')
    await user.type(screen.getByRole('textbox', { name: 'Price of size 1 (₱)' }), '130')
    await user.click(screen.getByRole('button', { name: text.sizes.add }))
    await user.type(screen.getByRole('textbox', { name: 'Name of size 2' }), 'Large')
    await user.type(screen.getByRole('textbox', { name: 'Price of size 2 (₱)' }), '110')
    await user.click(save())

    const made = await productNamed(owner, 'Frappe')
    expect(made.variants.map(({ label, price }) => ({ label, price }))).toEqual([
      { label: 'Regular', price: 13000 },
      { label: 'Large', price: 11000 },
    ])
    expect(made.price).toBe(11000)
  })

  it('puts the cursor in the name of a size that was just added, and removes a size by its name', async () => {
    const { user } = await openEditor({ category: 'Iced' })
    await user.click(screen.getByRole('button', { name: text.mode.sizes }))
    await user.click(screen.getByRole('button', { name: text.sizes.add }))
    expect(screen.getByRole('textbox', { name: 'Name of size 2' })).toHaveFocus()

    await user.type(screen.getByRole('textbox', { name: 'Name of size 2' }), 'Jumbo')
    await user.click(screen.getByRole('button', { name: 'Remove size Jumbo' }))
    expect(screen.queryByRole('textbox', { name: 'Name of size 2' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: text.sizes.add })).toHaveFocus()
  })

  it('adds the sizes of the business type in one click, with the typed price to start from', async () => {
    const { user, owner } = await openEditor({ category: 'Hot' })
    await user.type(nameBox(), 'Mocha')
    await user.type(priceBox(), '150')
    await user.click(screen.getByRole('button', { name: text.mode.sizes }))
    await user.click(screen.getByRole('button', { name: 'Add S, M, L' }))

    expect(screen.getByRole('textbox', { name: 'Name of size 1' })).toHaveValue('S')
    expect(screen.getByRole('textbox', { name: 'Name of size 3' })).toHaveValue('L')
    expect(screen.getByRole('textbox', { name: 'Price of size 2 (₱)' })).toHaveValue('150')
    expect(screen.queryByRole('textbox', { name: 'Name of size 4' })).not.toBeInTheDocument()

    await user.clear(screen.getByRole('textbox', { name: 'Price of size 3 (₱)' }))
    await user.type(screen.getByRole('textbox', { name: 'Price of size 3 (₱)' }), '190')
    await user.click(save())
    const made = await productNamed(owner, 'Mocha')
    expect(made.variants.map((variant) => variant.label)).toEqual(['S', 'M', 'L'])
    expect(made.variants.map((variant) => variant.price)).toEqual([15000, 15000, 19000])
  })

  it('offers no quick sizes to a business type without sizes', async () => {
    const { user } = await openEditor({ category: 'Hot' }, { business: { types: ['bakery'] } })
    await user.click(screen.getByRole('button', { name: text.mode.sizes }))
    expect(screen.queryByRole('button', { name: /^Add S/ })).not.toBeInTheDocument()
  })

  it('stops adding sizes at the limit', async () => {
    const { user } = await openEditor({ category: 'Hot' })
    await user.click(screen.getByRole('button', { name: text.mode.sizes }))
    for (let i = 0; i < 7; i += 1) await user.click(screen.getByRole('button', { name: text.sizes.add }))
    expect(screen.getByRole('textbox', { name: 'Name of size 8' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: text.sizes.add })).toBeDisabled()
    expect(screen.getByText(text.sizes.full.replace('{max}', '8'))).toBeInTheDocument()
  })

  it('keeps the price that was typed when the owner looks at sizes and comes back', async () => {
    const { user } = await openEditor({ category: 'Hot' })
    await user.type(priceBox(), '88')
    await user.click(screen.getByRole('button', { name: text.mode.sizes }))
    await user.click(screen.getByRole('button', { name: text.mode.single }))
    expect(priceBox()).toHaveValue('88')
  })
})

describe('ProductEditor: changing an item', () => {
  it('opens filled in, titled for editing', async () => {
    await openEditor({ product: 'Americano' })
    expect(screen.getByRole('dialog', { name: text.editTitle })).toBeInTheDocument()
    expect(nameBox()).toHaveValue('Americano')
    expect(screen.getByRole('textbox', { name: text.description })).toHaveValue('A double shot of espresso with hot water.')
    expect(screen.getByRole('combobox', { name: text.category })).toHaveDisplayValue('Hot')
    expect(screen.getByRole('button', { name: text.mode.sizes })).toHaveAttribute('aria-pressed', 'true')
    expect(['1', '2', '3'].map((n) => screen.getByRole('textbox', { name: `Name of size ${n}` }))).toHaveLength(3)
    expect(screen.getByRole('textbox', { name: 'Price of size 2 (₱)' })).toHaveValue('140')
  })

  it('keeps the ids of the item and of its sizes, and its place in the menu', async () => {
    const { user, owner } = await openEditor({ product: 'Americano' })
    const before = await productNamed(owner, 'Americano')
    const order = (await owner.getMenu()).products.map((product) => product.id)

    await user.clear(screen.getByRole('textbox', { name: 'Price of size 2 (₱)' }))
    await user.type(screen.getByRole('textbox', { name: 'Price of size 2 (₱)' }), '150.25')
    await user.click(save())

    const menu = await owner.getMenu()
    const after = menu.products.find((product) => product.id === before.id)
    expect(after?.name).toBe('Americano')
    expect(after?.variants.map((variant) => variant.id)).toEqual(before.variants.map((variant) => variant.id))
    expect(after?.variants.map((variant) => variant.price)).toEqual([12000, 15025, 16000])
    expect(after?.price).toBe(12000)
    expect(menu.products.map((product) => product.id)).toEqual(order)
  })

  it('gives a size added while editing a new id and keeps the others', async () => {
    const { user, owner } = await openEditor({ product: 'Americano' })
    const before = await productNamed(owner, 'Americano')
    await user.click(screen.getByRole('button', { name: text.sizes.add }))
    await user.type(screen.getByRole('textbox', { name: 'Name of size 4' }), 'XL')
    await user.type(screen.getByRole('textbox', { name: 'Price of size 4 (₱)' }), '180')
    await user.click(save())

    const after = await productNamed(owner, 'Americano')
    expect(after.variants).toHaveLength(4)
    expect(after.variants.slice(0, 3).map((variant) => variant.id)).toEqual(before.variants.map((variant) => variant.id))
    expect(after.variants[3]).toMatchObject({ label: 'XL', price: 18000 })
  })

  it('changes an item with sizes into one with a single price, starting from its lowest price', async () => {
    const { user, owner } = await openEditor({ product: 'Americano' })
    await user.click(screen.getByRole('button', { name: text.mode.single }))
    expect(priceBox()).toHaveValue('120')
    await user.click(save())
    expect(await productNamed(owner, 'Americano')).toMatchObject({ variants: [], price: 12000 })
  })

  it('moves an item to another category', async () => {
    const { user, owner } = await openEditor({ product: 'Cold Brew' })
    await user.selectOptions(screen.getByRole('combobox', { name: text.category }), 'Hot')
    await user.click(save())
    const menu = await owner.getMenu()
    expect(menu.products.find((product) => product.name === 'Cold Brew')?.categoryId).toBe(menu.categories.find((category) => category.name === 'Hot')?.id)
  })

  it('marks an item sold out and back', async () => {
    const { user, owner } = await openEditor({ product: 'Cold Brew' })
    await user.click(screen.getByRole('switch', { name: text.available.label }))
    await user.click(save())
    expect((await productNamed(owner, 'Cold Brew')).available).toBe(false)
  })
})

describe('ProductEditor: labels and add-ons', () => {
  it('shows the labels an item has, and saves the ones chosen', async () => {
    const { user, owner } = await openEditor({ product: 'Spanish Latte' })
    const group = screen.getByRole('group', { name: text.tags.legend })
    expect(within(group).getByRole('checkbox', { name: 'Best seller' })).toBeChecked()
    expect(within(group).getByRole('checkbox', { name: 'Vegan' })).not.toBeChecked()

    await user.click(within(group).getByRole('checkbox', { name: 'Best seller' }))
    await user.click(within(group).getByRole('checkbox', { name: 'Vegan' }))
    await user.click(within(group).getByRole('checkbox', { name: 'Spicy' }))
    await user.click(save())
    expect((await productNamed(owner, 'Spanish Latte')).tags).toEqual(['vegan', 'spicy'])
  })

  it('lets the owner turn a label off and on again before saving', async () => {
    const { user, owner } = await openEditor({ product: 'Cold Brew' })
    const vegan = screen.getByRole('checkbox', { name: 'Vegan' })
    await user.click(vegan)
    await user.click(vegan)
    await user.click(save())
    expect((await productNamed(owner, 'Cold Brew')).tags).toEqual(['vegan'])
  })

  it('offers the add-on groups of the menu, with the ones the item has checked', async () => {
    const { user, owner } = await openEditor({ product: 'Spanish Latte' })
    const group = screen.getByRole('group', { name: text.addons.legend })
    const milk = within(group).getByRole('checkbox', { name: 'Milk' })
    expect(milk).toBeChecked()
    await user.click(milk)
    await user.click(save())
    expect((await productNamed(owner, 'Spanish Latte')).groupIds).toEqual([])
  })

  it('adds an add-on group to an item that had none', async () => {
    const { user, owner } = await openEditor({ product: 'Cold Brew' })
    await user.click(screen.getByRole('checkbox', { name: 'Milk' }))
    await user.click(save())
    const menu = await owner.getMenu()
    expect((await productNamed(owner, 'Cold Brew')).groupIds).toEqual([menu.groups[0]?.id])
  })

  it('points to the Add-ons tab when the menu has no add-on groups', async () => {
    const { owner } = await openEditor(
      { product: 'Cold Brew' },
      {
        seed: async (repository) => {
          for (const group of (await repository.getMenu()).groups) await repository.deleteGroup(group.id)
        },
      },
    )
    expect((await owner.getMenu()).groups).toEqual([])
    expect(screen.getByText(text.addons.none)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: text.addons.legend })).not.toBeInTheDocument()
  })
})

describe('ProductEditor: what it tells the page and the phone', () => {
  it('tells the page the name and that the item is new, once, before it closes', async () => {
    const { user, onSaved, onClose } = await openEditor({ category: 'Hot' })
    await user.type(nameBox(), 'Flat White')
    await user.type(priceBox(), '99.50')
    await user.click(save())

    expect(onSaved).toHaveBeenCalledExactlyOnceWith({ name: 'Flat White', added: true })
    expect(onSaved.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0] ?? 0)
  })

  it('tells the page that a changed item is not new, with the name as it was saved', async () => {
    const { user, onSaved } = await openEditor({ product: 'Cold Brew' })
    await user.clear(nameBox())
    await user.type(nameBox(), '  Cold   Brew XL ')
    await user.click(save())
    expect(onSaved).toHaveBeenCalledExactlyOnceWith({ name: 'Cold Brew XL', added: false })
  })

  it('says nothing to the page when the save is refused', async () => {
    const { user, onSaved } = await openEditor({ category: 'Hot' })
    await user.click(save())
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('shows the decimal keyboard for the price and does not offer saved names for the item name', async () => {
    await openEditor({ category: 'Hot' })
    expect(priceBox()).toHaveAttribute('inputmode', 'decimal')
    expect(nameBox()).toHaveAttribute('autocomplete', 'off')
  })
})
