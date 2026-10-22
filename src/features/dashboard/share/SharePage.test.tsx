import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OwnerError, type OwnerRepository } from '@/data/ownerRepository'
import { NOW, renderDashboardPage, type DashboardOptions } from '@/test/dashboard'
import { SharePage } from './SharePage'

const render = (options: DashboardOptions = {}) => renderDashboardPage(<SharePage />, '/dashboard/share', options)
const publishSwitch = () => screen.getByRole('switch', { name: 'Publish your menu' })
const failing = (method: 'setPublished' | 'changeSlug') => (real: OwnerRepository) => ({
  ...real,
  [method]: () => Promise.reject(new OwnerError('network')),
})

describe('SharePage', () => {
  it('has one h1 and a panel for each part', async () => {
    await render()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Share' })).toBeInTheDocument()
    for (const name of ['Publish', 'Your menu link', 'QR code', 'Write your link to an NFC card']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument()
    }
  })
})

describe('publish panel', () => {
  it('starts hidden for a draft menu and explains it', async () => {
    await render()
    expect(publishSwitch()).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText(/Your menu is a draft\. Nobody can see it yet\./)).toBeInTheDocument()
    // The owner reads what becomes public before turning the switch on.
    expect(screen.getByText(/your business name, logo, items, phone, address, hours and links/)).toBeInTheDocument()
  })

  it('publishes the menu with a click and announces it', async () => {
    const { user, owner } = await render()
    await user.click(publishSwitch())
    expect(await screen.findByText('Your menu is published.')).toBeInTheDocument()
    expect(publishSwitch()).toHaveAttribute('aria-checked', 'true')
    expect((await owner.getBusiness())?.published).toBe(true)
    expect(screen.getByText(/Anyone with your link, QR code or NFC card/)).toBeInTheDocument()
  })

  it('works from the keyboard and hides the menu again', async () => {
    const { user, owner } = await render({ published: true })
    expect(publishSwitch()).toHaveAttribute('aria-checked', 'true')
    publishSwitch().focus()
    await user.keyboard(' ')
    expect(await screen.findByText('Your menu is a draft again.')).toBeInTheDocument()
    expect((await owner.getBusiness())?.published).toBe(false)
  })

  it('says why it failed in words, never the raw error, and leaves the switch where it was', async () => {
    const { user } = await render({ wrapOwner: failing('setPublished') })
    await user.click(publishSwitch())
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not reach the server.')
    expect(publishSwitch()).toHaveAttribute('aria-checked', 'false')
  })

  it('says the menu is paused, not deleted, when the plan ended, and points to the account page', async () => {
    await render({ plan: 'ended', published: true })
    expect(await screen.findByText(/your menu is paused\. Nothing was deleted/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Choose a plan' })).toHaveAttribute('href', '/dashboard/account')
    expect(publishSwitch()).toHaveAttribute('aria-checked', 'true')
  })

  it('still lets the owner switch it off when the plan ended', async () => {
    const { user, owner } = await render({ plan: 'ended', published: true })
    await screen.findByText(/Nothing was deleted/)
    await user.click(publishSwitch())
    expect(await screen.findByText('Your menu is a draft again.')).toBeInTheDocument()
    expect((await owner.getBusiness())?.published).toBe(false)
    expect(screen.getByText(/stays hidden, even when published/)).toBeInTheDocument()
  })

  it('announces that a menu published after the plan ended is paused, not live', async () => {
    const { user } = await render({ plan: 'ended' })
    await screen.findByText(/Your trial or plan ended\. Your menu stays hidden/)
    await user.click(publishSwitch())
    expect(await screen.findByText('Your menu is published, but paused until you choose a plan.')).toBeInTheDocument()
    expect(screen.queryByText('Your menu is published.')).not.toBeInTheDocument()
  })

  it('shows no plan note while the plan is running', async () => {
    await render({ plan: 'active', published: true })
    expect(screen.queryByRole('link', { name: 'Choose a plan' })).not.toBeInTheDocument()
  })
})

describe('NFC guide', () => {
  it('shows the link to write and the steps for Android and iPhone', async () => {
    await render()
    const guide = screen.getByRole('heading', { name: 'Write your link to an NFC card' }).closest('section')!
    expect(within(guide).getByText(`${window.location.origin}/m/kape-kanto`)).toBeInTheDocument()
    for (const name of ['On Android', 'On iPhone']) {
      const heading = within(guide).getByRole('heading', { level: 3, name })
      const steps = heading.nextElementSibling as HTMLElement
      expect(steps.tagName).toBe('OL')
      expect(within(steps).getAllByRole('listitem')).toHaveLength(4)
    }
  })

  it('tells the owner to test the card before locking it', async () => {
    await render()
    expect(screen.getByRole('heading', { level: 3, name: 'Test the card' })).toBeInTheDocument()
    expect(screen.getByText(/Do not lock the card until it works/)).toBeInTheDocument()
  })

  it('tells the owner to write the menu link on the card', async () => {
    await render()
    expect(screen.getByText(/Write the menu link below on the card/)).toBeInTheDocument()
  })
})

describe('free cards panel', () => {
  it('says the cards wait for a plan during the trial', async () => {
    await render()
    expect(await screen.findByRole('heading', { name: '2 free NFC cards' })).toBeInTheDocument()
    expect(screen.getByText(/We send them for free when your plan starts/)).toBeInTheDocument()
  })

  it('says the cards are next once a plan runs', async () => {
    await render({ plan: 'active' })
    expect(await screen.findByText(/Your free cards are next/)).toBeInTheDocument()
  })

  it('says the cards are next, and not that the plan is on, when a paid plan has lapsed', async () => {
    await render({ plan: 'active', at: NOW + 40 * 86_400_000 })
    expect(await screen.findByText(/Your trial or plan ended/)).toBeInTheDocument()
    expect(screen.getByText(/Your free cards are next/)).toBeInTheDocument()
    expect(screen.queryByText(/Your plan is on/)).not.toBeInTheDocument()
  })

  it('links to ordering more cards', async () => {
    await render()
    expect(await screen.findByRole('link', { name: 'Order more cards' })).toHaveAttribute('href', '/?order=cards')
  })
})
