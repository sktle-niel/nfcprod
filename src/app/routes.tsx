import { Navigate, Outlet, type RouteObject } from 'react-router-dom'
import { auth } from '@/data/auth'
import { authLink, OWNER_HOME } from '@/shared/session/authLink'
import { SessionProvider } from '@/shared/session/SessionProvider'
import { NotFound } from '@/shared/ui/NotFound'
import { RouteError } from '@/shared/ui/RouteError'
import { AuthHost } from './AuthHost'
import { RequireSession } from './RequireSession'

// Each surface is lazy-loaded so the public menu bundle never carries dashboard or admin code.
export const routes: RouteObject[] = [
  {
    element: (
      <SessionProvider repository={auth}>
        <Outlet />
        <AuthHost />
      </SessionProvider>
    ),
    errorElement: <RouteError />,
    children: [
      {
        path: '/',
        lazy: async () => ({ Component: (await import('@/features/landing/LandingPage')).LandingPage }),
      },
      {
        path: '/m/:slug',
        lazy: async () => ({ Component: (await import('@/features/menu/MenuPage')).MenuPage }),
      },
      // Sign-up and log-in are a modal over the home page; these addresses just open it.
      { path: '/signup', element: <Navigate to={`/${authLink('signup', OWNER_HOME)}`} replace /> },
      { path: '/login', element: <Navigate to={`/${authLink('login', OWNER_HOME)}`} replace /> },
      {
        path: '/dashboard/*',
        lazy: async () => {
          const { DashboardPage } = await import('@/features/dashboard/DashboardPage')
          return {
            element: (
              <RequireSession>
                <DashboardPage />
              </RequireSession>
            ),
          }
        },
      },
      {
        path: '/admin',
        lazy: async () => ({ Component: (await import('@/features/admin/AdminLayout')).AdminLayout }),
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await import('@/features/admin/OverviewPage')).OverviewPage }),
          },
          {
            path: 'orders/:reference?',
            lazy: async () => ({ Component: (await import('@/features/admin/OrdersPage')).OrdersPage }),
          },
          {
            path: 'customers',
            lazy: async () => ({ Component: (await import('@/features/admin/CustomersPage')).CustomersPage }),
          },
          {
            path: 'pricing',
            lazy: async () => ({ Component: (await import('@/features/admin/PricingPage')).PricingPage }),
          },
          { path: '*', element: <NotFound /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]
