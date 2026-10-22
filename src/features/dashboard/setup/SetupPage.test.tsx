import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mergePresets } from '@/presets'
import { renderDashboardPage } from '@/test/dashboard'
import { fillName, heading, linkField, nameField, next, openSetup, text, toLinkStep, toReview, typeBox, wentToDashboard } from './setupTestkit'
import { SetupPage } from './SetupPage'

describe('SetupPage', () => {
  it('creates the business and its menu through the four steps, then goes to the dashboard', async () => {
    const { user, owner, router } = await openSetup()

    expect(screen.getByRole('heading', { level: 1, name: text.title })).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
    await fillName(user, '  Kape   Kanto ')
    await user.click(next())

    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument()
    await user.click(typeBox('coffee'))
    await user.click(next())

    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument()
    expect(linkField()).toHaveValue('kape-kanto')
    await toReview(user)

    expect(screen.getByText('Step 4 of 4')).toBeInTheDocument()
    expect(screen.getByText('Kape Kanto')).toBeInTheDocument()
    expect(screen.getByText('Coffee shop')).toBeInTheDocument()
    expect(screen.getByText('/m/kape-kanto')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: text.steps.review.create }))

    await wentToDashboard(router)
    const business = await owner.getBusiness()
    expect(business).toMatchObject({ name: 'Kape Kanto', slug: 'kape-kanto', types: ['coffee'], published: false })
    const menu = await owner.getMenu()
    expect(menu.categories.map((category) => category.name)).toEqual(mergePresets(['coffee']).categories)
  })

  it('fills the menu with example items by default', async () => {
    const withSamples = await openSetup()
    const { router } = withSamples
    await toLinkStep(withSamples.user)
    await toReview(withSamples.user)
    const checkbox = screen.getByRole('checkbox', { name: text.steps.review.samples.label })
    expect(checkbox).toBeChecked()
    await withSamples.user.click(screen.getByRole('button', { name: text.steps.review.create }))
    await wentToDashboard(router)
    expect((await withSamples.owner.getMenu()).products.length).toBe(mergePresets(['coffee']).samples.length)
  })

  it('creates an empty menu when the example items are turned off', async () => {
    const { user, owner, router } = await openSetup()
    await toLinkStep(user)
    await toReview(user)
    await user.click(screen.getByRole('checkbox', { name: text.steps.review.samples.label }))
    await user.click(screen.getByRole('button', { name: text.steps.review.create }))

    await wentToDashboard(router)
    const menu = await owner.getMenu()
    expect(menu.products).toEqual([])
    expect(menu.categories.length).toBeGreaterThan(0)
  })

  it('merges the presets of every type picked, with the first pick giving the look', async () => {
    const { user, owner, router } = await openSetup()
    await toLinkStep(user, 'Sweet Corner', ['bakery', 'coffee'])
    await toReview(user)
    expect(screen.getByText('Bakery, Coffee shop')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: text.steps.review.create }))

    await wentToDashboard(router)
    const business = await owner.getBusiness()
    expect(business?.types).toEqual(['bakery', 'coffee'])
    expect(business?.theme).toEqual(mergePresets(['bakery', 'coffee']).theme)
    expect((await owner.getMenu()).categories.map((category) => category.name)).toEqual(mergePresets(['bakery', 'coffee']).categories)
  })

  it('sends an owner who already has a business to the dashboard', async () => {
    const { router } = await renderDashboardPage(<SetupPage />, '/dashboard/setup', { guard: false })

    await wentToDashboard(router)
    expect(screen.queryByRole('heading', { name: text.steps.name.heading })).not.toBeInTheDocument()
  })

  it('signs the owner out from the top bar and leaves for the home page', async () => {
    const { user, auth } = await openSetup()

    await user.click(screen.getByRole('button', { name: text.logOut }))

    expect(await screen.findByText('Went to /')).toBeInTheDocument()
    await waitFor(async () => expect(await auth.current()).toBeNull())
  })

  describe('going back and forth', () => {
    it('keeps every answer when the owner goes back and forward again', async () => {
      const { user } = await openSetup()
      await toLinkStep(user, 'Kape Kanto', ['coffee', 'bakery'])
      await user.clear(linkField())
      await user.type(linkField(), 'my-kape')
      await screen.findByText(text.steps.link.status.available)

      await user.click(screen.getByRole('button', { name: text.back }))
      expect(heading(text.steps.types.heading)).toHaveFocus()
      expect(typeBox('coffee')).toBeChecked()
      expect(typeBox('bakery')).toBeChecked()
      expect(typeBox('bar')).not.toBeChecked()

      await user.click(screen.getByRole('button', { name: text.back }))
      expect(nameField()).toHaveValue('Kape Kanto')

      await user.click(next())
      await user.click(next())
      expect(linkField()).toHaveValue('my-kape')
      await screen.findByText(text.steps.link.status.available)
    })

    it('has no Back button on the first step', async () => {
      await openSetup()

      expect(screen.queryByRole('button', { name: text.back })).not.toBeInTheDocument()
    })

    it('follows a changed name with the suggested link until the owner types a link', async () => {
      const { user } = await openSetup()
      await toLinkStep(user, 'Kape Kanto')
      expect(linkField()).toHaveValue('kape-kanto')

      await user.click(screen.getByRole('button', { name: text.back }))
      await user.click(screen.getByRole('button', { name: text.back }))
      await fillName(user, 'Kape Uno')
      await user.click(next())
      await user.click(next())

      expect(linkField()).toHaveValue('kape-uno')
    })

    it('jumps from the review to the answer to change and comes back with the rest kept', async () => {
      const { user } = await openSetup()
      await toLinkStep(user)
      await toReview(user)

      await user.click(screen.getByRole('button', { name: text.steps.review.changeNames.name }))
      expect(heading(text.steps.name.heading)).toHaveFocus()
      await user.type(nameField(), ' Two')
      await user.click(next())
      expect(typeBox('coffee')).toBeChecked()
      await user.click(next())
      expect(linkField()).toHaveValue('kape-kanto-two')
      await toReview(user)

      expect(screen.getByText('Kape Kanto Two')).toBeInTheDocument()
      expect(screen.getByText('/m/kape-kanto-two')).toBeInTheDocument()
    })
  })

  describe('keyboard use', () => {
    it('moves to the heading of each new step', async () => {
      const { user } = await openSetup()
      await fillName(user, 'Kape Kanto')
      await user.click(next())
      expect(heading(text.steps.types.heading)).toHaveFocus()

      await user.click(typeBox('coffee'))
      await user.click(next())
      expect(heading(text.steps.link.heading)).toHaveFocus()
    })

    it('goes on with Enter in the name field when the name is valid', async () => {
      const { user } = await openSetup()

      await user.type(nameField(), 'Kape Kanto{Enter}')

      expect(heading(text.steps.types.heading)).toHaveFocus()
    })

    it('ticks a business type with the space bar', async () => {
      const { user } = await openSetup()
      await fillName(user, 'Kape Kanto')
      await user.click(next())

      await user.tab()
      expect(typeBox('coffee')).toHaveFocus()
      await user.keyboard(' ')

      expect(typeBox('coffee')).toBeChecked()
      await user.keyboard('{Enter}')
      expect(heading(text.steps.link.heading)).toHaveFocus()
    })

    it('goes to the review with Enter in the link field once the link is free', async () => {
      const { user } = await openSetup()
      await toLinkStep(user)
      await screen.findByText(text.steps.link.status.available)

      await user.type(linkField(), '{Enter}')

      expect(heading(text.steps.review.heading)).toHaveFocus()
    })

    it('creates the menu with Enter on the review step', async () => {
      const { user, owner, router } = await openSetup()
      await toLinkStep(user)
      await toReview(user)

      await user.click(screen.getByRole('checkbox', { name: text.steps.review.samples.label }))

      await user.keyboard('{Enter}')

      await wentToDashboard(router)
      expect((await owner.getMenu()).products).toEqual([])
    })
  })
})
