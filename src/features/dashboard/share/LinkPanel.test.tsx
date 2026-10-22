import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { OwnerError, type OwnerRepository } from '@/data/ownerRepository'
import { renderDashboardPage, type DashboardOptions } from '@/test/dashboard'
import { SharePage } from './SharePage'

const render = (options: DashboardOptions = {}) => renderDashboardPage(<SharePage />, '/dashboard/share', options)
const origin = window.location.origin
const { notLive, paused, pausedDraft } = dashboardCopy.share.link
const linkBox = () => screen.getByRole('textbox', { name: 'Menu link' })
const trigger = () => screen.getByRole('button', { name: 'Change link' })
const field = () => screen.getByRole('textbox', { name: 'New link name' })
const save = () => screen.getByRole('button', { name: 'Save link' })

/** Counts the slugs the page asked about. */
function counting() {
  const asked: string[] = []
  const wrapOwner = (real: OwnerRepository): OwnerRepository => ({
    ...real,
    checkSlug: (slug) => {
      asked.push(slug)
      return real.checkSlug(slug)
    },
  })
  return { asked, wrapOwner }
}

async function openForm(options: DashboardOptions = {}) {
  const harness = await render(options)
  await harness.user.click(trigger())
  return harness
}

async function typeLink(user: Awaited<ReturnType<typeof render>>['user'], value: string) {
  await user.clear(field())
  await user.type(field(), value)
}

describe('link panel', () => {
  it('shows the full link in a read-only box', async () => {
    await render()
    expect(linkBox()).toHaveValue(`${origin}/m/kape-kanto`)
    expect(linkBox()).toHaveAttribute('readonly')
  })

  it('copies the link and announces it', async () => {
    const { user } = await render()
    await user.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(await screen.findByText('Link copied.')).toBeInTheDocument()
    expect(await navigator.clipboard.readText()).toBe(`${origin}/m/kape-kanto`)
  })

  it('says so, in words, when the clipboard refuses', async () => {
    const { user } = await render()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
    await user.click(screen.getByRole('button', { name: 'Copy link' }))
    // The failure goes into the one status line, in the error look, and not into a second region.
    const status = await screen.findByText(dashboardCopy.share.link.copyFailed)
    expect(status).toHaveAttribute('role', 'status')
    expect(status).toHaveAttribute('data-state', 'error')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('Link copied.')).not.toBeInTheDocument()
  })

  it('opens the menu in the owner preview, in the same tab, in demo mode', async () => {
    await render()
    const open = screen.getByRole('link', { name: 'Open menu' })
    expect(open).toHaveAttribute('href', '/dashboard/preview')
    expect(open).not.toHaveAttribute('target')
  })

  it('tells the owner of a draft to publish it', async () => {
    await render()
    expect(await screen.findByText(dashboardCopy.share.link.notLive)).toBeInTheDocument()
  })

  it('has no note when the menu is live', async () => {
    await render({ published: true })
    await screen.findByText(/Anyone with your link/)
    expect(screen.queryByText(notLive)).not.toBeInTheDocument()
    expect(screen.queryByText(paused)).not.toBeInTheDocument()
  })

  it('tells the owner of a published menu to choose a plan, not to publish, when the plan ended', async () => {
    await render({ published: true, plan: 'ended' })
    expect(await screen.findByText(paused)).toBeInTheDocument()
    expect(screen.queryByText(notLive)).not.toBeInTheDocument()
  })

  it('tells the owner of a draft that the link needs a plan and then publishing, when the plan ended', async () => {
    await render({ plan: 'ended' })
    expect(await screen.findByText(pausedDraft)).toBeInTheDocument()
    // Not "until you choose a plan" alone: after paying, a draft still shows nothing.
    expect(screen.queryByText(paused)).not.toBeInTheDocument()
    expect(screen.queryByText(notLive)).not.toBeInTheDocument()
  })
})

describe('change link', () => {
  it('opens a form with the field focused, and closes it again with the focus back on the button', async () => {
    const { user } = await openForm()
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    expect(field()).toHaveFocus()
    expect(field()).toHaveValue('kape-kanto')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('textbox', { name: 'New link name' })).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()
  })

  it('knows the current link without asking and does not let it be saved', async () => {
    const { asked, wrapOwner } = counting()
    await openForm({ wrapOwner })
    expect(screen.getByText('This is your current link.')).toBeInTheDocument()
    expect(save()).toBeDisabled()
    expect(asked).toEqual([])
  })

  it('refuses a badly formed or reserved link at once, without asking', async () => {
    const { asked, wrapOwner } = counting()
    const { user } = await openForm({ wrapOwner })
    await typeLink(user, 'ab')
    expect(screen.getByText(/Use 3 to 40 lowercase letters, numbers and hyphens/)).toBeInTheDocument()
    expect(field()).toBeInvalid()
    await typeLink(user, 'dashboard')
    expect(screen.getByText(/That word is kept for us/)).toBeInTheDocument()
    expect(save()).toBeDisabled()
    expect(asked).toEqual([])
  })

  it('writes the link in lowercase', async () => {
    const { user } = await openForm()
    await typeLink(user, 'New-Link')
    expect(field()).toHaveValue('new-link')
  })

  it('asks once after the owner stops typing and says the link is free', async () => {
    const { asked, wrapOwner } = counting()
    const { user } = await openForm({ wrapOwner })
    await typeLink(user, 'kape-nuevo')
    expect(screen.getByText('Checking if this link is free.')).toBeInTheDocument()
    expect(save()).toBeDisabled()
    expect(await screen.findByText('This link is free.')).toBeInTheDocument()
    expect(asked).toEqual(['kape-nuevo'])
    expect(save()).toBeEnabled()
    expect(screen.getByText(`Your new link: ${origin}/m/kape-nuevo`)).toBeInTheDocument()
  })

  it('says a link that another business uses is taken and does not let it be saved', async () => {
    const { user } = await openForm()
    await typeLink(user, 'cafe-luna')
    expect(await screen.findByText('That link is already taken. Try another.')).toBeInTheDocument()
    expect(field()).toBeInvalid()
    expect(save()).toBeDisabled()
  })

  it('says it could not check when the check fails', async () => {
    const wrapOwner = (real: OwnerRepository): OwnerRepository => ({ ...real, checkSlug: () => Promise.reject(new OwnerError('network')) })
    const { user } = await openForm({ wrapOwner })
    await typeLink(user, 'kape-nuevo')
    expect(await screen.findByText(/We could not check this link/)).toBeInTheDocument()
    expect(save()).toBeDisabled()
  })

  it('warns that written cards stop working and changes nothing until the owner confirms', async () => {
    const { user, owner } = await openForm()
    await typeLink(user, 'kape-nuevo')
    await screen.findByText('This link is free.')
    await user.click(save())
    const dialog = screen.getByRole('dialog', { name: 'Change your link?' })
    expect(dialog).toHaveTextContent(`${origin}/m/kape-kanto stop working until you write them again`)
    expect(dialog).toHaveTextContent(`${origin}/m/kape-nuevo`)
    expect((await owner.getBusiness())?.slug).toBe('kape-kanto')
    // The safe choice has the focus.
    expect(within(dialog).getByRole('button', { name: 'Keep the old link' })).toHaveFocus()
  })

  it('keeps the old link when the owner backs out of the question', async () => {
    const { user, owner } = await openForm()
    await typeLink(user, 'kape-nuevo')
    await screen.findByText('This link is free.')
    await user.click(save())
    await user.click(screen.getByRole('button', { name: 'Keep the old link' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect((await owner.getBusiness())?.slug).toBe('kape-kanto')
    expect(linkBox()).toHaveValue(`${origin}/m/kape-kanto`)
  })

  it('changes the link once confirmed, updates the page and puts the focus on the button', async () => {
    const { user, owner } = await openForm()
    await typeLink(user, 'kape-nuevo')
    await screen.findByText('This link is free.')
    await user.click(save())
    await user.click(screen.getByRole('button', { name: 'Change the link' }))
    expect(await screen.findByText(/Link changed\. Write it to your cards again/)).toBeInTheDocument()
    expect((await owner.getBusiness())?.slug).toBe('kape-nuevo')
    expect(linkBox()).toHaveValue(`${origin}/m/kape-nuevo`)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'New link name' })).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()
    // The QR code and the NFC guide follow the new link.
    expect(screen.getByRole('img', { name: `QR code of ${origin}/m/kape-nuevo` })).toBeInTheDocument()
    expect(screen.getByText(`${origin}/m/kape-nuevo`, { selector: 'code' })).toBeInTheDocument()
  })

  it('can be sent with Enter from the field', async () => {
    const { user } = await openForm()
    await typeLink(user, 'kape-nuevo')
    await screen.findByText('This link is free.')
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog', { name: 'Change your link?' })).toBeInTheDocument()
  })

  it('does nothing on Enter while the link is not free', async () => {
    const { user } = await openForm()
    await typeLink(user, 'cafe-luna')
    await screen.findByText('That link is already taken. Try another.')
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('turns to "taken" when someone took the link between the check and the change', async () => {
    const wrapOwner = (real: OwnerRepository): OwnerRepository => ({
      ...real,
      checkSlug: () => Promise.resolve('available'),
      changeSlug: () => Promise.reject(new OwnerError('slugTaken')),
    })
    const { user, owner } = await openForm({ wrapOwner })
    await typeLink(user, 'kape-nuevo')
    await screen.findByText('This link is free.')
    await user.click(save())
    await user.click(screen.getByRole('button', { name: 'Change the link' }))
    expect(await screen.findByText('That link is already taken. Try another.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(save()).toBeDisabled()
    expect(field()).toHaveFocus()
    expect((await owner.getBusiness())?.slug).toBe('kape-kanto')
  })

  it('puts the focus on the field only after the question is gone, because a modal page cannot take it', async () => {
    const wrapOwner = (real: OwnerRepository): OwnerRepository => ({
      ...real,
      checkSlug: () => Promise.resolve('available'),
      changeSlug: () => Promise.reject(new OwnerError('slugTaken')),
    })
    const { user } = await openForm({ wrapOwner })
    await typeLink(user, 'kape-nuevo')
    await screen.findByText('This link is free.')
    await user.click(save())
    // jsdom does not make the page behind a modal dialog inert, so the test looks at when focus() is called.
    const whileOpen: Element[] = []
    const real = HTMLElement.prototype.focus
    const spy = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement, options) {
      if (document.querySelector('dialog')) whileOpen.push(this)
      real.call(this, options)
    })
    try {
      await user.click(screen.getByRole('button', { name: 'Change the link' }))
      await screen.findByText('That link is already taken. Try another.')
      await waitFor(() => expect(field()).toHaveFocus())
      expect(whileOpen).not.toContain(field())
    } finally {
      spy.mockRestore()
    }
  })

  it('offers Check again when the check fails, asks again, and keeps the focus on the field', async () => {
    let failures = 1
    const wrapOwner = (real: OwnerRepository): OwnerRepository => ({
      ...real,
      checkSlug: async (slug) => {
        if (failures-- > 0) throw new OwnerError('network')
        return real.checkSlug(slug)
      },
    })
    const { user } = await openForm({ wrapOwner })
    await typeLink(user, 'kape-nuevo')
    await screen.findByText(dashboardCopy.share.change.status.failed)
    await user.click(screen.getByRole('button', { name: 'Check again' }))
    expect(field()).toHaveFocus()
    expect(await screen.findByText('This link is free.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Check again' })).not.toBeInTheDocument()
    expect(save()).toBeEnabled()
  })

  it('keeps the question open and says why when the change fails', async () => {
    const wrapOwner = (real: OwnerRepository): OwnerRepository => ({ ...real, changeSlug: () => Promise.reject(new OwnerError('network')) })
    const { user } = await openForm({ wrapOwner })
    await typeLink(user, 'kape-nuevo')
    await screen.findByText('This link is free.')
    await user.click(save())
    await user.click(screen.getByRole('button', { name: 'Change the link' }))
    const dialog = screen.getByRole('dialog', { name: 'Change your link?' })
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('We could not reach the server.')
    expect(linkBox()).toHaveValue(`${origin}/m/kape-kanto`)
  })
})
