import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { sampleImageFile } from '@/test/ownerFixtures'
import { openEditor, refusal, withCalls } from './testHost'

const text = dashboardCopy.productEditor
const shell = dashboardCopy.shell
const save = () => screen.getByRole('button', { name: text.save })
const nameBox = () => screen.getByRole('textbox', { name: text.name })
const priceBox = () => screen.getByRole('textbox', { name: text.price })
const category = () => screen.getByRole('combobox', { name: text.category })
const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement

describe('ProductEditor: what it refuses', () => {
  it('refuses an empty form field by field, saves nothing and puts the focus on the first one', async () => {
    const { user, owner, onClose } = await openEditor()
    const before = await owner.getMenu()
    await user.click(save())

    expect(nameBox()).toHaveAccessibleDescription(text.errors.name.required)
    expect(nameBox()).toHaveAttribute('aria-invalid', 'true')
    expect(category()).toHaveAccessibleDescription(text.errors.categoryId.required)
    expect(priceBox()).toHaveAccessibleDescription(text.errors.price.required)
    expect(nameBox()).toHaveFocus()
    expect(onClose).not.toHaveBeenCalled()
    expect(await owner.getMenu()).toEqual(before)
  })

  it('moves the focus down the form as each field is fixed', async () => {
    const { user, onClose } = await openEditor()
    await user.type(nameBox(), 'Tea')
    await user.click(save())
    expect(category()).toHaveFocus()

    await user.selectOptions(category(), 'Hot')
    await user.click(save())
    expect(priceBox()).toHaveFocus()

    await user.type(priceBox(), '40')
    await user.click(save())
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('clears the words under a field as soon as it is changed', async () => {
    const { user } = await openEditor()
    await user.click(save())
    expect(nameBox()).toHaveAttribute('aria-invalid', 'true')
    await user.type(nameBox(), 'T')
    expect(nameBox()).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByText(text.errors.name.required)).not.toBeInTheDocument()
  })

  it.each([
    ['letters', 'abc'],
    ['a decimal comma', '12,50'],
    ['a negative price', '-5'],
    ['more than two decimals', '1.999'],
  ])('refuses a price with %s', async (_name, typed) => {
    const { user, owner } = await openEditor({ category: 'Hot' })
    await user.type(nameBox(), 'Tea')
    await user.type(priceBox(), typed)
    await user.click(save())
    expect(priceBox()).toHaveAccessibleDescription(text.errors.price.invalid)
    expect(priceBox()).toHaveFocus()
    expect((await owner.getMenu()).products.some((product) => product.name === 'Tea')).toBe(false)
  })

  // A price in the right form but over the limit is "too high", not "badly formed".
  it.each(['100001', '100000.01', '1,000,000'])('says the price %s is too high, not badly formed, and saves nothing', async (typed) => {
    const { user, owner } = await openEditor({ category: 'Hot' })
    await user.type(nameBox(), 'Gold Latte')
    await user.type(priceBox(), typed)
    await user.click(save())
    expect(priceBox()).toHaveAccessibleDescription(text.errors.price.range)
    expect(priceBox()).toHaveFocus()
    expect((await owner.getMenu()).products.some((product) => product.name === 'Gold Latte')).toBe(false)
  })

  it('says a size price over the limit is too high, and still calls a size price made of letters badly formed', async () => {
    const { user } = await openEditor({ category: 'Hot' })
    await user.type(nameBox(), 'Tea')
    await user.click(screen.getByRole('button', { name: text.mode.sizes }))
    await user.type(screen.getByRole('textbox', { name: 'Name of size 1' }), 'S')
    await user.type(screen.getByRole('textbox', { name: 'Price of size 1 (₱)' }), '100000.01')
    await user.click(save())
    expect(screen.getByText(text.errors.variants.range)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Price of size 1 (₱)' })).toHaveFocus()

    await user.clear(screen.getByRole('textbox', { name: 'Price of size 1 (₱)' }))
    await user.type(screen.getByRole('textbox', { name: 'Price of size 1 (₱)' }), 'lots')
    await user.click(save())
    expect(screen.getByText(text.errors.variants.invalid)).toBeInTheDocument()
  })

  it('refuses a name made of spaces', async () => {
    const { user } = await openEditor({ category: 'Hot' })
    await user.type(nameBox(), '   ')
    await user.type(priceBox(), '50')
    await user.click(save())
    expect(nameBox()).toHaveAccessibleDescription(text.errors.name.required)
    expect(nameBox()).toHaveFocus()
  })

  it('says a size has no name, marks that box and focuses it', async () => {
    const { user } = await openEditor({ category: 'Hot' })
    await user.type(nameBox(), 'Tea')
    await user.click(screen.getByRole('button', { name: text.mode.sizes }))
    await user.type(screen.getByRole('textbox', { name: 'Price of size 1 (₱)' }), '50')
    await user.click(save())

    expect(screen.getByText(text.errors.variants.required)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Name of size 1' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('textbox', { name: 'Price of size 1 (₱)' })).not.toHaveAttribute('aria-invalid')
    expect(screen.getByRole('textbox', { name: 'Name of size 1' })).toHaveFocus()
  })

  it('focuses the price of the size whose price cannot be read, not the first size', async () => {
    const { user } = await openEditor({ category: 'Hot' })
    await user.type(nameBox(), 'Tea')
    await user.click(screen.getByRole('button', { name: text.mode.sizes }))
    await user.type(screen.getByRole('textbox', { name: 'Name of size 1' }), 'S')
    await user.type(screen.getByRole('textbox', { name: 'Price of size 1 (₱)' }), '50')
    await user.click(screen.getByRole('button', { name: text.sizes.add }))
    await user.type(screen.getByRole('textbox', { name: 'Name of size 2' }), 'L')
    await user.type(screen.getByRole('textbox', { name: 'Price of size 2 (₱)' }), 'lots')
    await user.click(save())

    expect(screen.getByText(text.errors.variants.invalid)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Price of size 2 (₱)' })).toHaveFocus()
  })

  it('refuses two sizes with the same name, whatever the case', async () => {
    const { user } = await openEditor({ product: 'Americano' })
    const second = screen.getByRole('textbox', { name: 'Name of size 2' })
    await user.clear(second)
    await user.type(second, 's')
    await user.click(save())
    expect(screen.getByText(text.errors.variants.duplicate)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Name of size 1' })).toHaveFocus()
  })

  it('refuses sizes when every size was removed', async () => {
    const { user, owner, onClose } = await openEditor({ category: 'Hot' })
    await user.type(nameBox(), 'Tea')
    await user.click(screen.getByRole('button', { name: text.mode.sizes }))
    await user.click(screen.getByRole('button', { name: 'Remove size 1' }))
    await user.click(save())

    // No size is on screen, so the words tell the owner to add one, not to fill one in.
    expect(screen.getByText(text.errors.variants.none)).toBeInTheDocument()
    expect(screen.queryByText(text.errors.variants.required)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: text.sizes.add })).toHaveFocus()
    expect(onClose).not.toHaveBeenCalled()
    expect((await owner.getMenu()).products.some((product) => product.name === 'Tea')).toBe(false)
  })

  it('refuses a description over the limit that arrives from outside the box', async () => {
    const { user } = await openEditor({ category: 'Hot' })
    await user.type(nameBox(), 'Tea')
    await user.type(priceBox(), '50')
    const description = screen.getByRole('textbox', { name: text.description })
    // The box stops typing at the limit; a paste or a script may still set a longer value.
    fireEvent.change(description, { target: { value: 'x'.repeat(281) } })
    await user.click(save())
    expect(description).toHaveAccessibleDescription(text.errors.description.tooLong)
    expect(description).toHaveFocus()
  })
})

describe('ProductEditor: the picture', () => {
  it('shows a valid picture at once and saves it with the item', async () => {
    const { user, owner } = await openEditor({ product: 'Cold Brew' })
    expect(screen.getByRole('button', { name: text.photo.choose })).toBeInTheDocument()
    await user.upload(fileInput(), sampleImageFile('png'))

    const photo = await screen.findByRole('img', { name: text.photo.alt })
    expect(photo.getAttribute('src')).toMatch(/^data:image\/png;base64,/)
    expect(screen.getByRole('button', { name: text.photo.replace })).toBeInTheDocument()
    await user.click(save())
    const saved = (await owner.getMenu()).products.find((product) => product.name === 'Cold Brew')
    expect(saved?.image).toBe(photo.getAttribute('src'))
  })

  it('takes a JPEG that is named .png, because the first bytes decide', async () => {
    const { user } = await openEditor({ product: 'Cold Brew' })
    await user.upload(fileInput(), sampleImageFile('jpeg', { name: 'photo.png', type: 'image/png' }))
    const photo = await screen.findByRole('img', { name: text.photo.alt })
    expect(photo.getAttribute('src')).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('refuses a text file named .png, says so next to the picker and keeps the old picture', async () => {
    const { user, owner } = await openEditor({ product: 'Spanish Latte' })
    const old = screen.getByRole('img', { name: text.photo.alt }).getAttribute('src')
    await user.upload(fileInput(), new File(['not a picture at all'], 'notes.png', { type: 'image/png' }))

    expect(await screen.findByText(shell.errors.unsupported)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: text.photo.alt }).getAttribute('src')).toBe(old)
    await user.click(save())
    expect((await owner.getMenu()).products.find((product) => product.name === 'Spanish Latte')?.image).toBe(old)
  })

  it('refuses a picture over 4 MB, then takes a good one and drops the message', async () => {
    const { user } = await openEditor({ product: 'Cold Brew' })
    await user.upload(fileInput(), sampleImageFile('png', { size: 4 * 1024 * 1024 + 1 }))
    expect(await screen.findByText(shell.errors.tooLarge)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: text.photo.alt })).not.toBeInTheDocument()

    await user.upload(fileInput(), sampleImageFile('webp'))
    expect(await screen.findByRole('img', { name: text.photo.alt })).toBeInTheDocument()
    expect(screen.queryByText(shell.errors.tooLarge)).not.toBeInTheDocument()
  })

  it('says the same plain words when the upload cannot reach the server', async () => {
    const { user } = await openEditor(
      { product: 'Cold Brew' },
      {
        wrapOwner: withCalls({
          uploadImage: () => Promise.reject(refusal('network')),
        }),
      },
    )
    await user.upload(fileInput(), sampleImageFile('png'))
    expect(await screen.findByText(shell.errors.network)).toBeInTheDocument()
  })

  it('removes the picture, and the item is saved without one', async () => {
    const { user, owner } = await openEditor({ product: 'Spanish Latte' })
    await user.click(screen.getByRole('button', { name: text.photo.remove }))
    expect(screen.queryByRole('img', { name: text.photo.alt })).not.toBeInTheDocument()
    expect(screen.getByText(text.photo.empty)).toBeInTheDocument()
    await user.click(save())
    expect((await owner.getMenu()).products.find((product) => product.name === 'Spanish Latte')?.image).toBeNull()
  })

  it('does not save while a picture is on its way', async () => {
    let finish: (address: string) => void = () => {}
    const { user, owner } = await openEditor(
      { product: 'Cold Brew' },
      {
        wrapOwner: withCalls({
          uploadImage: () => new Promise<string>((resolve) => (finish = resolve)),
        }),
      },
    )
    await user.upload(fileInput(), sampleImageFile('png'))
    expect(save()).toBeDisabled()
    finish('data:image/png;base64,iVBORw0KGgo=')
    await screen.findByRole('img', { name: text.photo.alt })
    expect(save()).toBeEnabled()
    expect((await owner.getMenu()).products.find((product) => product.name === 'Cold Brew')?.image).toBeNull()
  })
})

describe('ProductEditor: when the repository says no', () => {
  it('shows a refused field under that field and puts the focus there', async () => {
    const { user, onClose } = await openEditor(
      { product: 'Cold Brew' },
      {
        wrapOwner: withCalls({
          saveProduct: () => Promise.reject(refusal('invalid', { name: 'duplicate' })),
        }),
      },
    )
    await user.click(save())
    expect(nameBox()).toHaveAccessibleDescription(shell.fieldErrors.duplicate)
    expect(nameBox()).toHaveFocus()
    expect(screen.getByRole('alert')).toBeEmptyDOMElement()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('says a failure that names no field above the buttons, keeps what was typed, and can be tried again', async () => {
    let tries = 0
    const { user, onClose, owner } = await openEditor(
      { product: 'Cold Brew' },
      {
        wrapOwner: (real) => ({
          ...real,
          saveProduct: (input) => {
            tries += 1
            return tries === 1 ? Promise.reject(refusal('network')) : real.saveProduct(input)
          },
        }),
      },
    )
    await user.type(nameBox(), ' Reserve')
    await user.click(save())

    expect(await screen.findByRole('alert')).toHaveTextContent(shell.errors.network)
    expect(nameBox()).toHaveValue('Cold Brew Reserve')
    expect(onClose).not.toHaveBeenCalled()
    expect(save()).toBeEnabled()

    await user.click(save())
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect((await owner.getMenu()).products.some((product) => product.name === 'Cold Brew Reserve')).toBe(true)
    expect(tries).toBe(2)
  })

  it('never shows the raw message of an unexpected error', async () => {
    const { user } = await openEditor(
      { product: 'Cold Brew' },
      {
        wrapOwner: withCalls({
          saveProduct: () => Promise.reject(new Error('ECONNRESET at 10.0.0.7')),
        }),
      },
    )
    await user.click(save())
    expect(await screen.findByRole('alert')).toHaveTextContent(shell.errors.unknown)
    expect(screen.queryByText(/ECONNRESET/)).not.toBeInTheDocument()
  })

  it('shows a refusal of the category when the category is gone', async () => {
    const { user } = await openEditor(
      { product: 'Cold Brew' },
      {
        wrapOwner: withCalls({
          saveProduct: () => Promise.reject(refusal('invalid', { categoryId: 'invalid' })),
        }),
      },
    )
    await user.click(save())
    expect(category()).toHaveAccessibleDescription(text.errors.categoryId.invalid)
    expect(category()).toHaveFocus()
  })

  it('shows a busy Save while it works, and does not send the item twice', async () => {
    let calls = 0
    let finish: () => void = () => {}
    const gate = new Promise<void>((resolve) => (finish = resolve))
    const { user, onClose } = await openEditor(
      { product: 'Cold Brew' },
      {
        wrapOwner: (real) => ({
          ...real,
          saveProduct: async (input) => {
            calls += 1
            await gate
            return real.saveProduct(input)
          },
        }),
      },
    )
    await user.click(save())
    expect(save()).toHaveAttribute('aria-busy', 'true')
    expect(save()).toBeDisabled()
    await user.click(save())
    expect(calls).toBe(1)

    finish()
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})

describe('ProductEditor: leaving', () => {
  it('leaves everything as it was on Cancel', async () => {
    const { user, owner, onClose, dialog } = await openEditor({ product: 'Cold Brew' })
    const before = await owner.getMenu()
    await user.type(nameBox(), ' changed')
    await user.click(screen.getByRole('button', { name: text.cancel }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(dialog).not.toHaveAttribute('open')
    expect(await owner.getMenu()).toEqual(before)
  })

  it('leaves everything as it was from the close button', async () => {
    const { user, owner, onClose } = await openEditor({ category: 'Hot' })
    const before = await owner.getMenu()
    await user.type(nameBox(), 'Half typed')
    await user.click(screen.getByRole('button', { name: text.close }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(await owner.getMenu()).toEqual(before)
  })

  it('leaves everything as it was on Escape, which the browser turns into a close of the dialog', async () => {
    const { owner, onClose, dialog } = await openEditor({ product: 'Cold Brew' })
    const before = await owner.getMenu()
    dialog.close()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(await owner.getMenu()).toEqual(before)
  })

  it('calls onClose once after a save, not twice', async () => {
    const { user, onClose } = await openEditor({ product: 'Cold Brew' })
    await user.click(save())
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('submits from the keyboard with Enter in the name box', async () => {
    const { user, onClose } = await openEditor({ product: 'Cold Brew' })
    nameBox().focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})
