import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { STYLES, styleTheme } from '@/entities/theme/styles'
import { modeDefaults } from '@/entities/theme/theme'
import { previewRegion, renderDesign, saveButton, seedBusiness, showPart } from './designTestkit'

const previewRoot = () => previewRegion().firstElementChild as HTMLElement

async function openLook(user: UserEvent) {
  await user.click(screen.getByRole('tab', { name: 'Look' }))
}

describe('DesignPage: light and dark keep a saved style', () => {
  // The Look tab does not apply styles any more, so these menus are saved on the style, not picked from a gallery.
  it('takes the style palette of the other mode while the colors are untouched, and back', async () => {
    const { user, owner } = await renderDesign({ seed: seedBusiness({ theme: styleTheme('atelier', 'light') }) })
    await openLook(user)
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    const dark = STYLES.atelier.palettes.dark
    expect(screen.getByLabelText('Background color')).toHaveValue(dark.background)
    expect(screen.getByLabelText('Text color')).toHaveValue(dark.secondary)
    expect(screen.getByLabelText('Accent color')).toHaveValue(dark.primary)
    expect(previewRoot().style.getPropertyValue('--menu-bg')).toBe(dark.background)
    // The style is still the saved one: only its colors and the mode moved.
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect((await owner.getBusiness())?.theme).toEqual(styleTheme('atelier', 'dark'))
    await user.click(screen.getByRole('button', { name: 'Light' }))
    expect(screen.getByLabelText('Background color')).toHaveValue(STYLES.atelier.palettes.light.background)
  })

  it('moves edited colors the old way: the owner accent stays', async () => {
    const { user } = await renderDesign({ seed: seedBusiness({ theme: styleTheme('atelier', 'light') }) })
    await openLook(user)
    await user.clear(screen.getByLabelText('Accent color'))
    await user.type(screen.getByLabelText('Accent color'), '#2266aa')
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    expect(screen.getByLabelText('Accent color')).toHaveValue('#2266aa')
    // The page and text colors take the plain dark pair, not the style palette.
    expect(screen.getByLabelText('Background color')).toHaveValue(modeDefaults('dark').background)
    expect(screen.getByLabelText('Text color')).toHaveValue(modeDefaults('dark').secondary)
  })
})

describe('DesignPage: the Look tab while the menu styles are redesigned', () => {
  it('offers no Cards or Headings, and draws a saved Noir menu in the Classic look', async () => {
    const noir = styleTheme('noir', 'dark')
    const { user, owner } = await renderDesign({ seed: seedBusiness({ theme: noir }) })
    await openLook(user)
    const parts = within(screen.getByRole('group', { name: 'Part of the look to change' }))
    expect(parts.queryByRole('button', { name: 'Cards' })).not.toBeInTheDocument()
    expect(parts.queryByRole('button', { name: 'Headings' })).not.toBeInTheDocument()
    for (const part of ['Colors', 'Extras'] as const) {
      await showPart(user, part)
      // The looks on offer stay above the parts, whichever part is open.
      expect(screen.getByRole('group', { name: 'Choose a menu style' })).toBeInTheDocument()
    }

    // The Extras part is showing. Noir's cards, pictures, titles, header, line art and texture are saved but not drawn.
    const root = previewRoot()
    expect(root).toHaveAttribute('data-menu-card', 'row')
    expect(root).toHaveAttribute('data-menu-photo', 'rounded')
    expect(root).toHaveAttribute('data-menu-title', 'plain')
    expect(root).toHaveAttribute('data-menu-header', 'plain')
    expect(root).toHaveAttribute('data-menu-decor', 'none')
    expect(root).toHaveAttribute('data-menu-backdrop', 'plain')
    expect(within(screen.getByRole('group', { name: 'Page background' })).getByRole('radio', { name: 'Plain' })).toBeChecked()
    // The owner's own choices still show: the colors and the menu layout.
    expect(root).toHaveAttribute('data-menu-layout', 'list')
    expect(root.style.getPropertyValue('--menu-bg')).toBe(noir.background)

    // Only the drawing is plain: a save keeps every Noir choice next to what the owner changed.
    await user.click(screen.getByRole('radio', { name: 'Anton' }))
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect((await owner.getBusiness())?.theme).toEqual({ ...noir, font: 'anton' })
  })
})
