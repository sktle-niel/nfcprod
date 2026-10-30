import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthError, type AuthRepository } from '@/data/auth'
import type { Account, Session } from '@/entities/account/account'
import { useSession } from './context'
import { SessionProvider } from './SessionProvider'

const account: Account = { id: 'owner-1', name: 'Juan Dela Cruz', email: 'juan@example.com', method: 'password' }
const signedIn: Session = { account, demo: true }

/** A stand-in for the auth provider. Only `current` is meant to run here; the other calls fail if a test makes one by mistake. */
function stubAuth(current: () => Promise<Session | null>): AuthRepository {
  const notUsed = () => Promise.reject(new Error('not used in this test'))
  return { current, signUp: notUsed, logIn: notUsed, continueWithGoogle: notUsed, logOut: notUsed }
}

/** Shows what the rest of the app reads: whether the session is known yet, and who is signed in. */
function Probe() {
  const { ready, session } = useSession()
  return (
    <>
      <p>{ready ? 'Ready' : 'Loading'}</p>
      {ready && <p>{session ? session.account.email : 'signed out'}</p>}
    </>
  )
}

function renderWith(auth: AuthRepository) {
  return render(
    <SessionProvider repository={auth}>
      <Probe />
    </SessionProvider>,
  )
}

describe('SessionProvider', () => {
  it('shows the signed-in account once the session is read', async () => {
    renderWith(stubAuth(() => Promise.resolve(signedIn)))
    expect(await screen.findByText(account.email)).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('shows signed out when the read finds no session', async () => {
    renderWith(stubAuth(() => Promise.resolve(null)))
    expect(await screen.findByText('signed out')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('shows signed out instead of a blank page when the read fails', async () => {
    renderWith(stubAuth(() => Promise.reject(new AuthError('network'))))
    expect(await screen.findByText('signed out')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('ignores a late answer from a repository it no longer uses', async () => {
    let answerOld: (current: Session | null) => void = () => {}
    const old = new Promise<Session | null>((resolve) => {
      answerOld = resolve
    })
    const { rerender } = renderWith(stubAuth(() => old))
    rerender(
      <SessionProvider repository={stubAuth(() => Promise.resolve(null))}>
        <Probe />
      </SessionProvider>,
    )
    expect(await screen.findByText('signed out')).toBeInTheDocument()
    await act(async () => answerOld(signedIn))
    expect(screen.getByText('signed out')).toBeInTheDocument()
    expect(screen.queryByText(account.email)).not.toBeInTheDocument()
  })
})
