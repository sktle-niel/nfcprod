import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useResource } from './useResource'

type Pair = { a: number; b: number }

/** A load whose answers the test hands out one by one. */
function controlled<T>() {
  const pending: { resolve: (value: T) => void; reject: (error: Error) => void }[] = []
  const load = () => new Promise<T>((resolve, reject) => pending.push({ resolve, reject }))
  return { load, pending }
}

const zero = () => Promise.resolve<Pair>({ a: 0, b: 0 })

describe('useResource', () => {
  it('builds each function given to replace on the newest value, also when two land before a render', async () => {
    const { result } = renderHook(() => useResource(zero))
    await waitFor(() => expect(result.current.resource.status).toBe('ready'))

    act(() => {
      result.current.replace((current) => ({ ...current, a: 1 }))
      result.current.replace((current) => ({ ...current, b: 2 }))
    })

    expect(result.current.resource).toEqual({ status: 'ready', value: { a: 1, b: 2 } })
  })

  it('still takes a plain value', async () => {
    const { result } = renderHook(() => useResource(zero))
    await waitFor(() => expect(result.current.resource.status).toBe('ready'))
    act(() => result.current.replace({ a: 5, b: 6 }))
    expect(result.current.resource).toEqual({ status: 'ready', value: { a: 5, b: 6 } })
  })

  it('drops a function given by a replace from before a retry, so an old reply never lands on the new load', async () => {
    const { load, pending } = controlled<Pair>()
    const { result } = renderHook(() => useResource(load))
    act(() => pending[0]?.resolve({ a: 0, b: 0 }))
    await waitFor(() => expect(result.current.resource.status).toBe('ready'))
    const old = result.current.replace

    act(() => result.current.retry())
    act(() => pending[1]?.resolve({ a: 9, b: 9 }))
    await waitFor(() => expect(result.current.resource.status).toBe('ready'))
    act(() => old((current) => ({ ...current, a: 1 })))

    expect(result.current.resource).toEqual({ status: 'ready', value: { a: 9, b: 9 } })
  })

  it('does nothing with a function while nothing is loaded', () => {
    const { load } = controlled<Pair>()
    const { result } = renderHook(() => useResource(load))
    act(() => result.current.replace((current) => ({ ...current, a: 1 })))
    expect(result.current.resource.status).toBe('loading')
  })

  it('says it is retrying from the press of Retry after a failure until the answer is in', async () => {
    const { load, pending } = controlled<Pair>()
    const { result } = renderHook(() => useResource(load))
    expect(result.current.retrying).toBe(false)
    act(() => pending[0]?.reject(new Error('down')))
    await waitFor(() => expect(result.current.resource.status).toBe('error'))
    expect(result.current.retrying).toBe(false)

    act(() => result.current.retry())
    expect(result.current.resource.status).toBe('loading')
    expect(result.current.retrying).toBe(true)

    act(() => pending[1]?.reject(new Error('down again')))
    await waitFor(() => expect(result.current.resource.status).toBe('error'))
    expect(result.current.retrying).toBe(false)

    act(() => result.current.retry())
    act(() => pending[2]?.resolve({ a: 1, b: 1 }))
    await waitFor(() => expect(result.current.resource.status).toBe('ready'))
    expect(result.current.retrying).toBe(false)
  })
})
