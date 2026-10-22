import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { OwnerError, type OwnerRepository } from '@/data/ownerRepository'
import { sampleImageFile } from '@/test/ownerFixtures'
import { discardButton, renderDesign, saveButton, spyOnSave } from './designTestkit'

/** A call that stays open until the test lets it go: the time a real upload takes. */
function gate() {
  let open: () => void = () => {}
  const opened = new Promise<void>((resolve) => {
    open = resolve
  })
  return { opened, release: () => act(async () => open()) }
}

function slowUpload(held: Promise<void>) {
  return (real: OwnerRepository): OwnerRepository => ({
    ...real,
    uploadImage: async (file) => {
      await held
      return real.uploadImage(file)
    },
  })
}

const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!
const chooseLogo = () => screen.getByRole('button', { name: /^(Choose a logo|Replace logo)$/ })

describe('DesignPage: a logo that is still uploading', () => {
  it('keeps what the owner types meanwhile, and the logo joins the newest draft', async () => {
    const upload = gate()
    const { user } = await renderDesign({ wrapOwner: slowUpload(upload.opened) })
    await user.upload(fileInput(), sampleImageFile('png'))
    await user.type(screen.getByLabelText('Tagline'), ' now')
    expect(screen.getByLabelText('Tagline')).toHaveValue('Coffee and pastries on the corner now')

    await upload.release()
    await screen.findByRole('img', { name: 'Your logo' })
    expect(screen.getByLabelText('Tagline')).toHaveValue('Coffee and pastries on the corner now')
  })

  it('turns Save and Discard off until the logo has arrived, then saves the text and the logo together', async () => {
    const upload = gate()
    const spy = spyOnSave()
    const { user, owner } = await renderDesign({ wrapOwner: (real) => slowUpload(upload.opened)(spy.wrap(real)) })
    await user.type(screen.getByLabelText('Tagline'), ' now')
    await user.upload(fileInput(), sampleImageFile('png'))
    expect(saveButton()).toBeDisabled()
    expect(discardButton()).toBeDisabled()

    await upload.release()
    await screen.findByRole('img', { name: 'Your logo' })
    expect(saveButton()).toBeEnabled()
    expect(discardButton()).toBeEnabled()

    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect(Object.keys(spy.patches[0] ?? {}).sort()).toEqual(['logo', 'tagline'])
    expect((await owner.getBusiness())?.logo).toMatch(/^data:image\/png/)
    expect((await owner.getBusiness())?.tagline).toBe('Coffee and pastries on the corner now')
  })

  it('does not save from the Enter key while the logo is on its way', async () => {
    const upload = gate()
    const spy = spyOnSave()
    const { user } = await renderDesign({ wrapOwner: (real) => slowUpload(upload.opened)(spy.wrap(real)) })
    await user.type(screen.getByLabelText('Tagline'), ' now')
    await user.upload(fileInput(), sampleImageFile('png'))
    await user.type(screen.getByLabelText('Tagline'), '{Enter}')
    expect(spy.patches).toEqual([])
    await upload.release()
    await screen.findByRole('img', { name: 'Your logo' })
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument()
  })

  it('does not bring back edits the owner threw away: Discard waits for the logo', async () => {
    const upload = gate()
    const { user } = await renderDesign({ wrapOwner: slowUpload(upload.opened) })
    await user.type(screen.getByLabelText('Business name'), ' 2')
    await user.upload(fileInput(), sampleImageFile('png'))
    await user.click(discardButton())
    expect(screen.getByLabelText('Business name')).toHaveValue('Kape Kanto 2')

    await upload.release()
    await screen.findByRole('img', { name: 'Your logo' })
    await user.click(discardButton())
    expect(screen.getByLabelText('Business name')).toHaveValue('Kape Kanto')
    expect(screen.queryByRole('img', { name: 'Your logo' })).not.toBeInTheDocument()
  })

  it('shows a busy picker and takes no second file while one is uploading', async () => {
    const upload = gate()
    let calls = 0
    const { user } = await renderDesign({
      wrapOwner: (real) => ({
        ...real,
        uploadImage: async (file) => {
          calls += 1
          await upload.opened
          return real.uploadImage(file)
        },
      }),
    })
    await user.upload(fileInput(), sampleImageFile('png'))
    expect(chooseLogo()).toBeDisabled()
    await userEvent.setup().upload(fileInput(), sampleImageFile('jpeg'))
    expect(calls).toBe(1)
    await upload.release()
    await screen.findByRole('img', { name: 'Your logo' })
  })

  it('says why it failed and leaves the draft as it was', async () => {
    const upload = gate()
    const { user } = await renderDesign({
      wrapOwner: (real) => ({
        ...real,
        uploadImage: async () => {
          await upload.opened
          throw new OwnerError('network')
        },
      }),
    })
    await user.type(screen.getByLabelText('Tagline'), ' now')
    await user.upload(fileInput(), sampleImageFile('png'))
    await upload.release()
    expect(await screen.findByText('We could not reach the server. Check your connection and try again.')).toBeInTheDocument()
    expect(screen.getByLabelText('Tagline')).toHaveValue('Coffee and pastries on the corner now')
    expect(saveButton()).toBeEnabled()
  })

  it('keeps the picker busy while a save runs, so a logo cannot land in the middle of it', async () => {
    const saving = gate()
    const { user } = await renderDesign({
      wrapOwner: (real) => ({
        ...real,
        saveBusiness: async (patch) => {
          await saving.opened
          return real.saveBusiness(patch)
        },
      }),
    })
    await user.type(screen.getByLabelText('Tagline'), ' now')
    await user.click(saveButton())
    expect(chooseLogo()).toBeDisabled()
    await saving.release()
    await screen.findByText('Your changes are saved.')
    expect(chooseLogo()).toBeEnabled()
  })
})
