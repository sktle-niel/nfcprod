import { describe, expect, it } from 'vitest'
import { testOwner as owner, WRONG_PASSWORD } from '@/test/auth'
import { AuthError, createMockAuth } from './auth'

async function failure(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
  } catch (error) {
    if (error instanceof AuthError) return error.code
    throw error
  }
  throw new Error('expected an AuthError')
}

describe('createMockAuth', () => {
  it('starts signed out', async () => {
    expect(await createMockAuth({ delay: 0 }).current()).toBeNull()
  })

  it('signs up, keeps the session, and logs out', async () => {
    const repository = createMockAuth({ delay: 0 })
    const session = await repository.signUp(owner)
    expect(session).toEqual({ account: expect.objectContaining({ name: owner.name, email: owner.email, method: 'password' }), demo: true })
    expect(await repository.current()).toEqual(session)
    await repository.logOut()
    expect(await repository.current()).toBeNull()
  })

  it('refuses a second account with the same email, whatever the case', async () => {
    const repository = createMockAuth({ delay: 0 })
    await repository.signUp(owner)
    expect(await failure(repository.signUp({ ...owner, email: 'JUAN@cafe.ph' }))).toBe('emailTaken')
  })

  it('logs in with the right password only, and says the same for an unknown email', async () => {
    const repository = createMockAuth({ delay: 0 })
    await repository.signUp(owner)
    await repository.logOut()
    expect(await failure(repository.logIn({ email: owner.email, password: WRONG_PASSWORD }))).toBe('invalidCredentials')
    expect(await failure(repository.logIn({ email: 'nobody@cafe.ph', password: owner.password }))).toBe('invalidCredentials')
    expect((await repository.logIn({ email: ' Juan@Cafe.ph', password: owner.password })).account.email).toBe(owner.email)
  })

  it('signs in with Google in demo mode', async () => {
    const session = await createMockAuth({ delay: 0 }).continueWithGoogle()
    expect(session.account.method).toBe('google')
    expect(session.demo).toBe(true)
  })
})
