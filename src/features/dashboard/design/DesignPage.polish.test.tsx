import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { renderDesign, showPart } from './designTestkit'

const text = dashboardCopy.design

afterEach(() => vi.restoreAllMocks())

describe('DesignPage: what becomes public', () => {
  it('says above the contact fields that phone, address, hours and links show on the public menu', async () => {
    await renderDesign()
    const contact = screen.getByRole('heading', { name: 'Contact and hours' }).closest('section')!
    expect(within(contact).getByText(text.details.contactNote)).toBeInTheDocument()
    expect(text.details.contactNote).toMatch(/phone, address, opening hours and links/)
    expect(text.details.contactNote).toMatch(/public menu/)
  })

  it('says the name, tagline and logo show at the top, and what the phone and address are used for', async () => {
    await renderDesign()
    const business = screen.getByRole('heading', { name: 'Your business' }).closest('section')!
    expect(within(business).getByText(text.details.businessNote)).toBeInTheDocument()
    expect(screen.getByLabelText('Phone')).toHaveAccessibleDescription(text.details.phoneHint)
    expect(screen.getByLabelText('Address')).toHaveAccessibleDescription(text.details.addressHint)
  })

  it('keeps the note when a field has an error, because the note is not a hint of one field', async () => {
    const { user } = await renderDesign()
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: 'call me' } })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByText(/digits, spaces and \+/)
    expect(screen.getByText(text.details.contactNote)).toBeInTheDocument()
  })

  it('tells the Online links they show on the public menu', async () => {
    await renderDesign()
    expect(screen.getByText(/Links show at the bottom of your public menu/)).toBeInTheDocument()
  })

  it('says in the preview that this is how customers will see the menu', async () => {
    await renderDesign()
    expect(screen.getAllByText(/how customers will see your menu/).length).toBeGreaterThan(0)
  })
})

describe('DesignPage: form attributes and words', () => {
  it('gives the links a url keyboard and turns autofill off for the name', async () => {
    await renderDesign()
    for (const label of ['Facebook link', 'Instagram link', 'TikTok link', 'Website']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('inputmode', 'url')
      expect(screen.getByLabelText(label)).toHaveAttribute('autocomplete', 'off')
    }
    expect(screen.getByLabelText('Business name')).toHaveAttribute('autocomplete', 'off')
    expect(screen.getByLabelText('Phone')).toHaveAttribute('inputmode', 'tel')
  })

  it('names the corners choice for what it changes, and writes the font option for the device in plain words', async () => {
    const { user } = await renderDesign()
    await user.click(screen.getByRole('tab', { name: 'Look' }))
    await showPart(user, 'Extras')
    const corners = screen.getByRole('group', { name: 'Corners' })
    expect(corners).toHaveAccessibleDescription(text.look.buttonStyle.hint)
    expect(within(corners).getAllByText('Best seller')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Device default' })).toBeInTheDocument()
    expect(screen.queryByText('System')).not.toBeInTheDocument()
  })
})

describe('DesignPage: the warning announcement', () => {
  const swatch = () => screen.getByLabelText('Pick the text color')
  const accentSwatch = () => screen.getByLabelText('Pick the accent color')
  // The hidden status line of the warnings: always in the page, with words only while a warning stands.
  const announcement = () => {
    const region = document.querySelector<HTMLElement>('p[role="status"][class*="visuallyHidden"]')
    if (!region) throw new Error('no warnings status line')
    return region
  }

  it('says one fixed sentence when a warning appears, and nothing when there is none', async () => {
    const { user } = await renderDesign()
    await user.click(screen.getByRole('tab', { name: 'Look' }))
    expect(announcement()).toBeEmptyDOMElement()
    fireEvent.input(swatch(), { target: { value: '#f0ece4' } })
    expect(announcement()).toHaveTextContent(text.look.announce.textContrast)
    await user.click(screen.getByRole('button', { name: /^Fix it: use #[0-9a-f]{6} as the text color$/ }))
    expect(announcement()).toBeEmptyDOMElement()
  })

  it('does not change while the color picker is dragged and the warning stays', async () => {
    const { user } = await renderDesign()
    await user.click(screen.getByRole('tab', { name: 'Look' }))
    fireEvent.input(swatch(), { target: { value: '#f0ece4' } })
    fireEvent.input(accentSwatch(), { target: { value: '#f8f3e0' } })
    const region = announcement()
    const spoken = region.textContent
    const changes: MutationRecord[] = []
    const watcher = new MutationObserver((records) => changes.push(...records))
    watcher.observe(region, { childList: true, characterData: true, subtree: true })

    for (const value of ['#f0ece0', '#f0ece1', '#f2eee6', '#f4f0e8', '#f5f1ea', '#f6f2eb']) fireEvent.input(swatch(), { target: { value } })
    // The accent moves too: its fix color changes on every step, and it sits outside the region.
    for (const value of ['#f8f3e1', '#f8f3e2', '#f8f3e3']) fireEvent.input(accentSwatch(), { target: { value } })

    // Records are delivered as a microtask, so take what is waiting.
    changes.push(...watcher.takeRecords())
    watcher.disconnect()
    expect(changes).toEqual([])
    expect(region.textContent).toBe(spoken)
    expect(spoken).toBe(`${text.look.announce.textContrast} ${text.look.announce.accentContrast}`)
  })

  it('adds the sentence for the second warning and drops it when that one goes', async () => {
    const { user } = await renderDesign()
    await user.click(screen.getByRole('tab', { name: 'Look' }))
    fireEvent.input(swatch(), { target: { value: '#f0ece4' } })
    fireEvent.input(accentSwatch(), { target: { value: '#f6efe0' } })
    expect(announcement().textContent).toBe(`${text.look.announce.textContrast} ${text.look.announce.accentContrast}`)
    await user.click(screen.getByRole('button', { name: /as the accent color$/ }))
    expect(announcement().textContent).toBe(text.look.announce.textContrast)
  })

  it('keeps the warning list out of the live region, so the changing fix color is not read', async () => {
    const { user } = await renderDesign()
    await user.click(screen.getByRole('tab', { name: 'Look' }))
    fireEvent.input(swatch(), { target: { value: '#f0ece4' } })
    const fixButton = screen.getByRole('button', { name: /^Fix it: use/ })
    expect(announcement().contains(fixButton)).toBe(false)
    expect(fixButton.closest('[role="status"]')).toBeNull()
  })
})

describe('DesignPage: room for the sticky save bar', () => {
  const root = () => document.documentElement.style

  it('sets --save-bar-h on the root while the bar is on the page, and removes it with the bar', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(72)
    await renderDesign()
    expect(root().getPropertyValue('--save-bar-h')).toBe('72px')
    cleanup()
    expect(root().getPropertyValue('--save-bar-h')).toBe('')
  })

  it('adds how far the bar floats above the screen edge', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(72)
    const real = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
      const style = real(element, pseudo)
      if (!element.className.includes('bar')) return style
      return new Proxy(style, { get: (target, key) => (key === 'bottom' ? '80px' : Reflect.get(target, key)) })
    })
    await renderDesign()
    expect(root().getPropertyValue('--save-bar-h')).toBe('152px')
  })
})
