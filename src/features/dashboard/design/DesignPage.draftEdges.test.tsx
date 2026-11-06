import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { copy } from '@/config/copy'
import { dashboardCopy } from '@/config/dashboardCopy'
import { IMAGE_MAX_BYTES } from '@/entities/menu/menu'
import { sampleImageFile } from '@/test/ownerFixtures'
import { discardButton, previewDrawn, previewRegion, renderDesign, saveButton } from './designTestkit'

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

    // The page template loads on its own: wait for it, or the checks below would be true of a preview that is still blank.
    await previewDrawn('Kape Kanto')
    expect(within(previewRegion()).queryByText(copy.menu.view.template.visit.heading)).not.toBeInTheDocument()
    expect(previewRegion().querySelector('[data-fact]')).toBeNull()
    expect([...previewRegion().querySelectorAll('p')].filter((line) => line.textContent.trim() === '')).toEqual([])
  })

  it('draws the cleaned address and the hours lines the way the save will keep them', async () => {
    await renderDesign({ details: false })
    fireEvent.change(await screen.findByLabelText(text.details.address), { target: { value: '  12   Mabini   Street ' } })
    fireEvent.change(screen.getByLabelText(text.details.hours), { target: { value: '  Mon-Fri   8am-5pm  \n\n  Sat 9am-3pm ' } })

    await waitFor(() => expect(previewRegion().querySelector('[data-fact="address"]')).toHaveTextContent('12 Mabini Street'))
    expect(previewRegion().querySelector('[data-fact="hours"]')).toHaveTextContent('Mon-Fri 8am-5pm')
    expect(previewRegion().querySelector('[data-fact="hours"]')).toHaveTextContent('Sat 9am-3pm')
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
