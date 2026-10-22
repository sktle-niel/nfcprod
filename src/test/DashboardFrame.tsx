import type { createMemoryRouter } from 'react-router-dom'
import { RouterProvider, useLocation } from 'react-router-dom'
import type { AuthRepository } from '@/data/auth'
import { SessionProvider } from '@/shared/session/SessionProvider'

/** A route that stands for "somewhere else", so a test can assert where a page sent the owner. */
export function WentTo() {
  return <p>Went to {useLocation().pathname}</p>
}

/** The session around a router, as the app has it. */
export function DashboardFrame({ auth, router }: { auth: AuthRepository; router: ReturnType<typeof createMemoryRouter> }) {
  return (
    <SessionProvider repository={auth}>
      <RouterProvider router={router} />
    </SessionProvider>
  )
}
