import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SlugStatus } from '@/entities/business/business'
import { SLUG_DEBOUNCE_MS, useSlugCheck } from './useSlugCheck'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function setup(answer: SlugStatus | Error = 'available') {
  const check = vi.fn((_slug: string) => (answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer)))
  const hook = renderHook(({ slug }) => useSlugCheck(slug, 'kape-kanto', check), { initialProps: { slug: 'kape-kanto' } })
  const type = async (slug: string) => {
    hook.rerender({ slug })
    await act(async () => {})
  }
  const wait = (ms: number) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  return { check, hook, type, wait }
}

describe('useSlugCheck', () => {
  it('knows the current link and an empty field without asking', async () => {
    const { check, hook, type, wait } = setup()
    expect(hook.result.current).toBe('yours')
    await type('')
    expect(hook.result.current).toBe('idle')
    await wait(1000)
    expect(check).not.toHaveBeenCalled()
  })

  it('refuses a badly formed or reserved link at once, without asking', async () => {
    const { check, hook, type, wait } = setup()
    await type('Bad Link!')
    expect(hook.result.current).toBe('invalid')
    await type('ab')
    expect(hook.result.current).toBe('invalid')
    await type('dashboard')
    expect(hook.result.current).toBe('reserved')
    await wait(1000)
    expect(check).not.toHaveBeenCalled()
  })

  it('waits for the debounce, then asks once and gives the answer', async () => {
    const { check, hook, type, wait } = setup('taken')
    await type('cafe-luna')
    expect(hook.result.current).toBe('checking')
    await wait(SLUG_DEBOUNCE_MS - 1)
    expect(check).not.toHaveBeenCalled()
    await wait(1)
    expect(check).toHaveBeenCalledTimes(1)
    expect(check).toHaveBeenCalledWith('cafe-luna')
    expect(hook.result.current).toBe('taken')
  })

  it('asks only for the last link when the owner keeps typing', async () => {
    const { check, hook, type, wait } = setup()
    await type('new-l')
    await wait(200)
    await type('new-li')
    await wait(200)
    await type('new-link')
    await wait(SLUG_DEBOUNCE_MS)
    expect(check).toHaveBeenCalledTimes(1)
    expect(check).toHaveBeenCalledWith('new-link')
    expect(hook.result.current).toBe('available')
  })

  it('drops an answer for a link that is no longer typed', async () => {
    let release: (status: SlugStatus) => void = () => {}
    const check = vi.fn(() => new Promise<SlugStatus>((resolve) => (release = resolve)))
    const hook = renderHook(({ slug }) => useSlugCheck(slug, 'kape-kanto', check), { initialProps: { slug: 'first-one' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SLUG_DEBOUNCE_MS)
    })
    hook.rerender({ slug: 'second-one' })
    await act(async () => release('available'))
    expect(hook.result.current).toBe('checking')
  })

  it('says it failed when the check could not be made', async () => {
    const { hook, type, wait } = setup(new Error('offline'))
    await type('new-link')
    await wait(SLUG_DEBOUNCE_MS)
    expect(hook.result.current).toBe('failed')
  })

  it('asks again for the same link when the attempt number changes, and says checking meanwhile', async () => {
    let fail = true
    const check = vi.fn(() => (fail ? Promise.reject(new Error('offline')) : Promise.resolve<SlugStatus>('available')))
    const hook = renderHook(({ attempt }) => useSlugCheck('new-link', 'kape-kanto', check, { attempt }), { initialProps: { attempt: 0 } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SLUG_DEBOUNCE_MS)
    })
    expect(hook.result.current).toBe('failed')
    fail = false
    hook.rerender({ attempt: 1 })
    expect(hook.result.current).toBe('checking')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SLUG_DEBOUNCE_MS)
    })
    expect(check).toHaveBeenCalledTimes(2)
    expect(hook.result.current).toBe('available')
  })
})
