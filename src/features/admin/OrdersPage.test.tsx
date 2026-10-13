import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderAdminPage } from '@/test/admin'
import { makeOrder, manyOrders } from '@/test/orders'
import { OrdersPage } from './OrdersPage'

// Newest first, like the repository returns them.
const records = [
  makeOrder({ reference: 'NFC-AAAAAA', fullName: 'Ana Cruz', phone: '+639171111111', createdAt: '2026-10-12T05:00:00Z', status: 'new' }),
  makeOrder({
    reference: 'NFC-BBBBBB',
    fullName: 'Ben Reyes',
    phone: '+639172222222',
    createdAt: '2026-10-05T05:00:00Z',
    status: 'confirmed',
    bundleId: 'three',
    total: 139900,
    platforms: ['facebook', 'instagram', 'google'],
    city: 'Davao City',
    province: 'Davao del Sur',
  }),
  makeOrder({ reference: 'NFC-CCCCCC', fullName: 'Cara Diaz', phone: '+639173333333', createdAt: '2026-08-01T05:00:00Z', status: 'delivered' }),
]

const options = { records, route: '/admin/orders/:reference?' }
const open = (path = '/admin/orders') => renderAdminPage(<OrdersPage />, path, options)

/** The orders in the list, by address. The query string that keeps the filters is left off. */
function listed() {
  return screen
    .queryAllByRole('link')
    .map((link) => link.getAttribute('href')?.split('?')[0])
    .filter((href) => href?.startsWith('/admin/orders/'))
}

describe('OrdersPage', () => {
  it('lists every order and shows the first one in full beside the list', () => {
    open()
    expect(listed()).toEqual(['/admin/orders/NFC-AAAAAA', '/admin/orders/NFC-BBBBBB', '/admin/orders/NFC-CCCCCC'])

    const detail = screen.getByRole('article')
    expect(within(detail).getByRole('heading', { name: 'NFC-AAAAAA' })).toBeInTheDocument()
    expect(within(detail).getByText('Ana Cruz')).toBeInTheDocument()
    expect(within(detail).getAllByRole('link', { name: /0917 111 1111|Call/ })[0]).toHaveAttribute('href', 'tel:+639171111111')
    expect(within(detail).getByText('1 Test Street, Lahug')).toBeInTheDocument()
    expect(within(detail).getByText('Near the test landmark')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ana Cruz/ })).toHaveAttribute('aria-current', 'true')
  })

  it('shows the order named in the address, even when it is not the first', () => {
    open('/admin/orders/NFC-BBBBBB')
    expect(within(screen.getByRole('article')).getByRole('heading', { name: 'NFC-BBBBBB' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ben Reyes/ })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('link', { name: /Ana Cruz/ })).not.toHaveAttribute('aria-current')
    expect(within(screen.getByRole('article')).getByText('Facebook, Instagram, Google review')).toBeInTheDocument()
  })

  it('says so when the order in the address does not exist', () => {
    open('/admin/orders/NFC-NOPE00')
    expect(screen.getByRole('alert')).toHaveTextContent('Order not found')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('counts every status and filters by one', async () => {
    const user = userEvent.setup()
    open()
    const all = screen.getByRole('button', { name: /^All/ })
    expect(all).toHaveTextContent('3')
    expect(screen.getByRole('button', { name: /^New/ })).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: /^Cancelled/ })).toHaveTextContent('0')

    await user.click(screen.getByRole('button', { name: /^Confirmed/ }))
    expect(listed()).toEqual(['/admin/orders/NFC-BBBBBB'])
    expect(screen.getByRole('button', { name: /^Confirmed/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('starts on the status named in the address', () => {
    open('/admin/orders?status=delivered')
    expect(listed()).toEqual(['/admin/orders/NFC-CCCCCC'])
    expect(screen.getByRole('button', { name: /^Delivered/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps the filters in the address, so opening an order does not lose them', async () => {
    const user = userEvent.setup()
    open()
    await user.click(screen.getByRole('button', { name: /^Confirmed/ }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Bundle' }), '3 cards')
    expect(screen.getByRole('link', { name: /Ben Reyes/ })).toHaveAttribute(
      'href',
      '/admin/orders/NFC-BBBBBB?status=confirmed&bundle=three',
    )
  })

  it('ignores a status it does not know', () => {
    open('/admin/orders?status=banana')
    expect(listed()).toHaveLength(3)
  })

  it('searches by name, mobile number or place', async () => {
    const user = userEvent.setup()
    open()
    const search = screen.getByRole('searchbox')

    await user.type(search, 'davao')
    expect(listed()).toEqual(['/admin/orders/NFC-BBBBBB'])
    await user.clear(search)
    await user.type(search, '0917 111 1111')
    expect(listed()).toEqual(['/admin/orders/NFC-AAAAAA'])
    await user.clear(search)
    await user.type(search, 'nobody')
    expect(screen.getByText('No matching orders')).toBeInTheDocument()
  })

  it('filters by bundle and by period', async () => {
    const user = userEvent.setup()
    open()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Bundle' }), '3 cards')
    expect(listed()).toEqual(['/admin/orders/NFC-BBBBBB'])
    await user.selectOptions(screen.getByRole('combobox', { name: 'Bundle' }), 'All bundles')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Period' }), 'Last 30 days')
    expect(listed()).toEqual(['/admin/orders/NFC-AAAAAA', '/admin/orders/NFC-BBBBBB'])
  })

  it('changes the status of the order and shows the new one at once', async () => {
    const user = userEvent.setup()
    const onStatus = vi.fn()
    renderAdminPage(<OrdersPage />, '/admin/orders', { ...options, onStatus })

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Confirmed')
    expect(onStatus).toHaveBeenCalledWith('NFC-AAAAAA', 'confirmed')
    expect(await within(screen.getByRole('article')).findAllByText('Confirmed')).not.toHaveLength(0)
    expect(screen.getByRole('button', { name: /^New/ })).toHaveTextContent('0')
    expect(screen.getByRole('button', { name: /^Confirmed/ })).toHaveTextContent('2')
  })

  it('tells the admin when the status could not be changed', async () => {
    const user = userEvent.setup()
    renderAdminPage(<OrdersPage />, '/admin/orders', { ...options, fail: true })

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Delivered')
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not update the status.')
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('new')
  })

  describe('with more orders than fit on a page', () => {
    const many = manyOrders(25)
    const openMany = (path = '/admin/orders') => renderAdminPage(<OrdersPage />, path, { records: many, route: '/admin/orders/:reference?' })
    const pager = () => screen.getByRole('navigation', { name: 'Pagination' })
    const refs = () => listed().map((href) => href?.replace('/admin/orders/', ''))

    it('shows ten to a page and says which ones', async () => {
      const user = userEvent.setup()
      openMany()
      expect(refs()).toHaveLength(10)
      expect(refs()[0]).toBe('NFC-000000')
      expect(pager()).toHaveTextContent('1–10 of 25')
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()

      await user.click(screen.getByRole('button', { name: 'Next page' }))
      expect(pager()).toHaveTextContent('11–20 of 25')
      expect(refs()[0]).toBe('NFC-000010')

      await user.click(screen.getByRole('button', { name: 'Next page' }))
      expect(pager()).toHaveTextContent('21–25 of 25')
      expect(refs()).toHaveLength(5)
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    })

    it('shows the first order of the page beside the list until you pick one', async () => {
      const user = userEvent.setup()
      openMany()
      expect(within(screen.getByRole('article')).getByRole('heading', { name: 'NFC-000000' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Next page' }))
      expect(within(screen.getByRole('article')).getByRole('heading', { name: 'NFC-000010' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Person 10/ })).toHaveAttribute('aria-current', 'true')
    })

    it('starts again from the first page whenever a filter changes', async () => {
      const user = userEvent.setup()
      openMany()
      await user.click(screen.getByRole('button', { name: 'Next page' }))
      await user.click(screen.getByRole('button', { name: 'Next page' }))

      expect(pager()).toHaveTextContent('21–25 of 25')

      // Everyone is "Person" something, so the search keeps all 25 but starts again at the first page.
      await user.type(screen.getByRole('searchbox'), 'person')
      expect(pager()).toHaveTextContent('1–10 of 25')

      await user.click(screen.getByRole('button', { name: 'Next page' }))
      await user.selectOptions(screen.getByRole('combobox', { name: 'Bundle' }), '1 card')
      expect(pager()).toHaveTextContent('1–10 of 25')

      await user.click(screen.getByRole('button', { name: 'Next page' }))
      await user.click(screen.getByRole('button', { name: /^Delivered/ }))
      expect(pager()).toHaveTextContent('1–10 of 25')
    })

    it('drops the pager when a search leaves one page of orders', async () => {
      const user = userEvent.setup()
      openMany()
      await user.type(screen.getByRole('searchbox'), 'person 12')
      expect(refs()).toEqual(['NFC-000012'])
      expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
    })

    it('opens on the page that holds the order named in the address', () => {
      openMany('/admin/orders/NFC-000022')
      expect(pager()).toHaveTextContent('21–25 of 25')
      expect(screen.getByRole('link', { name: /Person 22/ })).toHaveAttribute('aria-current', 'true')
    })

    it('has no pager when everything fits on one page', () => {
      open()
      expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
    })
  })

  it('shows skeletons and keeps the filters still while the orders load', () => {
    const { container } = renderAdminPage(<OrdersPage />, '/admin/orders', { ...options, loading: true })

    expect(screen.getByRole('heading', { name: 'Orders', level: 1 })).toBeInTheDocument()
    expect(container.querySelectorAll('div[aria-hidden="true"]')).toHaveLength(2)
    expect(listed()).toEqual([])
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.queryByText('No matching orders')).not.toBeInTheDocument()
    expect(screen.queryByText('Order not found')).not.toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Bundle' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'All' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'All' })).not.toHaveTextContent(/\d/)
  })

  it('has a way back to the list, with the filters', () => {
    open('/admin/orders/NFC-BBBBBB?status=confirmed')
    expect(within(screen.getByRole('article')).getByRole('link', { name: 'Orders' })).toHaveAttribute(
      'href',
      '/admin/orders?status=confirmed',
    )
  })
})
