import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { env } from '@/config/env'
import { fill } from '@/shared/lib/fill'
import { renderDashboardPage, type DashboardOptions } from '@/test/dashboard'
import { SharePage } from './SharePage'

// The configured address wins over the address of the page, and the page says so when they differ. The test
// environment has none (vite.config.ts blanks it), so each test sets one and puts the old value back.
const configured = 'https://menu.example.com'
const link = `${configured}/m/kape-kanto`
const note = fill(dashboardCopy.share.link.elsewhere, { here: window.location.origin, address: configured })
const original = env.publicOrigin

const render = (options: DashboardOptions = {}) => renderDashboardPage(<SharePage />, '/dashboard/share', options)

beforeEach(() => {
  Object.assign(env, { publicOrigin: configured })
})
afterEach(() => {
  Object.assign(env, { publicOrigin: original })
})

describe('the Share page with a configured public address', () => {
  it('builds the link, the QR code and the card link from the configured address, not the address bar', async () => {
    await render()
    expect(screen.getByRole('textbox', { name: 'Menu link' })).toHaveValue(link)
    expect(screen.getByRole('img', { name: `QR code of ${link}` })).toBeInTheDocument()
    expect(screen.getByText(link, { selector: 'code' })).toBeInTheDocument()
  })

  it('says once, under the link, that the page is open on another address and that every link uses the menu address', async () => {
    await render()
    // Information, not a warning: the link, the QR code and the card link are already built from the menu address.
    const notes = screen.getAllByText(note)
    expect(notes).toHaveLength(1)
    const panel = screen.getByRole('heading', { level: 2, name: 'Your menu link' }).closest('section')
    expect(within(panel as HTMLElement).getByText(note)).toBe(notes[0])
    expect(screen.queryByText(/may stop working/)).not.toBeInTheDocument()
  })

  it('builds the preview and the question of the change form from the configured address too', async () => {
    const { user } = await render()
    await user.click(screen.getByRole('button', { name: 'Change link' }))
    await user.clear(screen.getByRole('textbox', { name: 'New link name' }))
    await user.type(screen.getByRole('textbox', { name: 'New link name' }), 'kape-nuevo')
    expect(await screen.findByText(`Your new link: ${configured}/m/kape-nuevo`)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save link' }))
    const dialog = screen.getByRole('dialog', { name: 'Change your link?' })
    expect(dialog).toHaveTextContent(`${link} stop working`)
    expect(dialog).toHaveTextContent(`${configured}/m/kape-nuevo`)
  })
})

describe('the Share page with no public address', () => {
  it('says nothing about the address, because there is none to compare with', async () => {
    Object.assign(env, { publicOrigin: '' })
    await render()
    expect(screen.queryByText(/You opened this page at/)).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Menu link' })).toHaveValue(`${window.location.origin}/m/kape-kanto`)
  })
})
