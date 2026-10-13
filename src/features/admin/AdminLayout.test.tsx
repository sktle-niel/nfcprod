import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { AdminOrderList, AdminOrderRepository } from '@/data/adminOrders'
import { makeOrder } from '@/test/orders'
import { AdminLayout } from './AdminLayout'
import { useAdminData } from './adminData'

function repo(list: AdminOrderList): AdminOrderRepository {
  return { list: vi.fn().mockResolvedValue(list), setStatus: vi.fn() }
}

/** Says what the layout hands to a page. */
function Probe() {
  const { loading, records } = useAdminData()
  return <p>{loading ? 'probe: loading' : `probe: ${records.length} orders`}</p>
}

function renderLayout(repository: AdminOrderRepository, path = '/admin') {
  const router = createMemoryRouter(
    [
      {
        path: '/admin',
        element: <AdminLayout repository={repository} />,
        children: [
          { index: true, element: <Probe /> },
          { path: 'orders', element: <p>Orders content</p> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
}

const loaded = { records: [makeOrder(), makeOrder({ reference: 'NFC-BBBBBB' })], demo: true, asOf: '2026-10-13T12:00:00Z' }

describe('AdminLayout', () => {
  it('shows the links and the page at once, and tells the page to show skeletons until the orders arrive', async () => {
    renderLayout(repo(loaded))
    const nav = screen.getByRole('navigation', { name: 'Admin' })
    expect(nav).toHaveTextContent('Overview')
    expect(nav).toHaveTextContent('Orders')
    expect(nav).toHaveTextContent('Customers')
    expect(screen.getByText('probe: loading')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading')

    expect(await screen.findByText('probe: 2 orders')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('marks the page you are on', async () => {
    renderLayout(repo(loaded), '/admin/orders')
    await screen.findByText('Orders content')
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current')
  })

  it('says when the numbers are sample data, and only when they are', async () => {
    renderLayout(repo(loaded))
    expect(screen.queryByText('Sample data')).not.toBeInTheDocument()
    expect(await screen.findByText('Sample data')).toBeInTheDocument()
  })

  it('does not say it for real data', async () => {
    renderLayout(repo({ ...loaded, demo: false }))
    await screen.findByText('probe: 2 orders')
    expect(screen.queryByText('Sample data')).not.toBeInTheDocument()
  })

  it('offers a retry when loading fails, and shows skeletons again while it tries', async () => {
    const user = userEvent.setup()
    const list = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(loaded)
    renderLayout({ list, setStatus: vi.fn() })

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load orders.')
    expect(screen.queryByText(/probe:/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('probe: 2 orders')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('has a way to skip the navigation', () => {
    renderLayout(repo(loaded))
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#admin-main')
  })
})
