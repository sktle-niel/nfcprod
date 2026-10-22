import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { IMAGE_MAX_BYTES } from '@/entities/menu/menu'
import { sampleImageFile } from '@/test/ownerFixtures'
import { discardButton, previewRegion, renderDesign, saveButton, showPart } from './designTestkit'

const text = dashboardCopy.design
const TOO_LARGE = 'That picture is too large. Pictures can be 4 MB at most.'

const previewRoot = () => previewRegion().firstElementChild as HTMLElement
const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!
// The test picks a file the input would refuse by its `accept` list: the page must refuse it itself.
const picker = () => userEvent.setup({ applyAccept: false })
const tooLarge = () => sampleImageFile('jpeg', { size: IMAGE_MAX_BYTES + 1 })

describe('DesignPage: the preview shows what the save will keep', () => {
  it('draws no Address, Hours or tagline for text that is only spaces', async () => {
    await renderDesign({ details: false })
    fireEvent.change(await screen.findByLabelText(text.details.address), { target: { value: '   ' } })
    fireEvent.change(screen.getByLabelText(text.details.hours), { target: { value: '  \n  ' } })
    fireEvent.change(screen.getByLabelText(text.details.tagline), { target: { value: '   ' } })

    expect(previewRegion().querySelector('footer')).toBeNull()
    expect(previewRegion().querySelector('header p')).toBeNull()
  })

  it('draws the cleaned address and the hours lines the way the save will keep them', async () => {
    await renderDesign({ details: false })
    fireEvent.change(await screen.findByLabelText(text.details.address), { target: { value: '  12   Mabini   Street ' } })
    fireEvent.change(screen.getByLabelText(text.details.hours), { target: { value: '  Mon-Fri   8am-5pm  \n\n  Sat 9am-3pm ' } })

    expect(previewRegion().querySelector('footer')).toHaveTextContent('12 Mabini Street')
    expect(previewRegion().querySelector('footer')).toHaveTextContent('Mon-Fri 8am-5pm')
    expect(previewRegion().querySelector('footer')).toHaveTextContent('Sat 9am-3pm')
  })

  it('keeps the last whole color of the draft, not the saved one, while a color is half typed after a switch to Dark', async () => {
    const { user } = await renderDesign()
    await user.click(screen.getByRole('tab', { name: 'Look' }))
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    const dark = { bg: previewRoot().style.getPropertyValue('--menu-bg'), text: previewRoot().style.getPropertyValue('--menu-text') }
    expect(dark.text).not.toBe('#2b1d14')

    await user.clear(screen.getByLabelText('Text color'))
    await user.type(screen.getByLabelText('Text color'), '#f')

    // The saved ink on the new dark page would be dark on dark for every keystroke.
    expect(previewRoot().style.getPropertyValue('--menu-text')).toBe(dark.text)
    expect(previewRoot().style.getPropertyValue('--menu-bg')).toBe(dark.bg)
  })

  it('keeps the last whole page color while the page color is half typed after a reset', async () => {
    const { user } = await renderDesign()
    await user.click(screen.getByRole('tab', { name: 'Look' }))
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    const dark = previewRoot().style.getPropertyValue('--menu-bg')
    await user.clear(screen.getByLabelText('Background color'))
    expect(previewRoot().style.getPropertyValue('--menu-bg')).toBe(dark)
  })

  it('goes back to the saved colors when the changes are discarded', async () => {
    const { user } = await renderDesign()
    await user.click(screen.getByRole('tab', { name: 'Look' }))
    await user.click(screen.getByRole('button', { name: 'Dark' }))
    await user.clear(screen.getByLabelText('Text color'))
    await user.click(discardButton())
    expect(previewRoot().style.getPropertyValue('--menu-text')).toBe('#2b1d14')
    await user.clear(screen.getByLabelText('Text color'))
    expect(previewRoot().style.getPropertyValue('--menu-text')).toBe('#2b1d14')
  })
})

describe('DesignPage: the words about a refused logo do not outlive it', () => {
  it('goes away when the changes are discarded', async () => {
    await renderDesign()
    await picker().upload(fileInput(), tooLarge())
    expect(await screen.findByText(TOO_LARGE)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(text.details.tagline), { target: { value: 'Open late' } })
    expect(screen.getByText(TOO_LARGE)).toBeInTheDocument()
    await userEvent.setup().click(discardButton())

    expect(screen.queryByText(TOO_LARGE)).not.toBeInTheDocument()
  })

  it('goes away when the changes are saved', async () => {
    await renderDesign()
    await picker().upload(fileInput(), tooLarge())
    expect(await screen.findByText(TOO_LARGE)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(text.details.tagline), { target: { value: 'Open late' } })
    await userEvent.setup().click(saveButton())
    await screen.findByText(text.bar.status.saved)

    expect(screen.queryByText(TOO_LARGE)).not.toBeInTheDocument()
  })
})

describe('DesignPage: Reset the look while a save runs', () => {
  it('does not say the look was reset when the save blocked the change, and resets it after the save', async () => {
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const { user } = await renderDesign({
      wrapOwner: (real) => ({ ...real, saveBusiness: async (patch) => (await gate, real.saveBusiness(patch)) }),
    })
    await user.click(screen.getByRole('tab', { name: 'Look' }))
    await showPart(user, 'Extras')
    await user.click(screen.getByRole('radio', { name: 'Square' }))
    await user.click(saveButton())
    await screen.findByText(text.bar.status.saving)

    await user.click(screen.getByRole('button', { name: text.look.reset }))

    expect(screen.queryByText(text.look.resetNote)).not.toBeInTheDocument()
    expect(screen.queryByText(text.look.resetNoteSame)).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Square' })).toBeChecked()

    release()
    await screen.findByText(text.bar.status.saved)
    await user.click(screen.getByRole('button', { name: text.look.reset }))
    await waitFor(() => expect(screen.getByText(text.look.resetNote)).toBeInTheDocument())
  })
})
