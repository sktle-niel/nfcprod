import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'
import { NotFound } from '@/shared/ui/NotFound'

/** A dashboard page about the owner's business: it waits for the business, or sends the owner to the setup wizard. */
function businessPage(load: () => Promise<ComponentType>): NonNullable<RouteObject['lazy']> {
  return async () => {
    const [Page, { RequireBusiness }] = await Promise.all([load(), import('@/features/dashboard/RequireBusiness')])
    return {
      element: (
        <RequireBusiness>
          <Page />
        </RequireBusiness>
      ),
    }
  }
}

/**
 * What lives under /dashboard: the setup wizard and the menu preview on their own, and the shell with the five pages. Each page is lazy-loaded.
 * The parent route (routes.tsx, and the tests' harness) supplies DashboardProvider, which loads what every page reads.
 */
export const dashboardRoutes: RouteObject[] = [
  {
    path: 'setup',
    lazy: async () => ({ Component: (await import('@/features/dashboard/setup/SetupPage')).SetupPage }),
  },
  {
    // The owner's own menu as customers see it: full width, outside the shell, with a bar of its own.
    path: 'preview',
    lazy: businessPage(async () => (await import('@/features/dashboard/preview/PreviewPage')).PreviewPage),
  },
  {
    lazy: async () => ({ Component: (await import('@/features/dashboard/DashboardShell')).DashboardShell }),
    children: [
      {
        index: true,
        lazy: businessPage(async () => (await import('@/features/dashboard/overview/OverviewPage')).OverviewPage),
      },
      {
        path: 'menu',
        lazy: businessPage(async () => (await import('@/features/dashboard/menu/MenuPage')).MenuPage),
      },
      {
        path: 'design',
        lazy: businessPage(async () => (await import('@/features/dashboard/design/DesignPage')).DesignPage),
      },
      {
        path: 'share',
        lazy: businessPage(async () => (await import('@/features/dashboard/share/SharePage')).SharePage),
      },
      {
        // The plan and the profile do not need a business, so they work before the setup wizard.
        path: 'account',
        lazy: async () => ({ Component: (await import('@/features/dashboard/account/AccountPage')).AccountPage }),
      },
      { path: '*', element: <NotFound inline /> },
    ],
  },
]
