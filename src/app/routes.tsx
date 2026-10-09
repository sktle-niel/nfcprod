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
        path: '/admin/*',
        lazy: async () => ({ Component: (await import('@/features/admin/AdminPage')).AdminPage }),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]
