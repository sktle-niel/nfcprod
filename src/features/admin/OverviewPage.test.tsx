import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderAdminPage } from '@/test/admin'
import { makeOrder } from '@/test/orders'
import { OverviewPage } from './OverviewPage'

// "Now" is 13 Oct 2026. The last 30 days start on 13 Sep, the 30 days before that on 14 Aug.
// Newest first, like the repository returns them.
const records = [
  makeOrder({ reference: 'NFC-AAAAAA', fullName: 'Ana Cruz', createdAt: '2026-10-12T05:00:00Z', status: 'delivered', province: 'Cebu' }),
  makeOrder({ reference: 'NFC-EEEEEE', fullName: 'Eli Tan', createdAt: '2026-10-10T05:00:00Z', status: 'cancelled' }),
  makeOrder({
    reference: 'NFC-BBBBBB',
    fullName: 'Ben Reyes',
    createdAt: '2026-10-05T05:00:00Z',
    status: 'new',
    bundleId: 'three',
    total: 139900,
    platforms: ['facebook', 'instagram', 'google'],
    province: 'Cebu',
  }),
  makeOrder({
    reference: 'NFC-CCCCCC',
    fullName: 'Cara Diaz',
    createdAt: '2026-09-20T05:00:00Z',
    status: 'delivered',
    bundleId: 'two',
    total: 78000,
    platforms: ['instagram', 'google'],
    province: 'Bohol',
  }),
  makeOrder({ reference: 'NFC-DDDDDD', fullName: 'Dan Lim', createdAt: '2026-09-01T05:00:00Z', status: 'delivered' }),
]

/** The big number of a tile is the only paragraph in it that is not a change. */
function tile(name: string) {
  const section = screen.getByRole('heading', { name, level: 3 }).closest('section')
  if (!section) throw new Error(`no tile called ${name}`)
  return within(section)
}

describe('OverviewPage', () => {
  it('shows the last 30 days against the 30 days before, and leaves cancelled orders out', () => {
    renderAdminPage(<OverviewPage />, '/admin', { records })

    expect(tile('Orders').getByText('3', { selector: 'p' })).toBeInTheDocument()
    expect(tile('Orders').getByText('+200%')).toBeInTheDocument()
    expect(tile('Revenue').getByText('₱2,759', { selector: 'p' })).toBeInTheDocument()
    expect(tile('Revenue').getByText('+375.7%')).toBeInTheDocument()
    expect(tile('Average order').getByText('₱919.67')).toBeInTheDocument()
    expect(tile('Average order').getByText('+58.6%')).toBeInTheDocument()
    expect(tile('Cards sold').getByText('6', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getAllByText('vs previous 30 days')).toHaveLength(4)
  })

  it('breaks the numbers down by bundle and by platform', () => {
    renderAdminPage(<OverviewPage />, '/admin', { records })
    const bundles = tile('Average order')
    expect(bundles.getByText('1 card').nextElementSibling).toHaveTextContent('1')
    expect(bundles.getByText('2 cards').nextElementSibling).toHaveTextContent('1')
    expect(bundles.getByText('3 cards').nextElementSibling).toHaveTextContent('1')
    const platforms = tile('Cards sold')
    expect(platforms.getByText('Google review').nextElementSibling).toHaveTextContent('3')
    expect(platforms.getByText('Facebook').nextElementSibling).toHaveTextContent('1')
  })

  it('gives every plot a table of its numbers for screen readers', () => {
    renderAdminPage(<OverviewPage />, '/admin', { records })
    expect(screen.getByRole('table', { name: 'Orders' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Revenue' })).toBeInTheDocument()
  })

  it('switches the period for every number at once', async () => {
    const user = userEvent.setup()
    renderAdminPage(<OverviewPage />, '/admin', { records })

    await user.click(screen.getByRole('button', { name: 'Last 7 days' }))
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('aria-pressed', 'true')
    expect(tile('Orders').getByText('1', { selector: 'p' })).toBeInTheDocument()
    expect(tile('Revenue').getByText('₱580', { selector: 'p' })).toBeInTheDocument()
    expect(tile('Orders').getByText('0%')).toBeInTheDocument()
    expect(screen.getAllByText('vs previous 7 days')).toHaveLength(4)
    expect(screen.queryByText('Cara Diaz')).not.toBeInTheDocument()
  })

  it('links to the orders that wait for a call', () => {
    renderAdminPage(<OverviewPage />, '/admin', { records })
    const link = screen.getByRole('link', { name: /To confirm/ })
    expect(link).toHaveAttribute('href', '/admin/orders?status=new')
    expect(link).toHaveTextContent('1')
  })

  it('hides that link when nothing waits', () => {
    renderAdminPage(<OverviewPage />, '/admin', { records: records.map((order) => ({ ...order, status: 'delivered' })) })
    expect(screen.queryByRole('link', { name: /To confirm/ })).not.toBeInTheDocument()
  })

  it('lists the newest orders, each opening its order', () => {
    renderAdminPage(<OverviewPage />, '/admin', { records })
    const recent = screen.getByRole('heading', { name: 'Recent orders' }).closest('section')
    if (!recent) throw new Error('no recent orders panel')
    expect(within(recent).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/admin/orders',
      '/admin/orders/NFC-AAAAAA',
      '/admin/orders/NFC-EEEEEE',
      '/admin/orders/NFC-BBBBBB',
      '/admin/orders/NFC-CCCCCC',
    ])
  })

  it('names the provinces with the most orders', () => {
    renderAdminPage(<OverviewPage />, '/admin', { records })
    const provinces = screen.getByRole('heading', { name: 'Top provinces' }).closest('section')
    if (!provinces) throw new Error('no provinces panel')
    expect(within(provinces).getByText('Cebu').nextElementSibling).toHaveTextContent('2')
    expect(within(provinces).getByText('Bohol').nextElementSibling).toHaveTextContent('1')
  })

  it('says so when the period has no orders', () => {
    renderAdminPage(<OverviewPage />, '/admin', { records: [] })
    expect(screen.getAllByText('No orders in this period')).toHaveLength(2)
  })

  it('shows skeletons while the orders load, with the names of the numbers already in place', () => {
    const { container } = renderAdminPage(<OverviewPage />, '/admin', { records, loading: true })

    for (const name of ['Orders', 'Revenue', 'Average order', 'Cards sold']) {
      expect(screen.getByRole('heading', { name, level: 3 })).toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { name: 'Recent orders' })).toBeInTheDocument()
    // Four tiles and two panels, each with its own skeleton, all hidden from screen readers.
    expect(container.querySelectorAll('div[aria-hidden="true"]')).toHaveLength(6)
    expect(screen.queryByText('₱2,759')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText('No orders in this period')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /To confirm/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toBeDisabled()
  })
})
