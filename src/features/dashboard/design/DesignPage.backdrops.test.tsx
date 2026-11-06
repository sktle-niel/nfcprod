import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME } from '@/entities/theme/theme'
import { previewRegion, renderDesign, saveButton, seedBusiness, showPart } from './designTestkit'

const group = () => screen.getByRole('group', { name: 'Page background' })

async function openExtras(user: UserEvent) {
  await user.click(screen.getByRole('tab', { name: 'Look' }))
  await showPart(user, 'Extras')
}

describe('DesignPage: the page background picker', () => {
  it('offers Plain, Your photo and Photo library in that order, named from the config words, with one line about them', async () => {
    const { user } = await renderDesign()
    await openExtras(user)
    const choices = [
      ['plain', 'Plain'],
      ['picture', 'Your photo'],
      ['stock', 'Photo library'],
    ] as const
    expect(within(group()).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(choices.map(([value]) => value))
    for (const [value, name] of choices) expect(within(group()).getByRole('radio', { name })).toHaveAttribute('value', value)
    expect(within(group()).getByRole('radio', { name: 'Plain' })).toBeChecked()
    expect(group()).toHaveAccessibleDescription('The plain page color, or a photo behind your menu.')
  })

  it('shows Plain for a texture of an older style, which the menu draws plain, and counts it as no change', async () => {
    const { user } = await renderDesign({ seed: seedBusiness({ theme: { ...DEFAULT_THEME, backdrop: 'terrazzo' } }) })
    await openExtras(user)
    expect(within(group()).getByRole('radio', { name: 'Plain' })).toBeChecked()
    expect(previewRegion().querySelector('[data-menu-backdrop]')).toHaveAttribute('data-menu-backdrop', 'plain')
    // The stored texture is left as it is until the owner picks another background.
    expect(saveButton()).toBeDisabled()
  })

  it('shows the photo picker, its strength, fit and position only once Your photo is chosen, and the preview follows', async () => {
    const { user } = await renderDesign()
    await openExtras(user)
    expect(screen.queryByText('No photo yet')).not.toBeInTheDocument()
    for (const name of ['Photo strength', 'Photo fit', 'Photo position']) expect(screen.queryByRole('group', { name })).not.toBeInTheDocument()
    await user.click(within(group()).getByRole('radio', { name: 'Your photo' }))
    expect(screen.getByText('No photo yet')).toBeInTheDocument()
    const strength = screen.getByRole('group', { name: 'Photo strength' })
    expect(within(strength).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(['faint', 'soft', 'strong'])
    const fit = screen.getByRole('group', { name: 'Photo fit' })
    expect(within(fit).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(['cover', 'contain', 'stretch'])
    expect(within(fit).getByRole('radio', { name: 'Fill the screen' })).toBeChecked()
    const position = screen.getByRole('group', { name: 'Photo position' })
    expect(within(position).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(['center', 'top', 'bottom', 'left', 'right'])
    expect(within(position).getByRole('radio', { name: 'Center' })).toBeChecked()
    const root = previewRegion().querySelector('[data-menu-backdrop]')
    expect(root?.getAttribute('data-menu-backdrop')).toBe('picture')
    // Without a photo yet there is nothing to paint: 'none' on this root (never inherited), the page stays the page color.
    expect((root as HTMLElement | null)?.style.getPropertyValue('--menu-backdrop-image')).toBe('none')
  })

  it('lays the photo as the owner says: the preview follows the fit and the position, and the save keeps them', async () => {
    const PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    const { user, owner } = await renderDesign({
      seed: seedBusiness({ theme: { ...DEFAULT_THEME, backdrop: 'picture', backdropPicture: PHOTO } }),
    })
    await openExtras(user)
    const root = () => previewRegion().querySelector('[data-menu-backdrop]')
    expect(root()?.getAttribute('data-menu-backdrop-fit')).toBe('cover')
    expect(root()?.getAttribute('data-menu-backdrop-position')).toBe('center')
    // The photo is drawn on a layer of its own under the content, as decoration.
    expect(root()?.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
    await user.click(within(screen.getByRole('group', { name: 'Photo fit' })).getByRole('radio', { name: 'Stretch' }))
    await user.click(within(screen.getByRole('group', { name: 'Photo position' })).getByRole('radio', { name: 'Top' }))
    expect(root()?.getAttribute('data-menu-backdrop-fit')).toBe('stretch')
    expect(root()?.getAttribute('data-menu-backdrop-position')).toBe('top')
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    const saved = (await owner.getBusiness())?.theme
    expect(saved?.backdropFit).toBe('stretch')
    expect(saved?.backdropPosition).toBe('top')
  })
})
