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

  it('renders the public menu of a business at its link', async () => {
    renderAt('/m/cafe-luna')
    expect(await screen.findByRole('heading', { level: 1, name: 'Cafe Luna' }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('says a link with no menu is not available, in the page of the menu and not the 404', async () => {
    renderAt('/m/nobody-here')
    expect(await screen.findByRole('heading', { level: 1, name: 'This menu is not available' }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /page not found/i })).not.toBeInTheDocument()
  })

  it('keeps the owner preview behind the account, like the other business pages', async () => {
    renderAt('/dashboard/preview')
    expect(await screen.findByRole('dialog', { name: 'Create your account' }, { timeout: 5000 })).toBeInTheDocument()
  })

  it('has the owner preview next to the setup wizard, outside the shell, behind the business guard', () => {
    const dashboard = routes[0]?.children?.find((route) => route.path === '/dashboard')
    const paths = dashboard?.children?.map((route) => route.path)
    expect(paths).toEqual(expect.arrayContaining(['setup', 'preview']))
    // A sibling of the setup route: the shell's pages are the children of the route that has no path.
    expect(dashboard?.children?.find((route) => route.path === 'preview')?.children).toBeUndefined()
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
