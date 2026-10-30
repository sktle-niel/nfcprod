import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { renderDesign, saveButton } from './designTestkit'

const leave = dashboardCopy.design.leave

/** Sends the event a browser sends before a reload or a closed tab, and says whether the page asked to stay. */
function unloadIsHeld() {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

describe('DesignPage: leaving the page', () => {
  it('lets the owner leave a page with no changes, without a question', async () => {
    const { router } = await renderDesign()
    await router.navigate('/dashboard/menu')
    expect(router.state.location.pathname).toBe('/dashboard/menu')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('asks before the owner leaves with unsaved changes, and keeps the draft when they keep editing', async () => {
    const { user, router } = await renderDesign()
    await user.type(screen.getByLabelText('Business name'), ' 2')
    void router.navigate('/dashboard/menu')
    const question = within(await screen.findByRole('dialog', { name: leave.title }))
    expect(question.getByText(leave.body)).toBeInTheDocument()

    await user.click(question.getByRole('button', { name: leave.stay }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(router.state.location.pathname).toBe('/dashboard/design')
    expect(screen.getByLabelText('Business name')).toHaveValue('Kape Kanto 2')
  })

  it('lets the owner leave and lose the changes when they confirm', async () => {
    const { user, router } = await renderDesign()
    await user.type(screen.getByLabelText('Business name'), ' 2')
    void router.navigate('/dashboard/menu')
    const question = within(await screen.findByRole('dialog', { name: leave.title }))

    await user.click(question.getByRole('button', { name: leave.confirm }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/menu'))
    expect(await screen.findByText('Went to /dashboard/menu')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not hold the owner back once the changes are saved', async () => {
    const { user, router } = await renderDesign()
    await user.type(screen.getByLabelText('Business name'), ' 2')
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')

    await router.navigate('/dashboard/menu')

    expect(router.state.location.pathname).toBe('/dashboard/menu')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not ask while a save is being sent, because the changes are on their way', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const { user, router, owner } = await renderDesign({
      wrapOwner: (real) => ({
        ...real,
        saveBusiness: async (patch) => {
          await gate
          return real.saveBusiness(patch)
        },
      }),
    })
    await user.type(screen.getByLabelText('Business name'), ' 2')
    await user.click(saveButton())

    await router.navigate('/dashboard/menu')

    expect(router.state.location.pathname).toBe('/dashboard/menu')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    release()
    await waitFor(async () => expect((await owner.getBusiness())?.name).toBe('Kape Kanto 2'))
  })

  it('asks the browser to confirm a reload or a closed tab only while there are unsaved changes', async () => {
    const { user } = await renderDesign()
    expect(unloadIsHeld()).toBe(false)

    await user.type(screen.getByLabelText('Business name'), ' 2')
    expect(unloadIsHeld()).toBe(true)
  })
})
