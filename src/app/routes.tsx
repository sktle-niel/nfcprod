import type { RouteObject } from 'react-router-dom'
import { NotFound } from '@/shared/ui/NotFound'
import { RouteError } from '@/shared/ui/RouteError'

// Each surface is lazy-loaded so the public menu bundle never carries dashboard or admin code.
export const routes: RouteObject[] = [
  {
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
      {
        path: '/dashboard/*',
        lazy: async () => ({ Component: (await import('@/features/dashboard/DashboardPage')).DashboardPage }),
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
          { path: '*', element: <NotFound /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]
