import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SlugStatus } from '@/entities/business/business'
import { CHECK_DELAY_MS, useSlugStatus } from './useSlugStatus'

type Check = (slug: string) => Promise<SlugStatus>

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

/** Runs the timers and the answers that come after them. */
const settle = (ms = CHECK_DELAY_MS) => act(() => vi.advanceTimersByTimeAsync(ms))

describe('useSlugStatus', () => {
  it('judges a badly formed link on the spot, without a lookup', () => {
    const check = vi.fn<Check>()
    const { result, rerender } = renderHook(({ slug }) => useSlugStatus(slug, true, check), { initialProps: { slug: '' } })
    expect(result.current.state).toBe('empty')

    rerender({ slug: 'Bad_Slug' })
    expect(result.current.state).toBe('invalid')
    rerender({ slug: 'admin' })
    expect(result.current.state).toBe('reserved')
    expect(check).not.toHaveBeenCalled()
  })

  it('waits for a pause in typing, then asks once', async () => {
    const check = vi.fn<Check>().mockResolvedValue('available')
    const { result, rerender } = renderHook(({ slug }) => useSlugStatus(slug, true, check), { initialProps: { slug: 'kap' } })
    await settle(CHECK_DELAY_MS - 1)
    rerender({ slug: 'kape' })
    await settle(CHECK_DELAY_MS - 1)
    expect(result.current.state).toBe('checking')
    expect(check).not.toHaveBeenCalled()

    await settle(1)

    expect(check).toHaveBeenCalledExactlyOnceWith('kape')
    expect(result.current.state).toBe('available')
  })

  it('reads a link of the owner as free and any other answer as taken', async () => {
    const check = vi.fn<Check>().mockResolvedValue('yours')
    const { result, rerender } = renderHook(({ slug }) => useSlugStatus(slug, true, check), { initialProps: { slug: 'kape' } })
    await settle()
    expect(result.current.state).toBe('available')

    check.mockResolvedValue('taken')
    rerender({ slug: 'kapeng-barako' })
    await settle()
    expect(result.current.state).toBe('taken')
  })

  it('never uses the answer for an older link', async () => {
    let answer: (status: SlugStatus) => void = () => {}
    const check = vi.fn<Check>().mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)))
    const { result, rerender } = renderHook(({ slug }) => useSlugStatus(slug, true, check), { initialProps: { slug: 'first' } })
    await settle()

    rerender({ slug: 'second' })
    await act(async () => answer('available'))

    expect(result.current.state).toBe('checking')
  })

  it('does not look anything up while it is not active', async () => {
    const check = vi.fn<Check>().mockResolvedValue('available')
    renderHook(() => useSlugStatus('kape', false, check))

    await settle(CHECK_DELAY_MS * 2)

    expect(check).not.toHaveBeenCalled()
  })

  it('reports a failed lookup and asks again on retry', async () => {
    const check = vi.fn<Check>().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('available')
    const { result } = renderHook(() => useSlugStatus('kape', true, check))
    await settle()
    expect(result.current.state).toBe('failed')

    act(() => result.current.retry())
    expect(result.current.state).toBe('checking')
    await settle()

    expect(result.current.state).toBe('available')
    expect(check).toHaveBeenCalledTimes(2)
  })

  it('remembers a link the repository refused at creation as taken', async () => {
    const check = vi.fn<Check>().mockResolvedValue('available')
    const { result } = renderHook(() => useSlugStatus('kape', true, check))
    await settle()

    act(() => result.current.markTaken('kape'))

    expect(result.current.state).toBe('taken')
  })
})
