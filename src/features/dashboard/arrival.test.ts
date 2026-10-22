import { describe, expect, it } from 'vitest'
import { cameFromSetup, FROM_SETUP } from './arrival'

describe('cameFromSetup', () => {
  it('knows the state the wizard leaves', () => {
    expect(cameFromSetup(FROM_SETUP)).toBe(true)
  })

  it.each([null, undefined, 'fromSetup', 1, true, {}, { fromSetup: false }, { fromSetup: 'yes' }, [FROM_SETUP]])(
    'does not take %j for it',
    (state) => {
      expect(cameFromSetup(state)).toBe(false)
    },
  )
})
