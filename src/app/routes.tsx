import { Navigate, Outlet, type RouteObject } from 'react-router-dom'
import { auth } from '@/data/auth'
import { authLink, OWNER_HOME } from '@/shared/session/authLink'
import { SessionProvider } from '@/shared/session/SessionProvider'
import { NotFound } from '@/shared/ui/NotFound'
import { RouteError } from '@/shared/ui/RouteError'
import { AuthHost } from './AuthHost'
import { dashboardRoutes } from './dashboardRoutes'
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
        // The owner's area: one provider loads the business, menu and plan for the setup wizard and for the shell.
        path: '/dashboard',
        lazy: async () => {
          const { DashboardProvider } = await import('@/features/dashboard/DashboardProvider')
          return {
            element: (
              <RequireSession>
                <DashboardProvider />
              </RequireSession>
            ),
          }
        },
        children: dashboardRoutes,
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
          { path: '*', element: <NotFound inline /> },
        ],
      },
      // For developers: every menu style on a sample menu, and the Design page's Look tab with no sign-in. They exist in
      // development builds only.
      ...(import.meta.env.DEV
        ? [
            { path: '/__styles', lazy: async () => ({ Component: (await import('@/features/dev/StylesPage')).StylesPage }) },
            { path: '/__look', lazy: async () => ({ Component: (await import('@/features/dev/LookTabPage')).LookTabPage }) },
          ]
        : []),
      { path: '*', element: <NotFound /> },
    ],
  },
]
