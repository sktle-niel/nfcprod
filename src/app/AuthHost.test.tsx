import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom'
import { beforeAll, describe, expect, it } from 'vitest'
import { createMockAuth, type AuthRepository } from '@/data/auth'
import { SessionProvider } from '@/shared/session/SessionProvider'
import { TEST_PASSWORD, testOwner, WRONG_PASSWORD } from '@/test/auth'
import { AuthHost } from './AuthHost'

function setup(path: string, repository: AuthRepository = createMockAuth({ delay: 0 })) {
  const router = createMemoryRouter(
    [
      {
        element: (
          <>
            <Outlet />
            <AuthHost />
          </>
        ),
        children: [
          { path: '/', element: <p>Home</p> },
          { path: '/dashboard/*', element: <p>Owner area</p> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(
    <SessionProvider repository={repository}>
      <RouterProvider router={router} />
    </SessionProvider>,
  )
  return { user: userEvent.setup(), router }
}

async function signedOutRepository() {
  const repository = createMockAuth({ delay: 0 })
  await repository.signUp(testOwner)
  await repository.logOut()
  return repository
}

describe('AuthHost', () => {
  // The modal is lazy-loaded; load it once up front so the first test does not wait on the import.
  beforeAll(async () => {
    await import('@/features/auth/AuthDialog')
  })

  it('opens the sign-up modal from the address, with Google and email', async () => {
    setup('/?auth=signup')
    // First render still waits on the lazy boundary; give it room when the full suite loads the machine.
    expect(await screen.findByRole('dialog', { name: 'Create your account' }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
  })

  it('stays closed without the address asking for it', () => {
    setup('/')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows what is missing and creates nothing', async () => {
    const { user } = setup('/?auth=signup')
    await user.click(await screen.findByRole('button', { name: 'Create account' }))
    expect(screen.getByText('Please fix the highlighted fields.')).toBeInTheDocument()
    expect(screen.getByLabelText('Full name')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Full name')).toHaveFocus()
  })

  it('creates the account and goes on to the owner area', async () => {
    const { user, router } = setup('/?auth=signup&next=%2Fdashboard')
    await user.type(await screen.findByLabelText('Full name'), 'Juan Dela Cruz')
    await user.type(screen.getByLabelText('Email'), 'Juan@Cafe.ph')
    await user.type(screen.getByLabelText('Password'), TEST_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Owner area')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('says when the email already has an account', async () => {
    const { user } = setup('/?auth=signup', await signedOutRepository())
    await user.type(await screen.findByLabelText('Full name'), testOwner.name)
    await user.type(screen.getByLabelText('Email'), testOwner.email)
    await user.type(screen.getByLabelText('Password'), TEST_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText(/already exists/)).toBeInTheDocument()
  })

  it('signs up with Google and never follows a next link out of the owner area', async () => {
    const { user, router } = setup('/?auth=signup&next=https%3A%2F%2Fevil.example')
    await user.click(await screen.findByRole('button', { name: 'Continue with Google' }))
    expect(await screen.findByText('Owner area')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard')
  })

  it('shows and hides the password', async () => {
    const { user } = setup('/?auth=signup')
    const toggle = await screen.findByRole('button', { name: 'Show password' })
    await user.click(toggle)
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })

  it('switches to log-in in the same modal and logs in to the page the owner wanted', async () => {
    const { user, router } = setup('/?auth=signup&next=%2Fdashboard%2Fmenu', await signedOutRepository())
    await user.click(await screen.findByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('dialog', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
    await user.type(screen.getByLabelText('Email'), 'JUAN@cafe.ph')
    await user.type(screen.getByLabelText('Password'), TEST_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('Owner area')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard/menu')
  })

  it('gives one message for a wrong password', async () => {
    const { user } = setup('/?auth=login', await signedOutRepository())
    await user.type(await screen.findByLabelText('Email'), testOwner.email)
    await user.type(screen.getByLabelText('Password'), WRONG_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('Wrong email or password.')).toBeInTheDocument()
  })

  it('closes and clears the address', async () => {
    const { user, router } = setup('/?auth=login&next=%2Fdashboard')
    await user.click(await screen.findByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(router.state.location.search).toBe('')
  })
})
