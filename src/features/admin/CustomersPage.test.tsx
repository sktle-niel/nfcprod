import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderAdminPage } from '@/test/admin'
import { makeOrder, manyOrders } from '@/test/orders'
import { CustomersPage } from './CustomersPage'

const records = [
  makeOrder({ reference: 'NFC-AAAAAA', fullName: 'Ana Cruz', phone: '+639171111111', total: 78000, createdAt: '2026-10-12T05:00:00Z', city: 'Cebu City', province: 'Cebu' }),
  makeOrder({ reference: 'NFC-BBBBBB', fullName: 'Ben Reyes', phone: '+639172222222', total: 139900, createdAt: '2026-10-05T05:00:00Z', city: 'Davao City', province: 'Davao del Sur' }),
  makeOrder({ reference: 'NFC-CCCCCC', fullName: 'Ana Cruz', phone: '+639171111111', total: 58000, createdAt: '2026-09-20T05:00:00Z', city: 'Cebu City', province: 'Cebu' }),
  makeOrder({ reference: 'NFC-DDDDDD', fullName: 'Dan Lim', phone: '+639174444444', status: 'cancelled', createdAt: '2026-09-01T05:00:00Z' }),
]

function names() {
  return screen.getAllByRole('rowheader').map((cell) => cell.textContent)
}

describe('CustomersPage', () => {
  it('lists each person once, newest buyer first, with what they ordered', () => {
    renderAdminPage(<CustomersPage />, '/admin/customers', { records })

    expect(names()).toEqual(['Ana Cruz', 'Ben Reyes'])
    const ana = screen.getByRole('row', { name: /Ana Cruz/ })
    expect(within(ana).getByRole('link', { name: '0917 111 1111' })).toHaveAttribute('href', 'tel:+639171111111')
    expect(ana).toHaveTextContent('Cebu City, Cebu')
    expect(ana).toHaveTextContent('2 orders')
    expect(ana).toHaveTextContent('₱1,360')
    expect(ana).toHaveTextContent('Oct 12')
    expect(screen.getByRole('row', { name: /Ben Reyes/ })).toHaveTextContent('1 order')
  })

  it('leaves out a person whose only order was cancelled', () => {
    renderAdminPage(<CustomersPage />, '/admin/customers', { records })
    expect(screen.queryByText('Dan Lim')).not.toBeInTheDocument()
  })

  it('shows ten to a page, newest first, and moves through them', async () => {
    const user = userEvent.setup()
    renderAdminPage(<CustomersPage />, '/admin/customers', { records: manyOrders(25) })
    const pager = () => screen.getByRole('navigation', { name: 'Pagination' })

    expect(names()).toHaveLength(10)
    expect(names()[0]).toBe('Person 0')
    expect(pager()).toHaveTextContent('1–10 of 25')

    await user.click(screen.getByRole('button', { name: 'Page 3' }))
    expect(names()).toEqual(['Person 20', 'Person 21', 'Person 22', 'Person 23', 'Person 24'])
    expect(pager()).toHaveTextContent('21–25 of 25')
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page')
  })

  it('goes back to the first page when the search changes', async () => {
    const user = userEvent.setup()
    renderAdminPage(<CustomersPage />, '/admin/customers', { records: manyOrders(25) })
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(names()[0]).toBe('Person 10')

    // Everyone is "Person" something, so the search keeps all 25 but starts again at the first page.
    await user.type(screen.getByRole('searchbox'), 'person')
    expect(names()[0]).toBe('Person 0')
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent('1–10 of 25')

    await user.type(screen.getByRole('searchbox'), ' 12')
    expect(names()).toEqual(['Person 12'])
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
  })

  it('has no pager when everything fits on one page', () => {
    renderAdminPage(<CustomersPage />, '/admin/customers', { records })
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
  })

  it('shows skeletons while the orders load', () => {
    const { container } = renderAdminPage(<CustomersPage />, '/admin/customers', { records, loading: true })
    expect(screen.getByRole('heading', { name: 'Customers', level: 1 })).toBeInTheDocument()
    expect(container.querySelectorAll('div[aria-hidden="true"]')).toHaveLength(1)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText('No matching customers')).not.toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeDisabled()
  })

  it('searches by name, mobile number or place', async () => {
    const user = userEvent.setup()
    renderAdminPage(<CustomersPage />, '/admin/customers', { records })
    const search = screen.getByRole('searchbox')

    await user.type(search, 'davao')
    expect(names()).toEqual(['Ben Reyes'])
    await user.clear(search)
    await user.type(search, '09171111111')
    expect(names()).toEqual(['Ana Cruz'])
    await user.clear(search)
    await user.type(search, 'nobody')
    expect(screen.getByText('No matching customers')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
