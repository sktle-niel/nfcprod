import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { OwnerError } from '@/data/ownerRepository'
import { failingCreate, heading, linkField, nameField, next, openSetup, text, toLinkStep, toReview, wentToDashboard } from './setupTestkit'

const create = () => screen.getByRole('button', { name: text.steps.review.create })
const shell = dashboardCopy.shell

describe('when the repository refuses the new business', () => {
  it('takes the owner back to the link step when the link was taken in the meantime', async () => {
    const { user, owner } = await openSetup({ wrapOwner: failingCreate(new OwnerError('slugTaken')) })
    await toLinkStep(user)
    await toReview(user)

    await user.click(create())

    expect(await screen.findByText(text.steps.link.status.taken)).toBeInTheDocument()
    expect(heading(text.steps.link.heading)).toHaveFocus()
    expect(linkField()).toHaveValue('kape-kanto')
    expect(linkField()).toBeInvalid()
    expect(next()).toBeDisabled()
    expect(await owner.getBusiness()).toBeNull()
  })

  it('lets the owner pick another link after that and finish', async () => {
    const { user, owner, router } = await openSetup({ wrapOwner: failingCreate(new OwnerError('slugTaken')) })
    await toLinkStep(user)
    await toReview(user)
    await user.click(create())
    await screen.findByText(text.steps.link.status.taken)

    await user.clear(linkField())
    await user.type(linkField(), 'kape-kanto-cebu')
    await toReview(user)
    await user.click(create())

    await wentToDashboard(router)
    expect((await owner.getBusiness())?.slug).toBe('kape-kanto-cebu')
  })

  it('shows a refused field next to its input, on the step that asks for it', async () => {
    const { user } = await openSetup({ wrapOwner: failingCreate(new OwnerError('invalid', { name: 'tooLong' })) })
    await toLinkStep(user)
    await toReview(user)

    await user.click(create())

    expect(await screen.findByText(shell.fieldErrors.tooLong)).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
    expect(nameField()).toBeInvalid()
    expect(nameField()).toHaveFocus()
  })

  it('shows a refused link on the link step', async () => {
    const { user } = await openSetup({ wrapOwner: failingCreate(new OwnerError('invalid', { slug: 'invalid' })) })
    await toLinkStep(user)
    await toReview(user)

    await user.click(create())

    expect(await screen.findByText(shell.fieldErrors.invalid)).toBeInTheDocument()
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument()
    expect(linkField()).toBeInvalid()
  })

  it('keeps the owner on the review with a message when the server cannot be reached, and lets them try again', async () => {
    const { user, owner, router } = await openSetup({ wrapOwner: failingCreate(new OwnerError('network')) })
    await toLinkStep(user)
    await toReview(user)

    await user.click(create())

    expect(await screen.findByRole('alert')).toHaveTextContent(shell.errors.network)
    expect(heading(text.steps.review.heading)).toBeInTheDocument()
    expect(create()).toBeEnabled()
    await user.click(create())

    await wentToDashboard(router)
    expect(await owner.getBusiness()).not.toBeNull()
  })

  it('never shows the message of an error it does not know', async () => {
    const { user } = await openSetup({ wrapOwner: failingCreate(new Error('connection string leaked')) })
    await toLinkStep(user)
    await toReview(user)

    await user.click(create())

    expect(await screen.findByRole('alert')).toHaveTextContent(shell.errors.unknown)
    expect(screen.queryByText(/leaked/)).not.toBeInTheDocument()
  })

  it('takes the failure message away when the owner goes back to change an answer', async () => {
    const { user } = await openSetup({ wrapOwner: failingCreate(new OwnerError('network')) })
    await toLinkStep(user)
    await toReview(user)
    await user.click(create())
    await screen.findByRole('alert')

    await user.click(screen.getByRole('button', { name: text.back }))
    await screen.findByText(text.steps.link.status.available)
    await user.click(next())

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('disables Back and shows the button as busy while the menu is being created', async () => {
    const { user } = await openSetup({
      wrapOwner: (real) => ({
        ...real,
        createBusiness: (input) => new Promise((resolve) => setTimeout(() => resolve(real.createBusiness(input)), 200)),
      }),
    })
    await toLinkStep(user)
    await toReview(user)

    await user.click(create())

    expect(create()).toHaveAttribute('aria-busy', 'true')
    expect(create()).toBeDisabled()
    expect(screen.getByRole('button', { name: text.back })).toBeDisabled()
    expect(screen.getByText(text.steps.review.creating)).toBeInTheDocument()
  })
})
