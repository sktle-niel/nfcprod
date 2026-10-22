import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAsyncAction } from './useAsyncAction'

function deferred<Value>() {
  let resolve!: (value: Value) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<Value>((ok, fail) => {
    resolve = ok
    reject = fail
  })
  return { promise, resolve, reject }
}

describe('useAsyncAction', () => {
  it('is busy while the work runs and gives back its value', async () => {
    const { result } = renderHook(() => useAsyncAction())
    const work = deferred<number>()
    let outcome: Awaited<ReturnType<typeof result.current.run<number>>> | undefined
    act(() => {
      void result.current.run(() => work.promise).then((value) => {
        outcome = value
      })
    })
    expect(result.current.busy).toBe(true)

    await act(async () => work.resolve(7))
    expect(result.current.busy).toBe(false)
    expect(outcome).toEqual({ ok: true, value: 7 })
    expect(result.current.failed).toBe(false)
  })

  it('does not throw when the work fails: it gives the failure back and keeps it until the next run', async () => {
    const { result } = renderHook(() => useAsyncAction())
    const failure = new Error('nope')
    let outcome: Awaited<ReturnType<typeof result.current.run<void>>> | undefined
    await act(async () => {
      outcome = await result.current.run(() => Promise.reject(failure))
    })
    expect(outcome).toEqual({ ok: false, error: failure })
    expect(result.current.error).toBe(failure)
    expect(result.current.failed).toBe(true)

    await act(async () => {
      await result.current.run(() => Promise.resolve())
    })
    expect(result.current.failed).toBe(false)
  })

  it('stays busy until the last of two overlapping runs is done, and can forget a failure', async () => {
    const { result } = renderHook(() => useAsyncAction())
    const first = deferred<void>()
    const second = deferred<void>()
    act(() => {
      void result.current.run(() => first.promise)
      void result.current.run(() => second.promise)
    })
    await act(async () => first.resolve())
    expect(result.current.busy).toBe(true)
    await act(async () => second.resolve())
    expect(result.current.busy).toBe(false)

    await act(async () => {
      await result.current.run(() => Promise.reject(new Error('x')))
    })
    act(() => result.current.clear())
    expect(result.current.failed).toBe(false)
  })
})
