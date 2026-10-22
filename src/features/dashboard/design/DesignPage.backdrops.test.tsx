import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { backdropLayers, NEW_BACKDROPS } from '@/entities/theme/backdrop'
import { BACKDROPS, DEFAULT_THEME } from '@/entities/theme/theme'
import { previewRegion, renderDesign, saveButton, seedBusiness, showPart } from './designTestkit'

/** The saved sample business's palette: what the swatches must be painted from until the owner edits a color. */
const SAVED = { background: '#f8f3ec', text: '#2b1d14', accent: '#8b5a2b' }

const group = () => screen.getByRole('group', { name: 'Page texture' })

/** The swatch inside the same option card as the radio of `kind`. */
function swatchOf(kind: string): HTMLElement | null {
  const radio = within(group())
    .getAllByRole('radio')
    .find((candidate) => candidate.getAttribute('value') === kind)
  return radio?.parentElement?.querySelector<HTMLElement>(`[data-texture='${kind}']`) ?? null
}

async function openExtras(user: UserEvent) {
  await user.click(screen.getByRole('tab', { name: 'Look' }))
  await showPart(user, 'Extras')
}

describe('DesignPage: the page texture picker', () => {
  it('offers all 18 textures and the photo in picker order, named from the config words, with one line about them', async () => {
    const { user } = await renderDesign()
    await openExtras(user)
    expect(within(group()).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([...BACKDROPS])
    const names = ['Grain', 'Plaster', 'Marble', 'Linen', 'Weave', 'Terrazzo', 'Waves', 'Scallops', 'Deco fans', 'Gingham', 'Checker', 'Contours', 'Bloom']
    for (const name of names) expect(within(group()).getByRole('radio', { name })).toBeInTheDocument()
    expect(group()).toHaveAccessibleDescription('Drawn from your colors, so every texture stays easy to read.')
  })

  it('shows the photo picker and its strength only once Your photo is chosen, and the preview follows', async () => {
    const { user } = await renderDesign()
    await openExtras(user)
    expect(screen.queryByText('No photo yet')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Photo strength' })).not.toBeInTheDocument()
    await user.click(within(group()).getByRole('radio', { name: 'Your photo' }))
    expect(screen.getByText('No photo yet')).toBeInTheDocument()
    const strength = screen.getByRole('group', { name: 'Photo strength' })
    expect(within(strength).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(['faint', 'soft', 'strong'])
    const root = previewRegion().querySelector('[data-menu-backdrop]')
    expect(root?.getAttribute('data-menu-backdrop')).toBe('picture')
    // Without a photo yet there is nothing to paint: 'none' on this root (never inherited), the page stays the page color.
    expect((root as HTMLElement | null)?.style.getPropertyValue('--menu-backdrop-image')).toBe('none')
  })

  it('keeps the uploaded photo while trying styles: applying one changes the look, not the asset', async () => {
    const PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    const { user } = await renderDesign({
      seed: seedBusiness({ theme: { ...DEFAULT_THEME, backdrop: 'picture', backdropPicture: PHOTO, backdropVeil: 'strong' } }),
    })
    await user.click(screen.getByRole('tab', { name: 'Look' }))
    await user.click(screen.getByRole('radio', { name: 'Roast' }))
    await showPart(user, 'Extras')
    // The style's own backdrop took over, but the photo and its strength wait under 'Your photo'.
    expect(within(group()).getByRole('radio', { name: 'Grain' })).toBeChecked()
    await user.click(within(group()).getByRole('radio', { name: 'Your photo' }))
    expect(screen.getByText('Replace the photo')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Photo strength' })).getByRole('radio', { name: 'Strong' })).toBeChecked()
  })

  it('paints every drawn texture with its real image from the draft palette, as decoration with no tab stop', async () => {
    const { user } = await renderDesign()
    await openExtras(user)
    for (const kind of NEW_BACKDROPS) {
      const swatch = swatchOf(kind)
      expect(swatch, kind).not.toBeNull()
      expect(swatch!.getAttribute('aria-hidden'), kind).toBe('true')
      expect(swatch!.hasAttribute('tabindex'), kind).toBe(false)
      expect(swatch!.style.getPropertyValue('--swatch-image'), kind).toBe(backdropLayers(kind, SAVED).image)
      expect(swatch!.style.getPropertyValue('--swatch-page'), kind).toBe(SAVED.background)
    }
  })

  it('keeps the classic five on their own CSS drawing, with no image handed in', async () => {
    const { user } = await renderDesign()
    await openExtras(user)
    for (const kind of ['plain', 'paper', 'dots', 'stripes', 'glow']) {
      const swatch = swatchOf(kind)
      expect(swatch, kind).not.toBeNull()
      expect(swatch!.style.getPropertyValue('--swatch-image'), kind).toBe('')
    }
  })

  it('repaints the swatches as a color is edited, and falls back while one is half typed', async () => {
    const { user } = await renderDesign()
    await user.click(screen.getByRole('tab', { name: 'Look' }))
    const background = () => screen.getByLabelText('Background color')
    await user.clear(background())
    await user.type(background(), '#101820')
    await showPart(user, 'Extras')
    const dark = swatchOf('grain')!
    expect(dark.style.getPropertyValue('--swatch-page')).toBe('#101820')
    expect(dark.style.getPropertyValue('--swatch-image')).toBe(
      backdropLayers('grain', { background: '#101820', text: SAVED.text, accent: SAVED.accent }).image,
    )
    await showPart(user, 'Colors')
    await user.clear(background())
    await user.type(background(), '#12')
    await showPart(user, 'Extras')
    // A half-typed color never reaches a style value: the swatch falls back to the default page color.
    expect(swatchOf('grain')!.style.getPropertyValue('--swatch-page')).toBe(DEFAULT_THEME.background)
  })

  it('moves the live preview onto the texture and saves it', async () => {
    const { user, owner } = await renderDesign()
    await openExtras(user)
    await user.click(within(group()).getByRole('radio', { name: 'Terrazzo' }))
    const root = previewRegion().firstElementChild as HTMLElement
    expect(root).toHaveAttribute('data-menu-backdrop', 'terrazzo')
    expect(root.style.getPropertyValue('--menu-backdrop-image')).toContain('data:image/svg+xml')
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect((await owner.getBusiness())?.theme.backdrop).toBe('terrazzo')
  })
})
