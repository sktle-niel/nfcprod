import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { STYLES, styleTheme } from '@/entities/theme/styles'
import { STYLE_IDS } from '@/entities/theme/theme'
import { discardButton, previewRegion, renderDesign, saveButton, seedBusiness, showPart, spyOnSave } from './designTestkit'

const NAMES = ['Classic', 'Roast', 'Atelier', 'Sunny', 'Editorial', 'Cocoa', 'Retro', 'Gourmet', 'Fresh', 'Blush', 'Diner', 'Noir', 'Catalog']

const gallery = () => screen.getByRole('group', { name: 'Choose a menu style' })
const styleRadio = (name: string) => within(gallery()).getByRole('radio', { name })
const previewRoot = () => previewRegion().firstElementChild as HTMLElement
const thumb = (id: string) => document.querySelector<HTMLElement>(`[data-style-thumb="${id}"]`)!

async function openLook(user: UserEvent) {
  await user.click(screen.getByRole('tab', { name: 'Look' }))
}

describe('DesignPage: the menu style picker', () => {
  it('shows the thirteen styles as one radio group, with the saved one chosen and what each is best for', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    expect(screen.getByRole('heading', { name: 'Menu style' })).toBeInTheDocument()
    expect(within(gallery()).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([...STYLE_IDS])
    for (const name of NAMES) expect(styleRadio(name)).toBeInTheDocument()
    expect(styleRadio('Classic')).toBeChecked()
    expect(styleRadio('Classic')).toHaveAccessibleDescription('Best for: any kind of menu')
    expect(styleRadio('Gourmet')).toHaveAccessibleDescription('Best for: Fine dining, Bar')
    expect(gallery()).toHaveAccessibleDescription(/You can change every part of it below/)
  })

  it.each([
    ['coffee', 'Atelier', 'atelier'],
    ['milkTea', 'Fresh', 'fresh'],
    ['casualDining', 'Diner', 'diner'],
    ['fineDining', 'Gourmet', 'gourmet'],
    ['bakery', 'Blush', 'blush'],
    ['bar', 'Noir', 'noir'],
  ] as const)('starts a new %s business on %s, in the mode that style was made for', async (type, name, id) => {
    const { user } = await renderDesign({ business: { types: [type] }, look: 'preset' })
    await openLook(user)
    expect(styleRadio(name)).toBeChecked()
    expect(screen.getByRole('button', { name: STYLES[id].native === 'dark' ? 'Dark' : 'Light' })).toHaveAttribute('aria-pressed', 'true')
    expect(previewRoot()).toHaveAttribute('data-menu-card', STYLES[id].choices.card)
  })

  it('draws the owner own menu small in each style, hidden from screen readers, inert and with no tab stop', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    for (const id of STYLE_IDS) {
      const box = thumb(id)
      expect(box).toHaveAttribute('aria-hidden', 'true')
      expect(box).toHaveAttribute('inert')
      expect(box.querySelector('a, button, input, [tabindex]')).toBeNull()
      expect(box).toHaveTextContent('Kape Kanto')
      expect(box).toHaveTextContent('Americano')
      // The contact details are too small to read in a thumbnail.
      expect(box).not.toHaveTextContent('Mabini')
      expect(box.querySelector('[data-menu-card]')).toHaveAttribute('data-menu-card', STYLES[id].choices.card)
    }
    expect(thumb('roast').querySelector<HTMLElement>('[data-menu-card]')!.style.getPropertyValue('--menu-bg')).toBe(
      STYLES.roast.palettes.light.background,
    )
  })

  it('applies a style to the whole draft, says so, keeps the focus on it and shows unsaved changes', async () => {
    const { user, owner } = await renderDesign()
    await openLook(user)
    await user.click(styleRadio('Sunny'))
    const sunny = styleTheme('sunny', 'light')
    expect(styleRadio('Sunny')).toBeChecked()
    expect(styleRadio('Sunny')).toHaveFocus()
    expect(screen.getByText('Sunny style applied. You can change every part below.')).toHaveAttribute('role', 'status')
    expect(previewRoot()).toHaveAttribute('data-menu-card', 'badge')
    expect(previewRoot()).toHaveAttribute('data-menu-header', 'awning')
    expect(previewRoot().style.getPropertyValue('--menu-bg')).toBe(sunny.background)
    expect(screen.getByLabelText('Accent color')).toHaveValue(sunny.primary)
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
    expect((await owner.getBusiness())?.theme.style).toBe('classic')
  })

  it('applies the style in the mode the draft is in', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    await user.click(styleRadio('Noir'))
    expect(screen.getByLabelText('Background color')).toHaveValue(STYLES.noir.palettes.dark.background)
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('moves through the styles with the arrow keys, each one applied', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    styleRadio('Classic').focus()
    await user.keyboard('{ArrowRight}')
    expect(styleRadio('Roast')).toBeChecked()
    expect(styleRadio('Roast')).toHaveFocus()
    expect(previewRoot()).toHaveAttribute('data-menu-card', 'poster')
  })

  it('is undone by Discard, note and all', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await user.click(styleRadio('Diner'))
    await user.click(discardButton())
    expect(styleRadio('Classic')).toBeChecked()
    expect(previewRoot()).toHaveAttribute('data-menu-card', 'row')
    expect(screen.getByLabelText('Accent color')).toHaveValue('#8b5a2b')
    expect(screen.queryByText(/style applied/)).not.toBeInTheDocument()
  })

  it('saves the whole style in the theme', async () => {
    const spy = spyOnSave()
    const { user, owner } = await renderDesign({ wrapOwner: spy.wrap })
    await openLook(user)
    await user.click(styleRadio('Gourmet'))
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect(spy.patches).toEqual([{ theme: styleTheme('gourmet', 'light') }])
    expect((await owner.getBusiness())?.theme).toEqual(styleTheme('gourmet', 'light'))
  })

  it('shows the thumbnails in the mode chosen beside them', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    const root = thumb('fresh').querySelector<HTMLElement>('[data-menu-card]')!
    expect(root.style.getPropertyValue('--menu-bg')).toBe(STYLES.fresh.palettes.dark.background)
  })
})

describe('DesignPage: reset to the style', () => {
  it('puts every part of the style back, says so, and keeps it unsaved until Save', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await user.click(styleRadio('Roast'))
    await showPart(user, 'Cards')
    await user.click(screen.getByRole('radio', { name: 'Tile' }))
    await user.click(screen.getByRole('button', { name: 'Reset to the Roast style' }))
    expect(screen.getByRole('radio', { name: 'Poster' })).toBeChecked()
    expect(screen.getByText('Look reset to the Roast style. Save to keep it.')).toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
  })

  it('stays clean when the reset gives back what is saved', async () => {
    const { user } = await renderDesign({ seed: seedBusiness({ theme: styleTheme('noir', 'dark') }) })
    await openLook(user)
    await user.click(screen.getByRole('button', { name: 'Reset to the Noir style' }))
    expect(screen.getByText('Look reset to the Noir style. It is the same as what is saved.')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })
})

describe('DesignPage: light and dark keep the style', () => {
  it('takes the style palette of the other mode while the colors are untouched, and back', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await user.click(styleRadio('Atelier'))
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    const dark = STYLES.atelier.palettes.dark
    expect(screen.getByLabelText('Background color')).toHaveValue(dark.background)
    expect(screen.getByLabelText('Text color')).toHaveValue(dark.secondary)
    expect(screen.getByLabelText('Accent color')).toHaveValue(dark.primary)
    expect(previewRoot().style.getPropertyValue('--menu-bg')).toBe(dark.background)
    expect(styleRadio('Atelier')).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Light' }))
    expect(screen.getByLabelText('Background color')).toHaveValue(STYLES.atelier.palettes.light.background)
  })

  it('moves edited colors the old way: the owner accent stays', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await user.click(styleRadio('Atelier'))
    await user.clear(screen.getByLabelText('Accent color'))
    await user.type(screen.getByLabelText('Accent color'), '#2266aa')
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    expect(screen.getByLabelText('Accent color')).toHaveValue('#2266aa')
  })
})
