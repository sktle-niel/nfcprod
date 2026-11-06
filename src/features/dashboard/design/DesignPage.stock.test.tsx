import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { BusinessType } from '@/entities/business/business'
import { pictureBackdropImage } from '@/entities/theme/backdrop'
import { STOCK_CATEGORIES, STOCK_PHOTOS, type StockCategory } from '@/entities/theme/stockPhotos'
import { styleTheme } from '@/entities/theme/styles'
import { DEFAULT_THEME } from '@/entities/theme/theme'
import { discardButton, previewRegion, renderDesign, saveButton, seedBusiness, showPart } from './designTestkit'

/** The saved sample business's page color: what the veil over the photo is made from until the owner edits it. */
const PAGE = '#f8f3ec'

const backgrounds = () => screen.getByRole('group', { name: 'Page background' })
const kind = () => screen.getByRole('combobox', { name: 'Kind of business' })
const photos = () => screen.getByRole('radiogroup', { name: 'Photos to choose from' })
const photoRadio = (alt: string) => within(photos()).getByRole('radio', { name: alt })
const shown = () => within(photos()).getAllByRole('radio').map((radio) => radio.getAttribute('value'))
const removeButton = () => screen.queryByRole('button', { name: 'Remove the photo' })
const backdrop = () => previewRegion().querySelector<HTMLElement>('[data-menu-backdrop]')!
const paint = () => backdrop().style.getPropertyValue('--menu-backdrop-image')

const photosOf = (category: StockCategory) => STOCK_PHOTOS.filter((photo) => photo.category === category)

/** The photo at this place of a category, in table order. */
function photoAt(category: StockCategory, index: number) {
  const photo = photosOf(category)[index]
  if (!photo) throw new Error(`The library has no photo number ${index + 1} in ${category}`)
  return photo
}

async function openExtras(user: UserEvent) {
  await user.click(screen.getByRole('tab', { name: 'Look' }))
  await showPart(user, 'Extras')
}

async function openLibrary(user: UserEvent) {
  await openExtras(user)
  await user.click(within(backgrounds()).getByRole('radio', { name: 'Photo library' }))
}

describe('DesignPage: the photo library picker', () => {
  it('appears under Photo library, in the place of Your photo, with its hint, its kinds and its settings', async () => {
    const { user } = await renderDesign()
    await openExtras(user)
    expect(screen.queryByRole('combobox', { name: 'Kind of business' })).not.toBeInTheDocument()
    for (const name of ['Photo strength', 'Photo fit', 'Photo position']) expect(screen.queryByRole('group', { name })).not.toBeInTheDocument()

    await user.click(within(backgrounds()).getByRole('radio', { name: 'Photo library' }))
    const picker = screen.getByRole('group', { name: 'Page photo' })
    expect(picker).toHaveAccessibleDescription(/Choose a photo for the background of your menu/)
    expect(within(picker).getByRole('combobox', { name: 'Kind of business' })).toBeInTheDocument()
    expect(within(picker).getByRole('radiogroup', { name: 'Photos to choose from' })).toBeInTheDocument()
    for (const name of ['Photo strength', 'Photo fit', 'Photo position']) expect(screen.getByRole('group', { name })).toBeInTheDocument()
    // No photo yet: the page says so and stays the page color. Your photo has its own picker and words.
    expect(screen.getByText('No photo chosen yet.')).toBeInTheDocument()
    expect(removeButton()).not.toBeInTheDocument()
    expect(screen.queryByText('No photo yet')).not.toBeInTheDocument()
    expect(backdrop()).toHaveAttribute('data-menu-backdrop', 'stock')
    expect(paint()).toBe('none')

    await user.click(within(backgrounds()).getByRole('radio', { name: 'Your photo' }))
    expect(screen.queryByRole('combobox', { name: 'Kind of business' })).not.toBeInTheDocument()
    expect(screen.getByText('No photo yet')).toBeInTheDocument()
  })

  it.each<[string, BusinessType[], StockCategory, string]>([
    ['a coffee shop', ['coffee'], 'coffee', 'Coffee shop'],
    ['a milk tea shop', ['milkTea'], 'milktea', 'Milk tea and drinks'],
    ['a bakery that also serves coffee', ['bakery', 'coffee'], 'bakery', 'Bakery and desserts'],
  ])('opens %s on its own kind of photos', async (_name, types, category, label) => {
    const { user } = await renderDesign({ business: { types } })
    await openLibrary(user)
    expect(kind()).toHaveValue(category)
    expect(kind()).toHaveDisplayValue(label)
    expect(shown()).toEqual(photosOf(category).map((photo) => photo.id))
  })

  it('opens on the kind of the photo that is already chosen, whatever the business is, and looking at another kind changes nothing', async () => {
    const photo = photoAt('bakery', 1)
    const { user } = await renderDesign({
      seed: seedBusiness({ theme: { ...DEFAULT_THEME, backdrop: 'stock', backdropStock: photo.id } }),
    })
    await openExtras(user)
    expect(kind()).toHaveValue('bakery')
    expect(photoRadio(photo.alt)).toBeChecked()
    expect(screen.getByText(`Photo by ${photo.credit} on Pexels.`)).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()

    await user.selectOptions(kind(), 'Coffee shop')
    expect(shown()).toEqual(photosOf('coffee').map((coffee) => coffee.id))
    for (const coffee of photosOf('coffee')) expect(photoRadio(coffee.alt)).not.toBeChecked()
    // The chosen photo is still the page's, whichever kind is open: its credit stays, and there is nothing to save.
    expect(screen.getByText(`Photo by ${photo.credit} on Pexels.`)).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
    expect(backdrop()).toHaveAttribute('data-menu-backdrop', 'stock')
    expect(paint()).toContain(`url("/stock/${photo.file}.jpg")`)
  })

  it('lists the six kinds in plain words, and shows the photos of the kind chosen and no others', async () => {
    const { user } = await renderDesign()
    await openLibrary(user)
    const options = within(kind()).getAllByRole('option')
    expect(options.map((option) => option.getAttribute('value'))).toEqual(['', ...STOCK_CATEGORIES])
    expect(options.slice(1).map((option) => option.textContent)).toEqual([
      'Coffee shop',
      'Milk tea and drinks',
      'Casual dining',
      'Fine dining',
      'Bakery and desserts',
      'Bar',
    ])

    await user.selectOptions(kind(), 'Bakery and desserts')
    expect(shown()).toEqual(photosOf('bakery').map((photo) => photo.id))
    expect(within(photos()).getAllByRole('img')).toHaveLength(photosOf('bakery').length)
    for (const coffee of photosOf('coffee')) expect(screen.queryByAltText(coffee.alt)).not.toBeInTheDocument()
    await user.selectOptions(kind(), 'Bar')
    expect(shown()).toEqual(photosOf('bar').map((photo) => photo.id))
  })

  it('keeps the kind that is open when the empty prompt of the list is picked', async () => {
    const { user } = await renderDesign()
    await openLibrary(user)
    await user.selectOptions(kind(), within(kind()).getByRole('option', { name: 'Choose a kind of business' }))
    expect(kind()).toHaveValue('coffee')
    expect(shown()).toEqual(photosOf('coffee').map((photo) => photo.id))
  })

  it('draws each photo as a small thumbnail that loads late, with its size set and the photo described', async () => {
    const { user } = await renderDesign()
    await openLibrary(user)
    for (const photo of photosOf('coffee')) {
      const image = within(photoRadio(photo.alt).closest('label')!).getByAltText(photo.alt)
      expect(image).toHaveAttribute('src', `/stock/${photo.file}.thumb.jpg`)
      expect(image).toHaveAttribute('width', '320')
      expect(image).toHaveAttribute('height', '240')
      expect(image).toHaveAttribute('loading', 'lazy')
      expect(image).toHaveAttribute('decoding', 'async')
    }
  })

  it('chooses a photo: the draft takes it, the preview paints it, the credit shows, and Save keeps it', async () => {
    const { user, owner } = await renderDesign()
    await openLibrary(user)
    const photo = photoAt('coffee', 1)
    await user.click(photoRadio(photo.alt))
    expect(photoRadio(photo.alt)).toBeChecked()
    expect(backdrop()).toHaveAttribute('data-menu-backdrop', 'stock')
    expect(paint()).toContain(`url("/stock/${photo.file}.jpg")`)
    // The credit is plain text: it names the photographer and links nowhere.
    expect(screen.getByText(`Photo by ${photo.credit} on Pexels.`)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Pexels/ })).not.toBeInTheDocument()
    expect(screen.queryByText('No photo chosen yet.')).not.toBeInTheDocument()
    expect(removeButton()).toBeInTheDocument()
    expect(saveButton()).toBeEnabled()

    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect((await owner.getBusiness())?.theme).toMatchObject({ backdrop: 'stock', backdropStock: photo.id })
  })

  it('moves from photo to photo with the arrow keys, each one chosen', async () => {
    const { user } = await renderDesign()
    await openLibrary(user)
    const one = photoAt('coffee', 0)
    const two = photoAt('coffee', 1)
    const three = photoAt('coffee', 2)
    await user.click(photoRadio(one.alt))
    await user.keyboard('{ArrowRight}')
    expect(photoRadio(two.alt)).toBeChecked()
    expect(photoRadio(two.alt)).toHaveFocus()
    expect(paint()).toContain(`url("/stock/${two.file}.jpg")`)
    await user.keyboard('{ArrowDown}')
    expect(photoRadio(three.alt)).toBeChecked()
    expect(paint()).toContain(`url("/stock/${three.file}.jpg")`)
    await user.keyboard('{ArrowUp}')
    expect(photoRadio(two.alt)).toBeChecked()
    expect(photoRadio(one.alt)).not.toBeChecked()
  })

  it('takes the photo off: the page goes back to its saved background, the credit and the button go, and the focus stays on the page', async () => {
    const { user } = await renderDesign({ seed: seedBusiness({ theme: styleTheme('roast', 'light') }) })
    await openLibrary(user)
    await user.click(photoRadio(photoAt('coffee', 0).alt))
    expect(saveButton()).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Remove the photo' }))
    // Roast is saved on a Grain texture: that is what the page goes back to, and it is what is saved again. The menu draws it plain.
    expect(within(backgrounds()).getByRole('radio', { name: 'Plain' })).toBeChecked()
    expect(backdrop()).toHaveAttribute('data-menu-backdrop', 'plain')
    expect(screen.queryByText(/^Photo by /)).not.toBeInTheDocument()
    expect(removeButton()).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Kind of business' })).not.toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
    // The button left the page: the focus went back to the choice that opened the picker.
    expect(within(backgrounds()).getByRole('radio', { name: 'Photo library' })).toHaveFocus()
  })

  it('lays the library photo like the owner photo, and keeps its strength, fit and position from one photo to the next', async () => {
    const { user, owner } = await renderDesign()
    await openLibrary(user)
    const first = photoAt('coffee', 0)
    const second = photoAt('coffee', 1)
    const strength = () => screen.getByRole('group', { name: 'Photo strength' })
    const fit = () => screen.getByRole('group', { name: 'Photo fit' })
    const position = () => screen.getByRole('group', { name: 'Photo position' })
    const values = (group: HTMLElement) => within(group).getAllByRole('radio').map((radio) => radio.getAttribute('value'))
    expect(values(strength())).toEqual(['faint', 'soft', 'strong'])
    expect(values(fit())).toEqual(['cover', 'contain', 'stretch'])
    expect(values(position())).toEqual(['center', 'top', 'bottom', 'left', 'right'])

    await user.click(photoRadio(first.alt))
    expect(paint()).toBe(pictureBackdropImage(`/stock/${first.file}.jpg`, PAGE, 'soft'))
    await user.click(within(strength()).getByRole('radio', { name: 'Strong' }))
    expect(paint()).toBe(pictureBackdropImage(`/stock/${first.file}.jpg`, PAGE, 'strong'))
    await user.click(within(fit()).getByRole('radio', { name: 'Fit inside' }))
    await user.click(within(position()).getByRole('radio', { name: 'Bottom' }))
    expect(backdrop()).toHaveAttribute('data-menu-backdrop-fit', 'contain')
    expect(backdrop()).toHaveAttribute('data-menu-backdrop-position', 'bottom')

    await user.click(photoRadio(second.alt))
    expect(paint()).toBe(pictureBackdropImage(`/stock/${second.file}.jpg`, PAGE, 'strong'))
    expect(within(fit()).getByRole('radio', { name: 'Fit inside' })).toBeChecked()
    expect(within(position()).getByRole('radio', { name: 'Bottom' })).toBeChecked()

    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect((await owner.getBusiness())?.theme).toMatchObject({
      backdrop: 'stock',
      backdropStock: second.id,
      backdropVeil: 'strong',
      backdropFit: 'contain',
      backdropPosition: 'bottom',
    })
  })

  it('is undone by Discard, photo and credit together', async () => {
    const { user } = await renderDesign()
    await openLibrary(user)
    await user.click(photoRadio(photoAt('coffee', 2).alt))
    await user.click(discardButton())
    expect(within(backgrounds()).getByRole('radio', { name: 'Plain' })).toBeChecked()
    expect(screen.queryByText(/^Photo by /)).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Kind of business' })).not.toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })
})
