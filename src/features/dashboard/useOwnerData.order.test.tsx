import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { fill } from '@/shared/lib/fill'
import type { OwnerRepository } from '@/data/ownerRepository'
import { renderDashboardApp, type DashboardOptions } from '@/test/dashboard'

/*
 * The replies of the owner's calls can land in any order. Each is the whole menu or the whole business, so the shared state
 * must keep the reply to the newest call of each part, and keep both parts when two replies land together
 * (useOwnerData `settle`, useResource `replace` with a function). Copies of the scenarios in DashboardEdges.test.tsx.
 */

const { shell, overview, items, design, share } = dashboardCopy

/** A method whose work is done at once and whose answer is `ms` late. */
function lateAnswer<Args extends unknown[], Result>(ms: number, work: (...args: Args) => Promise<Result>) {
  return async (...args: Args): Promise<Result> => {
    const result = await work(...args)
    await new Promise((resolve) => setTimeout(resolve, ms))
    return result
  }
}

async function open(path: string, options: DashboardOptions = {}) {
  const harness = await renderDashboardApp(path, options)
  await screen.findByRole('heading', { level: 1 })
  return harness
}

async function visit(user: UserEvent, label: string, title: string) {
  await user.click(within(screen.getByRole('navigation', { name: shell.menu })).getByRole('link', { name: label }))
  await screen.findByRole('heading', { level: 1, name: title })
}

const soldOutSwitch = (name: string) => screen.getByRole('switch', { name: `${items.product.available}: ${name}` })

async function savedAvailable(owner: OwnerRepository, name: string) {
  return (await owner.getMenu()).products.find((product) => product.name === name)?.available
}

describe('the shared owner data when replies land out of order', () => {
  it('shows the same sold-out switches as the saved menu when two replies arrive in the other order', async () => {
    let call = 0
    const { user, owner } = await open('/dashboard/menu', {
      wrapOwner: (real) => ({
        ...real,
        setAvailable: (id: string, on: boolean) => {
          call += 1
          // The first answer is slow, the second is not: the server did the first change first, and the second answer holds both.
          return call === 1 ? lateAnswer(300, (...args: [string, boolean]) => real.setAvailable(...args))(id, on) : real.setAvailable(id, on)
        },
      }),
    })

    await user.click(await screen.findByRole('switch', { name: `${items.product.available}: Cold Brew` }))
    await user.click(soldOutSwitch('Americano'))
    await screen.findByText(fill(items.product.nowSoldOut, { name: 'Cold Brew' }))
    await waitFor(() => expect(soldOutSwitch('Cold Brew')).not.toHaveAttribute('aria-busy'))

    expect(await savedAvailable(owner, 'Cold Brew')).toBe(false)
    expect(await savedAvailable(owner, 'Americano')).toBe(false)
    expect(soldOutSwitch('Cold Brew')).toHaveAttribute('aria-checked', 'false')
    expect(soldOutSwitch('Americano')).toHaveAttribute('aria-checked', 'false')
  })

  it('keeps the shared state whole when the business reply and the menu reply land in the same moment', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const { user, owner } = await open('/dashboard/design', {
      wrapOwner: (real) => ({
        ...real,
        saveBusiness: async (patch) => {
          const business = await real.saveBusiness(patch)
          await gate
          return business
        },
        setAvailable: async (id, on) => {
          const menu = await real.setAvailable(id, on)
          await gate
          return menu
        },
      }),
    })
    const name = await screen.findByLabelText(design.details.name)
    await user.clear(name)
    await user.type(name, 'Moon Cafe')
    await user.click(screen.getByRole('button', { name: design.bar.save }))
    await visit(user, shell.nav.menu, shell.menuPage.title)
    await user.click(await screen.findByRole('switch', { name: `${items.product.available}: Cold Brew` }))

    release()

    await screen.findByText(fill(items.product.nowSoldOut, { name: 'Cold Brew' }))
    await visit(user, shell.nav.overview, overview.title)
    expect((await owner.getBusiness())?.name).toBe('Moon Cafe')
    await waitFor(() => expect(screen.getByRole('main')).toHaveTextContent('Moon Cafe'))
    await visit(user, shell.nav.menu, shell.menuPage.title)
    expect(soldOutSwitch('Cold Brew')).toHaveAttribute('aria-checked', 'false')
  })

  it('keeps a slow menu reply when a newer business reply landed first', async () => {
    // One counter for both parts would drop this menu reply as older than the publish reply.
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let landed = false
    const { user, owner } = await open('/dashboard/menu', {
      wrapOwner: (real) => ({
        ...real,
        setAvailable: async (id, on) => {
          const menu = await real.setAvailable(id, on)
          await gate
          landed = true
          return menu
        },
      }),
    })

    await user.click(await screen.findByRole('switch', { name: `${items.product.available}: Cold Brew` }))
    await visit(user, shell.nav.share, share.title)
    await user.click(screen.getByRole('switch', { name: share.publish.label }))
    await screen.findByText(share.publish.nowPublished)
    expect(await savedAvailable(owner, 'Cold Brew')).toBe(false)
    // The menu reply was sent first and lands now, after the publish reply.
    release()
    await waitFor(() => expect(landed).toBe(true))

    await visit(user, shell.nav.menu, shell.menuPage.title)
    expect(soldOutSwitch('Cold Brew')).toHaveAttribute('aria-checked', 'false')
    expect((await owner.getBusiness())?.published).toBe(true)
  })
})
