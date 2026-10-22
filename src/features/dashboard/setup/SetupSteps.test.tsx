import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { env } from '@/config/env'
import { DEMO_TAKEN_SLUGS } from '@/data/owner'
import { OwnerError } from '@/data/ownerRepository'
import { fillName, heading, linkField, nameField, next, openSetup, text, toLinkStep, toReview, typeBox } from './setupTestkit'

describe('the steps of the setup wizard', () => {
  describe('business name', () => {
    it('asks for a name and stays on the step when it is empty', async () => {
      const { user } = await openSetup()

      await user.click(next())

      expect(screen.getByText(text.steps.name.required)).toBeInTheDocument()
      expect(nameField()).toBeInvalid()
      expect(nameField()).toHaveFocus()
      expect(heading(text.steps.name.heading)).toBeInTheDocument()
    })

    it('does not take a name of spaces only', async () => {
      const { user } = await openSetup()

      await user.type(nameField(), '    {Enter}')

      expect(screen.getByText(text.steps.name.required)).toBeInTheDocument()
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
    })

    it('stops the name at the longest the repository takes', async () => {
      const { user } = await openSetup()

      await user.type(nameField(), 'k'.repeat(80))

      expect(nameField()).toHaveValue('k'.repeat(60))
    })

    it('takes the message away once the owner types', async () => {
      const { user } = await openSetup()
      await user.click(next())

      await user.type(nameField(), 'K')

      expect(screen.queryByText(text.steps.name.required)).not.toBeInTheDocument()
    })
  })

  describe('business types', () => {
    it('shows the six kinds with what each one brings', async () => {
      const { user } = await openSetup()
      await fillName(user, 'Kape Kanto')
      await user.click(next())

      expect(screen.getAllByRole('checkbox')).toHaveLength(6)
      expect(typeBox('coffee')).toHaveAccessibleDescription(/Espresso, brews and pastries/)
      expect(typeBox('coffee')).toHaveAccessibleDescription(/You get: Hot, Iced, Blended, Pastries/)
    })

    it('asks for at least one kind and stays on the step', async () => {
      const { user } = await openSetup()
      await fillName(user, 'Kape Kanto')
      await user.click(next())

      await user.click(next())

      expect(await screen.findByRole('alert')).toHaveTextContent(text.steps.types.required)
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument()
    })

    it('takes the message away when a kind is ticked, and lets the owner untick it again', async () => {
      const { user } = await openSetup()
      await fillName(user, 'Kape Kanto')
      await user.click(next())
      await user.click(next())

      await user.click(typeBox('bar'))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      await user.click(typeBox('bar'))
      expect(typeBox('bar')).not.toBeChecked()
      await user.click(next())

      expect(screen.getByRole('alert')).toHaveTextContent(text.steps.types.required)
    })
  })

  describe('menu link', () => {
    it('starts from the name and shows the full link', async () => {
      const { user } = await openSetup()
      await toLinkStep(user, 'Café Ñora’s')

      expect(linkField()).toHaveValue('cafe-nora-s')
      expect(screen.getByText(`Your menu will be at ${window.location.origin}/m/cafe-nora-s`)).toBeInTheDocument()
      expect(screen.getByText('/m/')).toBeInTheDocument()
    })

    it('keeps Next off while the link is being checked and turns it on when the link is free', async () => {
      const { user } = await openSetup()
      await toLinkStep(user)

      expect(next()).toBeDisabled()
      expect(screen.getByText(text.steps.link.status.checking)).toBeInTheDocument()
      await screen.findByText(text.steps.link.status.available)
      expect(next()).toBeEnabled()
    })

    it('refuses a link that is taken and accepts another one', async () => {
      const taken = DEMO_TAKEN_SLUGS[0] ?? ''
      const { user } = await openSetup()
      await toLinkStep(user, 'Cafe Luna')
      expect(linkField()).toHaveValue(taken)

      expect(await screen.findByText(text.steps.link.status.taken)).toBeInTheDocument()
      expect(linkField()).toBeInvalid()
      expect(next()).toBeDisabled()

      await user.clear(linkField())
      await user.type(linkField(), 'luna-cafe-cebu')
      await screen.findByText(text.steps.link.status.available)
      expect(linkField()).toBeValid()
      expect(next()).toBeEnabled()
    })

    it('says at once that a badly formed link is not valid, without waiting for a check', async () => {
      const { user } = await openSetup()
      await toLinkStep(user)
      await user.clear(linkField())

      await user.type(linkField(), 'Bad Slug!')

      expect(linkField()).toHaveValue('bad-slug!')
      expect(screen.getByText(text.steps.link.status.invalid)).toBeInTheDocument()
      expect(next()).toBeDisabled()
    })

    it('writes capital letters and spaces as lower case and hyphens', async () => {
      const { user } = await openSetup()
      await toLinkStep(user)
      await user.clear(linkField())

      await user.type(linkField(), 'My Cafe')

      expect(linkField()).toHaveValue('my-cafe')
    })

    it('refuses a word we keep and asks for a link when it is empty', async () => {
      const { user } = await openSetup()
      await toLinkStep(user)
      await user.clear(linkField())
      expect(screen.getByText(text.steps.link.status.empty)).toBeInTheDocument()

      await user.type(linkField(), 'admin')

      expect(screen.getByText(text.steps.link.status.reserved)).toBeInTheDocument()
      expect(next()).toBeDisabled()
    })

    it('does not move on with Enter while the link is not free', async () => {
      const { user } = await openSetup()
      await toLinkStep(user, 'Cafe Luna')
      await screen.findByText(text.steps.link.status.taken)

      await user.type(linkField(), '{Enter}')

      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument()
    })

    it('looks the link up once after the owner stops typing', async () => {
      const calls: string[] = []
      const { user } = await openSetup({
        wrapOwner: (real) => ({
          ...real,
          checkSlug: async (slug) => {
            calls.push(slug)
            return real.checkSlug(slug)
          },
        }),
      })
      await toLinkStep(user)
      await user.clear(linkField())

      await user.type(linkField(), 'my-cafe')
      await screen.findByText(text.steps.link.status.available)

      expect(calls).toEqual(['my-cafe'])
    })

    it('says when the lookup failed and checks again on request', async () => {
      let failures = 1
      const { user } = await openSetup({
        wrapOwner: (real) => ({
          ...real,
          checkSlug: async (slug) => {
            if (failures-- > 0) throw new OwnerError('network')
            return real.checkSlug(slug)
          },
        }),
      })
      await toLinkStep(user)

      expect(await screen.findByText(text.steps.link.status.failed)).toBeInTheDocument()
      expect(next()).toBeDisabled()
      await user.click(screen.getByRole('button', { name: text.steps.link.recheck }))
      // The button is gone at once, so the focus must already be on the field.
      expect(linkField()).toHaveFocus()

      expect(await screen.findByText(text.steps.link.status.available)).toBeInTheDocument()
      expect(next()).toBeEnabled()
    })
  })

  describe('menu link with a configured public address', () => {
    const original = env.publicOrigin
    afterEach(() => {
      Object.assign(env, { publicOrigin: original })
    })

    it('shows the link from the configured address, not the address bar', async () => {
      Object.assign(env, { publicOrigin: 'https://menu.example.com' })
      const { user } = await openSetup()
      await toLinkStep(user, 'Cafe Nora')
      expect(screen.getByText('Your menu will be at https://menu.example.com/m/cafe-nora')).toBeInTheDocument()
    })
  })

  describe('words that promise a change later', () => {
    it('does not say the business types can be changed later, on the types step or on the review', async () => {
      const { user } = await openSetup()
      await fillName(user, 'Kape Kanto')
      await user.click(next())
      expect(screen.getByText(text.steps.types.hint)).toHaveTextContent(/cannot change the types/)
      expect(text.steps.types.hint).not.toMatch(/change everything later/)
      await user.click(typeBox('coffee'))
      await user.click(next())
      await toReview(user)
      expect(screen.getByText(text.steps.review.hint)).toHaveTextContent(/business types cannot be changed after this/)
      expect(text.steps.review.hint).not.toMatch(/change all of it later/)
    })
  })

  describe('review', () => {
    it('lists the answers and counts the example items', async () => {
      const { user } = await openSetup()
      await toLinkStep(user, 'Kape Kanto', ['coffee', 'milkTea'])
      await toReview(user)

      expect(screen.getByText('Coffee shop, Milk tea shop')).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: text.steps.review.samples.label })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: text.steps.review.samples.label })).toHaveAccessibleDescription(/We add \d+ example items/)
    })
  })
})
