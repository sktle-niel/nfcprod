import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Order } from '@/entities/order/order'
import { LAHUG_PIN } from '@/test/orders'
import { httpOrders, OrderError, type OrderFailure } from './orders'

const ENDPOINT = 'https://orders.example.test/v1/orders'

const order: Order = {
  items: [{ platform: 'google', quantity: 2 }],
  fullName: 'Juan Dela Cruz',
  phone: '+639171234567',
  province: 'Cebu',
  city: 'Cebu City',
  barangay: 'Lahug',
  street: '12 Salinas Drive',
  landmark: 'Blue gate beside the 7-Eleven, 2nd house',
  pin: LAHUG_PIN,
  consent: true,
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ reference: 'NFC-7K2M9Q' }), { status: 201 }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** The request the server saw: where it went, and the body parsed back. */
function sent() {
  const [url, init] = fetchMock.mock.calls[0] ?? []
  return { url: String(url), init, body: JSON.parse(String(init?.body)) as Record<string, unknown> }
}

describe('httpOrders', () => {
  it('sends the order, with its pin, in the JSON body', async () => {
    await httpOrders(ENDPOINT).submit(order)

    const { url, init, body } = sent()
    expect(url).toBe(ENDPOINT)
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(body).toEqual(order)
    expect(body.pin).toEqual({ lat: 10.328, lng: 123.906 })
  })

  it('keeps the coordinates out of the address, the headers and the cookies', async () => {
    await httpOrders(ENDPOINT).submit(order)

    const { url, init } = sent()
    expect(url).not.toMatch(/10\.328|123\.906/)
    expect(JSON.stringify(init?.headers)).not.toMatch(/10\.328|123\.906/)
    expect(init?.credentials).toBe('omit')
    expect(init?.referrerPolicy).toBe('no-referrer')
  })

  it('sends no pin at all for an order placed while the map could not load', async () => {
    const { pin: _pin, ...withoutPin } = order
    await httpOrders(ENDPOINT).submit(withoutPin)

    const { body } = sent()
    expect('pin' in body).toBe(false)
    expect(body).toEqual(withoutPin)
  })

  it('returns the reference the server gave', async () => {
    expect(await httpOrders(ENDPOINT).submit(order)).toEqual({ reference: 'NFC-7K2M9Q', demo: false })
  })

  it.each<[string, OrderFailure, Response]>([
    ['too many orders', 'rateLimited', new Response('slow down', { status: 429 })],
    ['a refusal', 'rejected', new Response('no', { status: 422 })],
    ['a server error', 'rejected', new Response('oops', { status: 500 })],
    ['an answer that is not JSON', 'network', new Response('<html></html>', { status: 200 })],
    ['an answer without a reference', 'rejected', new Response('{"ok":true}', { status: 200 })],
  ])('reports %s as %s', async (_, code, response) => {
    fetchMock.mockResolvedValue(response)
    await expect(httpOrders(ENDPOINT).submit(order)).rejects.toMatchObject({ code })
  })

  it('reports a request that never arrived as a network problem', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const failure = await httpOrders(ENDPOINT).submit(order).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(OrderError)
    expect(failure).toMatchObject({ code: 'network' })
  })
})
