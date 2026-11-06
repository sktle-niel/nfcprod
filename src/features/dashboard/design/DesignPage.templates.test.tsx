import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { STYLES, styleTheme } from '@/entities/theme/styles'
import { GALLERY_STYLE_IDS, type StyleId } from '@/entities/theme/theme'
import { discardButton, previewRegion, renderDesign, saveButton, seedBusiness, spyOnSave } from './designTestkit'

const NAMES = ['Daybreak', 'Beanhouse', 'Marmalade', 'Sandstone', 'Drip', 'Night Glass', 'Lightbox']

const gallery = () => screen.getByRole('group', { name: 'Choose a menu style' })
const styleRadio = (name: string) => within(gallery()).getByRole('radio', { name })
const previewRoot = () => previewRegion().firstElementChild as HTMLElement
const thumb = (id: StyleId) => document.querySelector<HTMLElement>(`[data-style-thumb="${id}"]`)!

async function openLook(user: UserEvent) {
  await user.click(screen.getByRole('tab', { name: 'Look' }))
}

describe('DesignPage: the menu style picker', () => {
  it('shows the seven templates as one radio group, none chosen for the retired default, and what each is best for', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    expect(screen.getByRole('heading', { name: 'Menu style' })).toBeInTheDocument()
    expect(within(gallery()).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([...GALLERY_STYLE_IDS])
    for (const name of NAMES) expect(styleRadio(name)).toBeInTheDocument()
    // The default theme is the retired Classic. It is drawn as Daybreak but no radio is checked, so a click on Daybreak still applies it.
    expect(within(gallery()).queryByRole('radio', { name: 'Classic' })).not.toBeInTheDocument()
    expect(within(gallery()).queryByRole('radio', { checked: true })).not.toBeInTheDocument()
    expect(styleRadio('Daybreak')).toHaveAccessibleDescription(/^Best for: /)
    expect(styleRadio('Night Glass')).toHaveAccessibleDescription(/^Best for: .*Fine dining/)
    expect(gallery()).toHaveAccessibleDescription(/make it yours/)
  })

  it('does not offer the retired styles', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    for (const name of ['Roast', 'Atelier', 'Sunny', 'Editorial', 'Cocoa', 'Retro', 'Gourmet', 'Fresh', 'Blush', 'Diner', 'Noir', 'Catalog']) {
      expect(within(gallery()).queryByRole('radio', { name })).not.toBeInTheDocument()
    }
  })

  it.each([
    ['coffee', 'Beanhouse', 'beanhouse'],
    ['milkTea', 'Marmalade', 'marmalade'],
    ['casualDining', 'Daybreak', 'daybreak'],
    ['fineDining', 'Sandstone', 'sandstone'],
    ['bakery', 'Sandstone', 'sandstone'],
    ['bar', 'Night Glass', 'nightglass'],
  ] as const)('starts a new %s business on %s, in the mode that template was made for', async (type, name, id) => {
    const { user } = await renderDesign({ business: { types: [type] }, look: 'preset' })
    await openLook(user)
    expect(styleRadio(name)).toBeChecked()
    expect(screen.getByRole('button', { name: STYLES[id].native === 'dark' ? 'Dark' : 'Light' })).toHaveAttribute('aria-pressed', 'true')
    expect(previewRoot()).toHaveAttribute('data-menu-template', id)
  })

  it('draws the owner own menu small in each look, hidden from screen readers, inert and with no tab stop', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    for (const id of GALLERY_STYLE_IDS) {
      const box = thumb(id)
      expect(box).toHaveAttribute('aria-hidden', 'true')
      expect(box).toHaveAttribute('inert')
      // A template is its own chunk: its page appears a moment after the gallery does.
      await waitFor(() => expect(box).toHaveTextContent('Americano'))
      expect(box).toHaveTextContent('Kape Kanto')
      expect(box.querySelector('a, button, input, [tabindex]')).toBeNull()
      // The contact details are too small to read in a thumbnail.
      expect(box).not.toHaveTextContent('Mabini')
      expect(box.querySelector('[data-menu-template]')).toHaveAttribute('data-menu-template', id)
    }
  })

  it('applies a template to the whole draft, says so, keeps the focus on it and shows unsaved changes', async () => {
    const { user, owner } = await renderDesign()
    await openLook(user)
    await user.click(styleRadio('Sandstone'))
    const daybreak = styleTheme('sandstone', 'light')
    expect(styleRadio('Sandstone')).toBeChecked()
    expect(styleRadio('Sandstone')).toHaveFocus()
    expect(screen.getByText('Sandstone style applied. Change the colors, font, layout and page background below.')).toHaveAttribute('role', 'status')
    await waitFor(() => expect(previewRoot()).toHaveAttribute('data-menu-template', 'sandstone'))
    expect(previewRoot().style.getPropertyValue('--menu-bg')).toBe(daybreak.background)
    expect(screen.getByLabelText('Accent color')).toHaveValue(daybreak.primary)
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
    expect((await owner.getBusiness())?.theme.style).toBe('classic')
  })

  it('applies the template in the mode the draft is in', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    await user.click(styleRadio('Night Glass'))
    expect(screen.getByLabelText('Background color')).toHaveValue(STYLES.nightglass.palettes.dark.background)
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('moves through the looks with the arrow keys, each one applied', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    styleRadio('Daybreak').focus()
    await user.keyboard('{ArrowRight}')
    expect(styleRadio('Beanhouse')).toBeChecked()
    expect(styleRadio('Beanhouse')).toHaveFocus()
    await waitFor(() => expect(previewRoot()).toHaveAttribute('data-menu-template', 'beanhouse'))
  })

  it('is undone by Discard, note and all', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await user.click(styleRadio('Marmalade'))
    await user.click(discardButton())
    // Back to what was saved: the retired default theme, no radio checked, drawn as Daybreak, in its own colors.
    expect(within(gallery()).queryByRole('radio', { checked: true })).not.toBeInTheDocument()
    await waitFor(() => expect(previewRoot()).toHaveAttribute('data-menu-template', 'daybreak'))
    expect(screen.getByLabelText('Accent color')).toHaveValue('#8b5a2b')
    expect(screen.queryByText(/style applied/)).not.toBeInTheDocument()
  })

  it('saves the whole template in the theme', async () => {
    const spy = spyOnSave()
    const { user, owner } = await renderDesign({ wrapOwner: spy.wrap })
    await openLook(user)
    await user.click(styleRadio('Beanhouse'))
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect(spy.patches).toEqual([{ theme: styleTheme('beanhouse', 'light') }])
    expect((await owner.getBusiness())?.theme).toEqual(styleTheme('beanhouse', 'light'))
  })

  it('shows the thumbnails in the mode chosen beside them', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    await waitFor(() => expect(thumb('marmalade').querySelector('[data-menu-template]')).not.toBeNull())
    const root = thumb('marmalade').querySelector<HTMLElement>('[data-menu-template]')!
    expect(root.style.getPropertyValue('--menu-bg')).toBe(STYLES.marmalade.palettes.dark.background)
  })
})

describe('DesignPage: reset to the template', () => {
  it('puts the colors of the template back, says so, and keeps it unsaved until Save', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await user.click(styleRadio('Sandstone'))
    await user.clear(screen.getByLabelText('Accent color'))
    await user.type(screen.getByLabelText('Accent color'), '#2266aa')
    await user.click(screen.getByRole('button', { name: 'Reset to the Sandstone style' }))
    expect(screen.getByLabelText('Accent color')).toHaveValue(STYLES.sandstone.palettes.light.primary)
    expect(screen.getByText('Look reset to the Sandstone style. Save to keep it.')).toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
  })

  it('stays clean when the reset gives back what is saved', async () => {
    const { user } = await renderDesign({ seed: seedBusiness({ theme: styleTheme('nightglass', 'dark') }) })
    await openLook(user)
    await user.click(screen.getByRole('button', { name: 'Reset to the Night Glass style' }))
    expect(screen.getByText('Look reset to the Night Glass style. It is the same as what is saved.')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })
})

describe('DesignPage: a menu saved in a retired style', () => {
  it('opens on no chosen look and draws the Daybreak page in the saved colors', async () => {
    const { user } = await renderDesign({ seed: seedBusiness({ theme: styleTheme('noir', 'dark') }) })
    await openLook(user)
    // Noir is not on the list any more, so no radio is checked (a click on Daybreak still applies it) and the preview is Daybreak.
    expect(within(gallery()).queryByRole('radio', { checked: true })).not.toBeInTheDocument()
    await waitFor(() => expect(previewRoot()).toHaveAttribute('data-menu-template', 'daybreak'))
    expect(previewRoot()).toHaveAttribute('data-menu-card', 'row')
    expect(previewRoot().style.getPropertyValue('--menu-bg')).toBe(styleTheme('noir', 'dark').background)
    // What is drawn is Daybreak, so that is the look the panel names and the button goes back to.
    expect(screen.getByRole('button', { name: 'Reset to the Daybreak style' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Noir/ })).not.toBeInTheDocument()
  })
})
