import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, modeDefaults, type Theme } from '@/entities/theme/theme'
import { previewRegion, renderDesign, saveButton, showPart, spyOnSave } from './designTestkit'

type Part = 'Colors' | 'Extras'

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
    expect(within(parts()).getAllByRole('button').map((button) => button.textContent)).toEqual(['Colors', 'Extras'])
    expect(within(parts()).getByRole('button', { name: 'Colors' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Accent color')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Page background' })).not.toBeInTheDocument()
    await showPart(user, 'Extras')
    expect(within(parts()).getByRole('button', { name: 'Extras' })).toHaveAttribute('aria-pressed', 'true')
    for (const legend of ['Page background', 'Font', 'Menu layout']) expect(screen.getByRole('group', { name: legend })).toBeInTheDocument()
    expect(screen.queryByLabelText('Accent color')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Extras' })).toBeInTheDocument()
    // The cards, headings, line art and corners are not offered while the menu styles are redesigned.
    for (const name of ['Cards', 'Headings']) expect(within(parts()).queryByRole('button', { name })).not.toBeInTheDocument()
    for (const legend of ['Card layout', 'Category titles', 'Decoration', 'Corners']) {
      expect(screen.queryByRole('group', { name: legend })).not.toBeInTheDocument()
    }
  })

  it.each<[Part, string, string, string, string, Partial<Theme>]>([
    ['Extras', 'Page background', 'Your photo', 'data-menu-backdrop', 'picture', { backdrop: 'picture' }],
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
    await openLook(user)
    await user.clear(screen.getByLabelText('Accent color'))
    await user.type(screen.getByLabelText('Accent color'), '#2266aa')
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    await showPart(user, 'Extras')
    await user.click(screen.getByRole('radio', { name: 'Your photo' }))
    await user.click(screen.getByRole('radio', { name: 'Anton' }))
    await user.click(screen.getByRole('radio', { name: 'List' }))
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect(spy.patches).toHaveLength(1)
    const sent = spy.patches[0]?.theme
    expect(Object.keys(sent ?? {}).sort()).toEqual(Object.keys(DEFAULT_THEME).sort())
    // Dark moves the page and text colors to the plain dark pair; the owner accent stays.
    const { background, secondary } = modeDefaults('dark')
    const expected = { primary: '#2266aa', secondary, background, mode: 'dark', backdrop: 'picture', font: 'anton', layout: 'list' }
    expect(sent).toMatchObject(expected)
    expect((await owner.getBusiness())?.theme).toEqual(sent)
  })
})
