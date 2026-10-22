import { describe, expect, it, vi } from 'vitest'
import { OwnerError, type OwnerRepository } from '@/data/ownerRepository'
import { watchOwner } from './watchOwner'

/** A repository whose calls do what a test says. Only the parts the watcher touches are real. */
function repository(overrides: Partial<Record<keyof OwnerRepository, unknown>>): OwnerRepository {
  return overrides as unknown as OwnerRepository
}

describe('watchOwner', () => {
  it('passes a call through with its arguments and its answer', async () => {
    const onSignedOut = vi.fn()
    const saveCategory = vi.fn().mockResolvedValue({ categories: [] })
    const watched = watchOwner(repository({ saveCategory }), onSignedOut)

    await expect(watched.saveCategory({ name: 'Brunch', visible: true })).resolves.toEqual({ categories: [] })
    expect(saveCategory).toHaveBeenCalledWith({ name: 'Brunch', visible: true })
    expect(onSignedOut).not.toHaveBeenCalled()
  })

  it('tells the caller a session that ended, and rethrows the same refusal', async () => {
    const onSignedOut = vi.fn()
    const refusal = new OwnerError('signedOut')
    const watched = watchOwner(repository({ getMenu: () => Promise.reject(refusal) }), onSignedOut)

    await expect(watched.getMenu()).rejects.toBe(refusal)
    expect(onSignedOut).toHaveBeenCalledTimes(1)
  })

  it('leaves every other failure alone', async () => {
    const onSignedOut = vi.fn()
    const watched = watchOwner(
      repository({ getMenu: () => Promise.reject(new OwnerError('network')), getBusiness: () => Promise.reject(new Error('boom')) }),
      onSignedOut,
    )
    await expect(watched.getMenu()).rejects.toMatchObject({ code: 'network' })
    await expect(watched.getBusiness()).rejects.toThrow('boom')
    expect(onSignedOut).not.toHaveBeenCalled()
  })

  it('keeps the repository as the receiver of its own methods', async () => {
    const store = { name: 'mine', async getBusiness() { return this.name } }
    const watched = watchOwner(repository(store), vi.fn())
    await expect(watched.getBusiness()).resolves.toBe('mine')
  })
})
