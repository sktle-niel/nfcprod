import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { routes } from './routes'

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
}

describe('routes', () => {
  it('renders the landing page', async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { name: /one tap away/i }, { timeout: 5000 })).toBeInTheDocument()
  })

  it('renders a menu for a valid slug', async () => {
    renderAt('/m/cafe-luna')
    expect(await screen.findByRole('heading', { name: 'cafe-luna' })).toBeInTheDocument()
  })

  it.each([
    ['/admin', 'Overview'],
    ['/admin/orders', 'Orders'],
    ['/admin/orders/NFC-7K2M9Q', 'Orders'],
    ['/admin/customers', 'Customers'],
    ['/admin/pricing', 'Pricing'],
  ])('renders the admin page at %s', async (path, title) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument()
  })

  it('keeps the admin sidebar around a page that does not exist', async () => {
    renderAt('/admin/nope')
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Admin' })).toBeInTheDocument()
  })

  it.each([
    ['/signup', 'Create your account'],
    ['/login', 'Welcome back'],
  ])('opens the account modal at %s', async (path, title) => {
    renderAt(path)
    expect(await screen.findByRole('dialog', { name: title }, { timeout: 5000 })).toBeInTheDocument()
  })

  it('gives a visitor without an account the sign-up modal instead of the dashboard', async () => {
    renderAt('/dashboard')
    expect(await screen.findByRole('dialog', { name: 'Create your account' }, { timeout: 5000 })).toBeInTheDocument()
  })

  it.each(['/m/Admin%20Panel', '/m/..%2Fsecret', '/m/ab', '/nope'])('shows not found for %s', async (path) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument()
  })
})
