import { OwnerError, type OwnerRepository } from '@/data/ownerRepository'

/**
 * The repository with every call watched: when one is refused because the session ended (a cookie that expired in another
 * tab, say), `onSignedOut` runs, and the refusal still reaches whoever asked. The dashboard signs the owner out here too, so
 * the guard sends them to sign in again, instead of leaving a page where every save fails.
 */
export function watchOwner(owner: OwnerRepository, onSignedOut: () => void): OwnerRepository {
  return new Proxy(owner, {
    get(target, key) {
      const member: unknown = Reflect.get(target, key)
      if (typeof member !== 'function') return member
      return async (...args: unknown[]) => {
        try {
          return await member.apply(target, args)
        } catch (error) {
          if (error instanceof OwnerError && error.code === 'signedOut') onSignedOut()
          throw error
        }
      }
    },
  })
}
