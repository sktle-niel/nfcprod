import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OwnerError } from '@/data/ownerRepository'
import { discardButton, previewRegion, renderDesign, saveButton, showPart, spyOnSave } from './designTestkit'

describe('DesignPage: the page', () => {
  it('has one h1, the panels as h2 and starts on the Details tab', async () => {
    await renderDesign()
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Design'])
    const h2 = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(h2).toEqual(expect.arrayContaining(['Your business', 'Contact and hours', 'Online', 'Preview']))
    expect(screen.getByRole('tab', { name: 'Details' })).toHaveAttribute('aria-selected', 'true')
    expect(document.title).toBe('Design')
  })

  it('fills every field from the saved business', async () => {
    await renderDesign()
    expect(screen.getByLabelText('Business name')).toHaveValue('Kape Kanto')
    expect(screen.getByLabelText('Tagline')).toHaveValue('Coffee and pastries on the corner')
    expect(screen.getByLabelText('Phone')).toHaveValue('+63 917 555 0142')
    expect(screen.getByLabelText('Address')).toHaveValue('12 Mabini Street, Lahug, Cebu City')
    expect(screen.getByLabelText('Opening hours')).toHaveValue('Mon to Fri, 7 am to 9 pm\nSat and Sun, 8 am to 10 pm')
    expect(screen.getByLabelText('Facebook link')).toHaveValue('https://facebook.com/kapekanto')
    expect(screen.getByLabelText('Instagram link')).toHaveValue('https://instagram.com/kapekanto')
    expect(screen.getByLabelText('TikTok link')).toHaveValue('')
    expect(screen.getByLabelText('Website')).toHaveValue('')
    expect(screen.getByText('No logo yet')).toBeInTheDocument()
  })

  it('opens empty fields for a business without details, and still shows the menu', async () => {
    await renderDesign({ details: false })
    expect(screen.getByLabelText('Tagline')).toHaveValue('')
    expect(screen.getByLabelText('Phone')).toHaveValue('')
    expect(screen.getByLabelText('Opening hours')).toHaveValue('')
    expect(within(previewRegion()).getByRole('heading', { name: 'Kape Kanto' })).toBeInTheDocument()
  })

  it('counts the characters of the tagline as the owner types', async () => {
    const { user } = await renderDesign()
    expect(screen.getByText(/^33 of 100 characters/)).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Tagline'))
    await user.type(screen.getByLabelText('Tagline'), 'Open late')
    expect(screen.getByText(/^9 of 100 characters/)).toBeInTheDocument()
  })

  it('keeps what was typed on one tab while the owner looks at the other', async () => {
    const { user } = await renderDesign()
    await user.type(screen.getByLabelText('Business name'), ' 2')
    await user.click(screen.getByRole('tab', { name: 'Look' }))
    expect(screen.getByLabelText('Accent color')).toBeVisible()
    expect(screen.getByLabelText('Business name')).not.toBeVisible()
    await user.click(screen.getByRole('tab', { name: 'Details' }))
    expect(screen.getByLabelText('Business name')).toHaveValue('Kape Kanto 2')
  })

  it('moves between the tabs with the arrow keys', async () => {
    const { user } = await renderDesign()
    screen.getByRole('tab', { name: 'Details' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Look' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('DesignPage: the draft, Save and Discard', () => {
  it('starts clean: Save and Discard are off and the bar says everything is saved', async () => {
    await renderDesign()
    expect(saveButton()).toBeDisabled()
    expect(discardButton()).toBeDisabled()
    expect(screen.getByText('Everything is saved.')).toBeInTheDocument()
  })

  it('turns Save and Discard on and says so when something changes', async () => {
    const { user } = await renderDesign()
    await user.type(screen.getByLabelText('Business name'), 'x')
    expect(saveButton()).toBeEnabled()
    expect(discardButton()).toBeEnabled()
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument()
  })

  it('is clean again when the owner types the old value back', async () => {
    const { user } = await renderDesign()
    await user.type(screen.getByLabelText('Business name'), 'x')
    await user.type(screen.getByLabelText('Business name'), '{Backspace}')
    expect(saveButton()).toBeDisabled()
  })

  it('saves only what changed and shows the saved state', async () => {
    const spy = spyOnSave()
    const { user, owner } = await renderDesign({ wrapOwner: spy.wrap })
    await user.clear(screen.getByLabelText('Tagline'))
    await user.type(screen.getByLabelText('Tagline'), 'Open late')
    await user.click(saveButton())

    await screen.findByText('Your changes are saved.')
    expect(spy.patches).toEqual([{ tagline: 'Open late' }])
    expect((await owner.getBusiness())?.tagline).toBe('Open late')
    expect(saveButton()).toBeDisabled()
    expect(screen.getByText('Everything is saved.')).toBeInTheDocument()
  })

  it('saves with the Enter key from a field', async () => {
    const spy = spyOnSave()
    const { user } = await renderDesign({ wrapOwner: spy.wrap })
    await user.type(screen.getByLabelText('Business name'), ' Two{Enter}')
    await screen.findByText('Your changes are saved.')
    expect(spy.patches).toEqual([{ name: 'Kape Kanto Two' }])
  })

  it('puts the focus on the tab after a save, because the Save button turns off', async () => {
    const { user } = await renderDesign()
    await user.type(screen.getByLabelText('Business name'), 'x')
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect(screen.getByRole('tab', { name: 'Details' })).toHaveFocus()
  })

  it('sends all four links when one of them changes', async () => {
    const spy = spyOnSave()
    const { user, owner } = await renderDesign({ wrapOwner: spy.wrap })
    await user.type(screen.getByLabelText('TikTok link'), 'tiktok.com/@kapekanto')
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect(spy.patches[0]).toEqual({
      social: {
        facebook: 'https://facebook.com/kapekanto',
        instagram: 'https://instagram.com/kapekanto',
        tiktok: 'https://tiktok.com/@kapekanto',
        website: '',
      },
    })
    expect((await owner.getBusiness())?.social.tiktok).toBe('https://tiktok.com/@kapekanto')
  })

  it('shows the cleaned text after a save', async () => {
    const { user } = await renderDesign()
    await user.type(screen.getByLabelText('Tagline'), '     !')
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect(screen.getByLabelText('Tagline')).toHaveValue('Coffee and pastries on the corner !')
  })

  it('does not call the repository for text that cleaning leaves as it was', async () => {
    const spy = spyOnSave()
    const { user } = await renderDesign({ wrapOwner: spy.wrap })
    await user.type(screen.getByLabelText('Business name'), '   ')
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect(spy.patches).toEqual([])
    expect(screen.getByLabelText('Business name')).toHaveValue('Kape Kanto')
  })

  it('Discard brings back every saved value, sends nothing and puts the focus on the tab', async () => {
    const spy = spyOnSave()
    const { user } = await renderDesign({ wrapOwner: spy.wrap })
    await user.clear(screen.getByLabelText('Business name'))
    await user.type(screen.getByLabelText('Phone'), '9')
    await user.click(discardButton())
    expect(screen.getByLabelText('Business name')).toHaveValue('Kape Kanto')
    expect(screen.getByLabelText('Phone')).toHaveValue('+63 917 555 0142')
    expect(saveButton()).toBeDisabled()
    expect(spy.patches).toEqual([])
    expect(screen.getByRole('tab', { name: 'Details' })).toHaveFocus()
  })

  it('Discard also clears the messages of a refused save', async () => {
    const { user } = await renderDesign()
    await user.clear(screen.getByLabelText('Business name'))
    await user.click(saveButton())
    expect(await screen.findByText('Enter your business name.')).toBeInTheDocument()
    await user.click(discardButton())
    expect(screen.queryByText('Enter your business name.')).not.toBeInTheDocument()
    expect(screen.queryByText('We could not save your changes.')).not.toBeInTheDocument()
  })
})

describe('DesignPage: the preview shows the unsaved draft', () => {
  it('follows each keystroke, and the saved business does not move', async () => {
    const { user, owner } = await renderDesign()
    await user.clear(screen.getByLabelText('Business name'))
    await user.type(screen.getByLabelText('Business name'), 'Moon Cafe')
    await user.clear(screen.getByLabelText('Tagline'))
    await user.type(screen.getByLabelText('Tagline'), 'Open all night')
    const preview = within(previewRegion())
    expect(preview.getByRole('heading', { name: 'Moon Cafe' })).toBeInTheDocument()
    expect(preview.getByText('Open all night')).toBeInTheDocument()
    expect((await owner.getBusiness())?.name).toBe('Kape Kanto')
  })

  it('shows the contact details and the links being typed', async () => {
    const { user } = await renderDesign()
    await user.type(screen.getByLabelText('TikTok link'), 'tiktok.com/@kapekanto')
    const preview = within(previewRegion())
    // The preview is a picture of the menu: the link shows, but it is not clickable.
    expect(preview.getByText('TikTok')).toBeInTheDocument()
    expect(preview.queryByRole('link', { name: 'TikTok' })).not.toBeInTheDocument()
    await user.clear(screen.getByLabelText('Address'))
    await user.type(screen.getByLabelText('Address'), '1 Pier Road')
    expect(preview.getByText('1 Pier Road')).toBeInTheDocument()
  })

  it('does not draw a link the owner has not finished', async () => {
    const { user } = await renderDesign()
    await user.type(screen.getByLabelText('Website'), 'javascript:alert(1)')
    expect(within(previewRegion()).queryByText('Website')).not.toBeInTheDocument()
  })

  it('goes back to the saved menu after Discard', async () => {
    const { user } = await renderDesign()
    await user.type(screen.getByLabelText('Business name'), ' Two')
    await user.click(discardButton())
    expect(within(previewRegion()).getByRole('heading', { name: 'Kape Kanto' })).toBeInTheDocument()
  })

  it('folds on a phone and opens from a button that says what it does', async () => {
    const { user } = await renderDesign()
    const toggle = screen.getByRole('button', { name: 'Show preview' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Hide preview' })).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('DesignPage: refusals', () => {
  it('refuses an empty name: words next to the field, the focus on it, nothing sent', async () => {
    const spy = spyOnSave()
    const { user } = await renderDesign({ wrapOwner: spy.wrap })
    await user.clear(screen.getByLabelText('Business name'))
    await user.click(saveButton())
    expect(await screen.findByText('Enter your business name.')).toBeInTheDocument()
    expect(screen.getByLabelText('Business name')).toBeInvalid()
    expect(screen.getByLabelText('Business name')).toHaveFocus()
    expect(screen.getByText('We could not save your changes.')).toBeInTheDocument()
    expect(spy.patches).toEqual([])
  })

  it('takes the words away when the owner fixes the field', async () => {
    const { user } = await renderDesign()
    await user.clear(screen.getByLabelText('Business name'))
    await user.click(saveButton())
    await screen.findByText('Enter your business name.')
    await user.type(screen.getByLabelText('Business name'), 'Moon')
    expect(screen.queryByText('Enter your business name.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Business name')).not.toBeInvalid()
  })

  it.each([
    ['Business name', 'x'.repeat(61), 'This is too long.'],
    ['Tagline', 'x'.repeat(101), 'This is too long.'],
    ['Phone', 'call me', 'Use one number with digits, spaces and + ( ) - only, for example 0917 123 4567.'],
    ['Phone', '0917 123 4567 / 0928', 'Use one number with digits, spaces and + ( ) - only, for example 0917 123 4567.'],
    ['Phone', '12345', 'A phone number needs at least 7 characters.'],
    ['Address', 'x'.repeat(201), 'This is too long.'],
    ['Opening hours', 'x'.repeat(301), 'This is too long.'],
    ['Facebook link', 'https://example.com/page', 'Use a facebook.com link, for example facebook.com/yourpage. Short links such as fb.me are not accepted.'],
    ['Facebook link', 'fb.me/kapekanto', 'Use a facebook.com link, for example facebook.com/yourpage. Short links such as fb.me are not accepted.'],
    ['Instagram link', 'http://instagram.com/x', 'Use an instagram.com link, for example instagram.com/yourpage.'],
    ['TikTok link', '@kapekanto', 'Use a tiktok.com link, for example tiktok.com/@yourpage.'],
    ['Website', 'javascript:alert(1)', 'Use a web address like yourbusiness.com. Links that start with http:// are not accepted.'],
  ])('refuses %s of "%s" with "%s" next to it', async (label, value, words) => {
    const spy = spyOnSave()
    const { user } = await renderDesign({ wrapOwner: spy.wrap })
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
    await user.click(saveButton())
    expect(await screen.findByText(words)).toBeInTheDocument()
    expect(screen.getByLabelText(label)).toBeInvalid()
    expect(screen.getByLabelText(label)).toHaveFocus()
    expect(spy.patches).toEqual([])
  })

  it('names the wrong link and no other', async () => {
    const { user } = await renderDesign()
    await user.type(screen.getByLabelText('TikTok link'), 'example.com/x')
    await user.click(saveButton())
    await screen.findByText('Use a tiktok.com link, for example tiktok.com/@yourpage.')
    expect(screen.getByLabelText('TikTok link')).toBeInvalid()
    expect(screen.getByLabelText('Facebook link')).not.toBeInvalid()
  })

  it('shows the tab with the problem and focuses its first invalid field, wherever the owner was', async () => {
    const { user } = await renderDesign()
    await user.clear(screen.getByLabelText('Business name'))
    await user.click(screen.getByRole('tab', { name: 'Look' }))
    await user.click(saveButton())
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Details' })).toHaveAttribute('aria-selected', 'true'))
    expect(screen.getByLabelText('Business name')).toHaveFocus()
  })

  it('shows what the repository refuses next to the field and keeps the owner\'s edits', async () => {
    const { user } = await renderDesign({
      wrapOwner: (real) => ({
        ...real,
        saveBusiness: () => Promise.reject(new OwnerError('invalid', { tagline: 'tooLong' })),
      }),
    })
    await user.type(screen.getByLabelText('Tagline'), '!')
    await user.click(saveButton())
    expect(await screen.findByText('This is too long.')).toBeInTheDocument()
    expect(screen.getByLabelText('Tagline')).toHaveFocus()
    expect(screen.getByLabelText('Tagline')).toHaveValue('Coffee and pastries on the corner!')
    expect(saveButton()).toBeEnabled()
  })

  it('shows a refusal of the links as a whole above the links', async () => {
    const { user } = await renderDesign({
      wrapOwner: (real) => ({ ...real, saveBusiness: () => Promise.reject(new OwnerError('invalid', { social: 'invalid' })) }),
    })
    await user.type(screen.getByLabelText('Website'), 'moon.example.com')
    await user.click(saveButton())
    const online = screen.getByRole('heading', { name: 'Online' }).closest('section')!
    expect(await within(online).findByRole('alert')).toHaveTextContent('Check your links and try again.')
  })

  it('shows a refusal of the theme on the Look tab, even when the owner is on Details', async () => {
    const { user } = await renderDesign({
      wrapOwner: (real) => ({ ...real, saveBusiness: () => Promise.reject(new OwnerError('invalid', { theme: 'invalid' })) }),
    })
    await user.click(screen.getByRole('tab', { name: 'Look' }))
    await showPart(user, 'Extras')
    await user.click(screen.getByRole('radio', { name: 'List' }))
    await user.click(screen.getByRole('tab', { name: 'Details' }))
    await user.click(saveButton())
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Look' })).toHaveAttribute('aria-selected', 'true'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Check your colors and try again.')
  })

  it('does not blame a field for a refusal about something else, and says the general words', async () => {
    const { user } = await renderDesign({
      wrapOwner: (real) => ({ ...real, saveBusiness: () => Promise.reject(new OwnerError('invalid', { published: 'invalid' })) }),
    })
    await user.type(screen.getByLabelText('Business name'), '!')
    await user.click(saveButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('Some of what you entered is not valid.')
    expect(screen.getByLabelText('Business name')).not.toBeInvalid()
  })

  it('says in words that the connection failed, never the raw error, and saves on a second try', async () => {
    let fail = true
    const { user, owner } = await renderDesign({
      wrapOwner: (real) => ({
        ...real,
        saveBusiness: (patch) => (fail ? Promise.reject(new OwnerError('network')) : real.saveBusiness(patch)),
      }),
    })
    await user.type(screen.getByLabelText('Business name'), '!')
    await user.click(saveButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not reach the server. Check your connection and try again.')
    expect(screen.queryByText('network')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Business name')).toHaveValue('Kape Kanto!')

    fail = false
    await user.click(saveButton())
    await screen.findByText('Your changes are saved.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect((await owner.getBusiness())?.name).toBe('Kape Kanto!')
  })

  it('gives an unknown failure the plain words', async () => {
    const { user } = await renderDesign({
      wrapOwner: (real) => ({ ...real, saveBusiness: () => Promise.reject(new Error('boom: stack trace here')) }),
    })
    await user.type(screen.getByLabelText('Business name'), '!')
    await user.click(saveButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument()
  })

  it('shows a busy Save while the call runs, and ignores typing until it ends', async () => {
    let release!: () => void
    const { user } = await renderDesign({
      wrapOwner: (real) => ({
        ...real,
        saveBusiness: (patch) => new Promise((resolve) => (release = () => resolve(real.saveBusiness(patch)))),
      }),
    })
    await user.type(screen.getByLabelText('Business name'), '!')
    await user.click(saveButton())
    expect(saveButton()).toHaveAttribute('aria-busy', 'true')
    expect(saveButton()).toBeDisabled()
    expect(discardButton()).toBeDisabled()
    expect(screen.getByText('Saving your changes')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Business name'), 'zz')
    expect(screen.getByLabelText('Business name')).toHaveValue('Kape Kanto!')
    release()
    await screen.findByText('Your changes are saved.')
  })
})
