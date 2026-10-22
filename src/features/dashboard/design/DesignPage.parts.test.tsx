import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, type Theme } from '@/entities/theme/theme'
import { previewRegion, renderDesign, saveButton, showPart, spyOnSave } from './designTestkit'

type Part = 'Colors' | 'Cards' | 'Headings' | 'Extras'

const previewRoot = () => previewRegion().firstElementChild as HTMLElement
const parts = () => screen.getByRole('group', { name: 'Part of the look to change' })

async function openLook(user: UserEvent, part?: Part) {
  await user.click(screen.getByRole('tab', { name: 'Look' }))
  if (part) await showPart(user, part)
}

describe('DesignPage: the parts of the look', () => {
  it('shows one part at a time, Colors first', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    expect(within(parts()).getByRole('button', { name: 'Colors' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Accent color')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Card layout' })).not.toBeInTheDocument()
    await showPart(user, 'Cards')
    expect(screen.getByRole('group', { name: 'Card layout' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Accent color')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cards' })).toBeInTheDocument()
  })

  it.each<[Part, string, string, string, string, Partial<Theme>]>([
    ['Cards', 'Card layout', 'Price list', 'data-menu-card', 'leader', { card: 'leader' }],
    ['Cards', 'Picture shape', 'Arch', 'data-menu-photo', 'arch', { photo: 'arch' }],
    ['Headings', 'Category titles', 'Ribbon', 'data-menu-title', 'ribbon', { title: 'ribbon' }],
    ['Headings', 'Menu header', 'Frame', 'data-menu-header', 'frame', { header: 'frame' }],
    ['Extras', 'Decoration', 'Leaves', 'data-menu-decor', 'leaves', { decor: 'leaves' }],
    ['Extras', 'Page texture', 'Dots', 'data-menu-backdrop', 'dots', { backdrop: 'dots' }],
    ['Extras', 'Menu layout', 'List', 'data-menu-columns', 'one', { layout: 'list' }],
  ])('%s: %s "%s" changes the preview and is saved', async (part, legend, option, attribute, value, saved) => {
    const { user, owner } = await renderDesign()
    await openLook(user, part)
    await user.click(within(screen.getByRole('group', { name: legend })).getByRole('radio', { name: option }))
    expect(previewRoot()).toHaveAttribute(attribute, value)
    expect(saveButton()).toBeEnabled()
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect((await owner.getBusiness())?.theme).toMatchObject(saved)
  })

  it('names every card layout and picture shape, with a drawing that screen readers skip', async () => {
    const { user } = await renderDesign()
    await openLook(user, 'Cards')
    const cards = within(screen.getByRole('group', { name: 'Card layout' })).getAllByRole('radio')
    expect(cards.map((radio) => radio.getAttribute('value'))).toEqual(['row', 'leader', 'tile', 'badge', 'outline', 'soft', 'plate', 'poster'])
    for (const radio of cards) expect(radio.parentElement?.querySelector('[aria-hidden="true"] span')).not.toBeNull()
    expect(within(screen.getByRole('group', { name: 'Picture shape' })).getAllByRole('radio')).toHaveLength(4)
  })

  it('says what a cut-out picture needs, only once Cut-out is chosen', async () => {
    const { user } = await renderDesign()
    await openLook(user, 'Cards')
    const hint = 'Made for PNG or WebP pictures with a transparent background. An ordinary photo shows with rounded corners instead.'
    expect(screen.queryByText(hint)).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Cut-out' }))
    expect(screen.getByRole('group', { name: 'Picture shape' })).toHaveAccessibleDescription(hint)
    expect(previewRoot()).toHaveAttribute('data-menu-photo', 'cutout')
  })

  it('features a best seller with a switch', async () => {
    const spy = spyOnSave()
    const { user } = await renderDesign({ wrapOwner: spy.wrap })
    await openLook(user, 'Cards')
    const spotlight = screen.getByRole('switch', { name: 'Feature a best seller at the top' })
    expect(spotlight).toHaveAttribute('aria-checked', 'false')
    await user.click(spotlight)
    expect(spotlight).toHaveAttribute('aria-checked', 'true')
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect(spy.patches[0]?.theme?.spotlight).toBe(true)
  })

  it('writes each category title option in its own look, named for screen readers by its label', async () => {
    const { user } = await renderDesign()
    await openLook(user, 'Headings')
    const titles = screen.getByRole('group', { name: 'Category titles' })
    const names = ['Simple', 'Bullets', 'Script', 'Ribbon', 'Ornament', 'Underline', 'Band']
    expect(within(titles).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(
      ['plain', 'bullets', 'script', 'ribbon', 'ornament', 'rule', 'stripe'],
    )
    for (const name of names) {
      const radio = within(titles).getByRole('radio', { name })
      const sample = radio.parentElement!.querySelector<HTMLElement>('[aria-hidden="true"] [data-menu-title]')!
      expect(sample).toHaveAttribute('data-menu-title', radio.getAttribute('value'))
      expect(sample).toHaveTextContent(name)
      expect(sample.style.getPropertyValue('--menu-bg')).toBe('#f8f3ec')
    }
    // The samples are pictures: they add no heading to the page.
    expect(screen.queryByRole('heading', { name: 'Ribbon' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Menu header' })).getAllByRole('radio')).toHaveLength(5)
  })
})

describe('DesignPage: the card color', () => {
  it('is automatic until the owner picks one, and starts from the automatic color', async () => {
    const { user, owner } = await renderDesign()
    await openLook(user)
    expect(screen.getByRole('button', { name: 'Automatic' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByLabelText('Your card color')).not.toBeInTheDocument()
    const automatic = previewRoot().style.getPropertyValue('--menu-surface')
    await user.click(screen.getByRole('button', { name: 'My own color' }))
    expect(screen.getByLabelText('Your card color')).toHaveValue(automatic)
    await user.clear(screen.getByLabelText('Your card color'))
    await user.type(screen.getByLabelText('Your card color'), '#FFFAF1')
    expect(previewRoot().style.getPropertyValue('--menu-surface')).toBe('#fffaf1')
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect((await owner.getBusiness())?.theme.surface).toBe('#fffaf1')
  })

  it('goes back to automatic, and is clean again', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await user.click(screen.getByRole('button', { name: 'My own color' }))
    expect(saveButton()).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Automatic' }))
    expect(screen.queryByLabelText('Your card color')).not.toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it('refuses a half typed card color with words beside it, back on the Colors part with the focus on it', async () => {
    const spy = spyOnSave()
    const { user } = await renderDesign({ wrapOwner: spy.wrap })
    await openLook(user)
    await user.click(screen.getByRole('button', { name: 'My own color' }))
    await user.clear(screen.getByLabelText('Your card color'))
    await user.type(screen.getByLabelText('Your card color'), '#ff')
    // The preview keeps the last whole card color while it is typed.
    expect(previewRoot().style.getPropertyValue('--menu-surface')).toMatch(/^#[0-9a-f]{6}$/)
    await showPart(user, 'Extras')
    await user.click(saveButton())
    expect(await screen.findByText('Use a color like #fffaf1, or pick one with the square.')).toBeInTheDocument()
    expect(screen.getByLabelText('Your card color')).toBeInvalid()
    expect(screen.getByLabelText('Your card color')).toHaveFocus()
    expect(spy.patches).toEqual([])
  })
})

describe('DesignPage: saving the look', () => {
  it('sends one theme patch with every field, and the repository keeps them all', async () => {
    const spy = spyOnSave()
    const { user, owner } = await renderDesign({ wrapOwner: spy.wrap })
    await openLook(user, 'Cards')
    await user.click(screen.getByRole('radio', { name: 'Soft card' }))
    await user.click(screen.getByRole('radio', { name: 'Circle' }))
    await showPart(user, 'Headings')
    await user.click(screen.getByRole('radio', { name: 'Band' }))
    await user.click(screen.getByRole('radio', { name: 'Big name' }))
    await showPart(user, 'Extras')
    await user.click(screen.getByRole('radio', { name: 'Sparkles' }))
    await user.click(screen.getByRole('radio', { name: 'Glow' }))
    await user.click(screen.getByRole('radio', { name: 'Anton' }))
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    const sent = spy.patches[0]?.theme
    expect(Object.keys(sent ?? {}).sort()).toEqual(Object.keys(DEFAULT_THEME).sort())
    const expected = { card: 'soft', photo: 'circle', title: 'stripe', header: 'poster', decor: 'sparkles', backdrop: 'glow', font: 'anton' }
    expect(sent).toMatchObject(expected)
    expect((await owner.getBusiness())?.theme).toEqual(sent)
  })
})
