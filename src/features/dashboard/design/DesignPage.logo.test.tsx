import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { OwnerError } from '@/data/ownerRepository'
import { IMAGE_MAX_BYTES } from '@/entities/menu/menu'
import { sampleImageFile } from '@/test/ownerFixtures'
import { discardButton, previewRegion, renderDesign, saveButton, seedBusiness, spyOnSave } from './designTestkit'

// The test picks files the file input would refuse by its `accept` list: the page must refuse them itself.
const picker = () => userEvent.setup({ applyAccept: false })

function fileInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('no file input')
  return input
}

const notAPicture = () => new File(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], 'logo.png', { type: 'image/png' })

describe('DesignPage: the logo', () => {
  it.each(['png', 'jpeg', 'webp'] as const)('takes a valid %s, shows it in the form and in the preview, and saves it', async (kind) => {
    const spy = spyOnSave()
    const { owner } = await renderDesign({ wrapOwner: spy.wrap })
    const user = picker()
    await user.upload(fileInput(), sampleImageFile(kind))

    const logo = await screen.findByRole('img', { name: 'Your logo' })
    expect(logo).toHaveAttribute('src', expect.stringMatching(new RegExp(`^data:image/${kind};base64,`)))
    expect(previewRegion().querySelector('header img')).toHaveAttribute('src', logo.getAttribute('src'))
    expect(saveButton()).toBeEnabled()
    expect(await owner.getBusiness().then((b) => b?.logo)).toBeNull()

    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect(Object.keys(spy.patches[0] ?? {})).toEqual(['logo'])
    expect((await owner.getBusiness())?.logo).toBe(logo.getAttribute('src'))
    expect(screen.getByRole('button', { name: 'Replace logo' })).toBeInTheDocument()
  })

  it('refuses a file that only has a picture name, by its first bytes, and shows words next to the picker', async () => {
    await renderDesign()
    await picker().upload(fileInput(), notAPicture())
    expect(await screen.findByText('That file is not a picture we can use. Use a JPEG, PNG or WebP picture.')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Your logo' })).not.toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it('refuses a plain text file', async () => {
    await renderDesign()
    await picker().upload(fileInput(), new File(['hello'], 'notes.txt', { type: 'text/plain' }))
    expect(await screen.findByText(/not a picture we can use/)).toBeInTheDocument()
  })

  it('refuses a picture over 4 MB', async () => {
    await renderDesign()
    await picker().upload(fileInput(), sampleImageFile('jpeg', { size: IMAGE_MAX_BYTES + 1 }))
    expect(await screen.findByText('That picture is too large. Pictures can be 4 MB at most.')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Your logo' })).not.toBeInTheDocument()
  })

  it('keeps the logo it has when a new file is refused, and clears the words when a good one comes', async () => {
    await renderDesign({ seed: seedBusiness({ logo: 'https://images.example.com/logo.png' }) })
    const user = picker()
    await user.upload(fileInput(), notAPicture())
    await screen.findByText(/not a picture we can use/)
    expect(screen.getByRole('img', { name: 'Your logo' })).toHaveAttribute('src', 'https://images.example.com/logo.png')
    await user.upload(fileInput(), sampleImageFile('png'))
    await screen.findByRole('button', { name: 'Replace logo' })
    expect(screen.queryByText(/not a picture we can use/)).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Your logo' }).getAttribute('src')).toMatch(/^data:image\/png/)
  })

  it('says in words that the upload failed because of the connection', async () => {
    await renderDesign({ wrapOwner: (real) => ({ ...real, uploadImage: () => Promise.reject(new OwnerError('network')) }) })
    await picker().upload(fileInput(), sampleImageFile('png'))
    expect(await screen.findByText('We could not reach the server. Check your connection and try again.')).toBeInTheDocument()
  })

  it('removes the logo from the draft, saves null, and Discard brings it back', async () => {
    const spy = spyOnSave()
    const { user, owner } = await renderDesign({
      wrapOwner: spy.wrap,
      seed: seedBusiness({ logo: 'https://images.example.com/logo.png' }),
    })
    await user.click(screen.getByRole('button', { name: 'Remove logo' }))
    expect(screen.getByText('No logo yet')).toBeInTheDocument()
    expect(previewRegion().querySelector('header img')).toBeNull()

    await user.click(discardButton())
    expect(screen.getByRole('img', { name: 'Your logo' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove logo' }))
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect(spy.patches.at(-1)).toEqual({ logo: null })
    expect((await owner.getBusiness())?.logo).toBeNull()
  })

  it('sends the focus to the logo picture, with words, when the repository refuses the logo on Save', async () => {
    const { user } = await renderDesign({
      wrapOwner: (real) => ({ ...real, saveBusiness: () => Promise.reject(new OwnerError('invalid', { logo: 'invalid' })) }),
    })
    const files = picker()
    await files.upload(fileInput(), sampleImageFile('png'))
    await screen.findByRole('img', { name: 'Your logo' })
    await user.click(saveButton())

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Logo' })).toHaveFocus()
  })

  it('clears the upload words when the logo is removed', async () => {
    const { user } = await renderDesign({ seed: seedBusiness({ logo: 'https://images.example.com/logo.png' }) })
    await picker().upload(fileInput(), notAPicture())
    await screen.findByText(/not a picture we can use/)
    await user.click(screen.getByRole('button', { name: 'Remove logo' }))
    expect(screen.queryByText(/not a picture we can use/)).not.toBeInTheDocument()
  })

  it('shows the hint about the kinds of picture before anything goes wrong', async () => {
    await renderDesign()
    expect(screen.getByText('A JPEG, PNG or WebP picture, up to 4 MB.')).toBeInTheDocument()
  })
})
