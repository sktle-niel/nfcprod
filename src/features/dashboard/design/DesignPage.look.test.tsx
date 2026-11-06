import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { contrastRatio, isDarkColor } from '@/entities/theme/color'
import { styleTheme } from '@/entities/theme/styles'
import { DEFAULT_THEME, modeDefaults } from '@/entities/theme/theme'
import { ACCENT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from '@/entities/theme/validate'
import { BUSINESS_TYPES } from '@/entities/business/business'
import { presetFor } from '@/presets'
import { sampleBusiness } from '@/test/ownerFixtures'
import { previewRegion, renderDesign, saveButton, seedBusiness, showPart, spyOnSave } from './designTestkit'

const COLOR_WORDS = 'Use a color like #8b5a2b, or pick one with the square.'

const accent = () => screen.getByLabelText('Accent color')
const textColor = () => screen.getByLabelText('Text color')
const background = () => screen.getByLabelText('Background color')

async function openLook(user: UserEvent) {
  await user.click(screen.getByRole('tab', { name: 'Look' }))
}

async function typeColor(user: UserEvent, field: HTMLElement, value: string) {
  await user.clear(field)
  await user.type(field, value)
}

describe('DesignPage: the Look tab', () => {
  it('shows the saved colors, the font, the layout and the mode', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    expect(accent()).toHaveValue('#8b5a2b')
    expect(textColor()).toHaveValue('#2b1d14')
    expect(background()).toHaveValue('#f8f3ec')
    expect(screen.getByRole('button', { name: 'Automatic' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Pick the accent color')).toBeInTheDocument()
    await showPart(user, 'Extras')
    expect(screen.getByRole('radio', { name: 'Urbanist' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Grid' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('moves the preview as a color is typed, and saves only the theme', async () => {
    const spy = spyOnSave()
    const { user, owner } = await renderDesign({ wrapOwner: spy.wrap })
    await openLook(user)
    await typeColor(user, background(), '#101820')
    const root = previewRegion().firstElementChild as HTMLElement
    expect(root.style.getPropertyValue('--menu-bg')).toBe('#101820')

    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect(spy.patches).toEqual([{ theme: { ...(await owner.getBusiness())!.theme } }])
    expect((await owner.getBusiness())?.theme.background).toBe('#101820')
    expect(Object.keys(spy.patches[0] ?? {})).toEqual(['theme'])
  })

  it('stores a capitalized color in lowercase', async () => {
    const { user, owner } = await renderDesign()
    await openLook(user)
    await typeColor(user, accent(), '#AABBCC')
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect((await owner.getBusiness())?.theme.primary).toBe('#aabbcc')
  })

  it('keeps the preview on the saved color while a color is half typed, with no warning and no error', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await typeColor(user, textColor(), '#12')
    const root = previewRegion().firstElementChild as HTMLElement
    expect(root.style.getPropertyValue('--menu-text')).toBe('#2b1d14')
    expect(screen.queryByText(/hard to read/)).not.toBeInTheDocument()
    expect(textColor()).not.toBeInvalid()
  })

  it.each([
    ['Accent color', '#12', 'Use a color like #8b5a2b, or pick one with the square.'],
    ['Text color', 'red', 'Use a color like #8b5a2b, or pick one with the square.'],
    ['Background color', '', 'Enter a color like #8b5a2b, or pick one with the square.'],
  ])('refuses %s of "%s" with "%s", on the Look tab with the focus on it', async (label, value, words) => {
    const spy = spyOnSave()
    const { user } = await renderDesign({ wrapOwner: spy.wrap })
    await openLook(user)
    await user.clear(screen.getByLabelText(label))
    if (value) await user.type(screen.getByLabelText(label), value)
    await user.click(saveButton())
    expect(await screen.findByText(words)).toBeInTheDocument()
    expect(screen.getByLabelText(label)).toBeInvalid()
    expect(screen.getByLabelText(label)).toHaveFocus()
    expect(spy.patches).toEqual([])
  })

  it('opens the Look tab for a color problem even from the Details tab', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await typeColor(user, accent(), '#12')
    await user.click(screen.getByRole('tab', { name: 'Details' }))
    await user.click(saveButton())
    expect(await screen.findByText(COLOR_WORDS)).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Look' })).toHaveAttribute('aria-selected', 'true')
    expect(accent()).toHaveFocus()
  })
})

describe('DesignPage: contrast warnings', () => {
  it('says nothing about a theme that reads well', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    expect(screen.queryByText(/hard to read|hard to see/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Fix it/ })).not.toBeInTheDocument()
  })

  it('warns about text that is hard to read, in plain words, and still lets the owner save', async () => {
    const spy = spyOnSave()
    const { user } = await renderDesign({ wrapOwner: spy.wrap })
    await openLook(user)
    await typeColor(user, textColor(), '#f0ece4')
    expect(screen.getByText('Your text is hard to read on this background. Pick a darker or lighter text color, or use Fix it.')).toBeInTheDocument()
    expect(screen.queryByText(/contrast/)).not.toBeInTheDocument()
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect(spy.patches).toHaveLength(1)
  })

  it('fixes the text color with one click and puts the focus on that color', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await typeColor(user, textColor(), '#f0ece4')
    await user.click(screen.getByRole('button', { name: /^Fix it: use #[0-9a-f]{6} as the text color$/ }))
    expect(screen.queryByText(/Your text is hard to read/)).not.toBeInTheDocument()
    expect(contrastRatio((textColor() as HTMLInputElement).value, '#f8f3ec')).toBeGreaterThanOrEqual(TEXT_CONTRAST_MIN)
    expect(textColor()).toHaveFocus()
    expect(saveButton()).toBeEnabled()
  })

  it('warns about an accent that is hard to see and fixes it, keeping the color family', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await typeColor(user, accent(), '#f6efe0')
    expect(screen.getByText(/Your accent color is hard to see on this background/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Fix it: use #[0-9a-f]{6} as the accent color$/ }))
    const fixed = (accent() as HTMLInputElement).value
    expect(fixed).toMatch(/^#[0-9a-f]{6}$/)
    expect(fixed).not.toBe('#f6efe0')
    expect(contrastRatio(fixed, '#f8f3ec')).toBeGreaterThanOrEqual(ACCENT_CONTRAST_MIN)
    expect(screen.queryByText(/hard to see/)).not.toBeInTheDocument()
    expect(accent()).toHaveFocus()
  })

  it('shows both warnings together, each with its own fix', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await typeColor(user, background(), '#808080')
    await typeColor(user, textColor(), '#858585')
    await typeColor(user, accent(), '#858585')
    const warnings = screen.getAllByRole('listitem').filter((item) => /hard to/.test(item.textContent ?? ''))
    expect(warnings).toHaveLength(2)
    expect(within(warnings[0]!).getByRole('button', { name: /Fix it/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /as the text color$/ }))
    expect(screen.queryByText(/Your text is hard to read/)).not.toBeInTheDocument()
    expect(screen.getByText(/Your accent color is hard to see/)).toBeInTheDocument()
  })

  it('also reacts when the background changes, not only the text', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await typeColor(user, background(), '#2b1d15')
    expect(screen.getByText(/Your text is hard to read/)).toBeInTheDocument()
  })
})

describe('DesignPage: light and dark', () => {
  it('moves the page and text colors of a menu on the default light look, and back', async () => {
    const { user } = await renderDesign({ seed: seedBusiness({ theme: DEFAULT_THEME }) })
    await openLook(user)
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
    expect(background()).toHaveValue('#11161f')
    expect(textColor()).toHaveValue('#eef2f9')
    await user.click(screen.getByRole('button', { name: 'Light' }))
    expect(background()).toHaveValue('#ffffff')
    expect(textColor()).toHaveValue('#19202b')
    expect(saveButton()).toBeDisabled()
  })

  it('makes the cream page of a preset dark in one tap, keeps the accent, and saves it', async () => {
    const spy = spyOnSave()
    const { user, owner } = await renderDesign({ wrapOwner: spy.wrap })
    await openLook(user)
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    expect(background()).toHaveValue(modeDefaults('dark').background)
    expect(textColor()).toHaveValue(modeDefaults('dark').secondary)
    expect(accent()).toHaveValue('#8b5a2b')
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect((await owner.getBusiness())?.theme).toMatchObject({ mode: 'dark', primary: '#8b5a2b', background: '#11161f' })
  })

  it('brings the brand colors back on Light, and is clean again', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    await user.click(screen.getByRole('button', { name: 'Light' }))
    expect(background()).toHaveValue('#f8f3ec')
    expect(textColor()).toHaveValue('#2b1d14')
    expect(saveButton()).toBeDisabled()
  })

  it('keeps colors that already suit the mode: Light on a light page changes nothing but the mode word', async () => {
    // A cream page that says "dark": the owner's own colors, which suit Light already.
    const { user } = await renderDesign({ seed: seedBusiness({ theme: { ...sampleBusiness().theme, mode: 'dark' } }) })
    await openLook(user)
    await user.click(screen.getByRole('button', { name: 'Light' }))
    expect(background()).toHaveValue('#f8f3ec')
    expect(textColor()).toHaveValue('#2b1d14')
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true')
  })

  it.each(BUSINESS_TYPES)('flips the %s look to the other mode in one tap, with cards and lines that show', async (type) => {
    const preset = presetFor(type).theme
    const flip = preset.mode === 'light' ? 'dark' : 'light'
    // A style has a palette for each mode, so the flip lands on the style's own other palette (its accent changes with it).
    const other = styleTheme(preset.style, flip)
    const { user } = await renderDesign({ seed: seedBusiness({ theme: preset }) })
    await openLook(user)
    await user.click(screen.getByRole('button', { name: flip === 'dark' ? 'Dark' : 'Light' }))
    const root = previewRegion().firstElementChild as HTMLElement
    const page = root.style.getPropertyValue('--menu-bg')
    expect(isDarkColor(page)).toBe(flip === 'dark')
    expect(contrastRatio(root.style.getPropertyValue('--menu-text'), page)).toBeGreaterThanOrEqual(TEXT_CONTRAST_MIN)
    expect(root.style.getPropertyValue('--menu-line')).toBe(flip === 'dark' ? '#ffffff1f' : '#19202b1f')
    expect(root.style.getPropertyValue('--menu-accent')).toBe(other.primary)
    await user.click(screen.getByRole('button', { name: flip === 'dark' ? 'Light' : 'Dark' }))
    expect(background()).toHaveValue(preset.background)
    expect(textColor()).toHaveValue(preset.secondary)
  })

  it('turns the preview dark', async () => {
    const { user } = await renderDesign({ seed: seedBusiness({ theme: DEFAULT_THEME }) })
    await openLook(user)
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    const root = previewRegion().firstElementChild as HTMLElement
    expect(root.style.getPropertyValue('--menu-bg')).toBe('#11161f')
  })
})

describe('DesignPage: font and layout', () => {
  it('writes each font option in its own font', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await showPart(user, 'Extras')
    expect(screen.getByText('Instrument Serif').style.fontFamily).toContain('--font-serif')
    expect(screen.getByText('Urbanist').style.fontFamily).toContain('--font-sans')
    expect(screen.getByText('Device default').style.fontFamily).toContain('system-ui')
  })

  it('saves a new font and layout in the theme', async () => {
    const spy = spyOnSave()
    const { user, owner } = await renderDesign({ wrapOwner: spy.wrap })
    await openLook(user)
    await showPart(user, 'Extras')
    await user.click(screen.getByRole('radio', { name: 'Instrument Serif' }))
    await user.click(screen.getByRole('radio', { name: 'List' }))
    const root = previewRegion().firstElementChild as HTMLElement
    expect(root).toHaveAttribute('data-menu-layout', 'list')
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect((await owner.getBusiness())?.theme).toMatchObject({ font: 'instrumentSerif', layout: 'list' })
    expect(spy.patches).toHaveLength(1)
  })

  it('chooses with the arrow keys like any radio group', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await showPart(user, 'Extras')
    screen.getByRole('radio', { name: 'Grid' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'List' })).toBeChecked()
    expect(saveButton()).toBeEnabled()
  })

  it('goes back to clean when the owner picks the saved choice again', async () => {
    const { user } = await renderDesign()
    await openLook(user)
    await showPart(user, 'Extras')
    await user.click(screen.getByRole('radio', { name: 'List' }))
    await user.click(screen.getByRole('radio', { name: 'Grid' }))
    expect(saveButton()).toBeDisabled()
  })
})
