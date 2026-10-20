import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { geocoderUrl, OSM_GEOCODER } from '@/config/map'
import type { AddressHint } from '@/entities/location/match'
import type { Pin } from '@/entities/location/pin'
import { GeocoderError, nominatimGeocoder, type ReverseGeocoder } from './geocoder'

const BASE = 'https://nominatim.test'
const LAHUG: Pin = { lat: 10.328, lng: 123.906 }
const MAKATI: Pin = { lat: 14.5547, lng: 121.0244 }
const GAP = 1100
const COOLDOWN = 30_000

// What Nominatim answered for the IT Park in Lahug, and the hint we make of it.
const LAHUG_ANSWER = {
  display_name: 'Cebu I.T. Park, Kasambagan, Cebu City, Central Visayas, 6000, Philippines',
  address: {
    commercial: 'Cebu I.T. Park',
    suburb: 'Kasambagan',
    city: 'Cebu City',
    region: 'Central Visayas',
    'ISO3166-2-lvl3': 'PH-07',
    postcode: '6000',
    country: 'Philippines',
    country_code: 'ph',
  },
}
const LAHUG_HINT: AddressHint = {
  region: 'Central Visayas',
  isoRegion: 'PH-07',
  settlement: { name: 'Cebu City', kind: 'city' },
  areas: ['Kasambagan'],
}

const fetchMock = vi.fn<typeof fetch>()

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

/** The time each request started, in ms from the start of the test. */
const started: number[] = []
let zero = 0

/** Every request is answered with a fresh response (a body can be read once). */
function answerWith(make: () => Response | Promise<Response> = () => json(LAHUG_ANSWER)) {
  fetchMock.mockImplementation(async () => {
    started.push(Date.now() - zero)
    return make()
  })
}

beforeEach(() => {
  vi.useFakeTimers({ now: 5_000_000 })
  zero = Date.now()
  started.length = 0
  fetchMock.mockReset()
  answerWith()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const urls = () => fetchMock.mock.calls.map(([input]) => String(input))
const init = (call = 0) => fetchMock.mock.calls[call]?.[1]

/** Lets the clock run until nothing is waiting, so a queued call comes up without counting the waits by hand. */
async function settled<T>(promise: Promise<T>): Promise<T> {
  const watched = promise.then(
    () => undefined,
    () => undefined,
  )
  await vi.runAllTimersAsync()
  await watched
  return promise
}

/** A spot `step` meters or so from Lahug: every one has its own key and its own request. */
const spot = (step: number): Pin => ({ lat: 10 + step * 0.0001, lng: 123.9 })

describe('GeocoderError', () => {
  it('is an Error with the reason', () => {
    const error = new GeocoderError('busy')
    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe('busy')
    expect(error.message).toBe('busy')
  })
})

describe('reverse', () => {
  it('asks for the address of the spot, once, with the options the service documents', async () => {
    const geocoder = nominatimGeocoder(BASE)
    await geocoder.reverse(LAHUG)
    expect(urls()).toEqual([`${BASE}/reverse?format=jsonv2&lat=10.32800&lon=123.90600&zoom=18&addressdetails=1&accept-language=en`])
  })

  it('writes the spot with five decimals, rounded, from numbers only', async () => {
    const geocoder = nominatimGeocoder(BASE)
    await geocoder.reverse({ lat: 10.3280553, lng: 123.9059107 })
    await settled(geocoder.reverse({ lat: 7.5, lng: 125 }))
    expect(urls()).toEqual([
      `${BASE}/reverse?format=jsonv2&lat=10.32806&lon=123.90591&zoom=18&addressdetails=1&accept-language=en`,
      `${BASE}/reverse?format=jsonv2&lat=7.50000&lon=125.00000&zoom=18&addressdetails=1&accept-language=en`,
    ])
  })

  it('sends no cookies, our origin as the referrer, and no header that would need a preflight', async () => {
    await nominatimGeocoder(BASE).reverse(LAHUG)
    const options = init()
    expect(options).toMatchObject({
      credentials: 'omit',
      referrerPolicy: 'strict-origin',
      headers: { Accept: 'application/json' },
    })
    expect(Object.keys(options ?? {}).sort()).toEqual(['credentials', 'headers', 'referrerPolicy', 'signal'])
    expect(options?.signal).toBeInstanceOf(AbortSignal)
  })

  it('turns the answer into a hint', async () => {
    await expect(nominatimGeocoder(BASE).reverse(LAHUG)).resolves.toEqual(LAHUG_HINT)
  })

  it('copes with slashes at the end of the base address', async () => {
    await nominatimGeocoder(`${BASE}///`).reverse(LAHUG)
    expect(urls()[0]).toMatch(/^https:\/\/nominatim\.test\/reverse\?/)
  })

  it('uses the public OpenStreetMap service when it is not told where to go', async () => {
    await nominatimGeocoder().reverse(LAHUG)
    expect(urls()[0]).toMatch(new RegExp(`^${OSM_GEOCODER.replace(/\./g, '\\.')}/reverse\\?`))
  })

  it('sends nothing until it is asked', () => {
    nominatimGeocoder(BASE)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  describe('a spot with no address', () => {
    it('is a hint with nothing in it, not a failure', async () => {
      answerWith(() => json({ error: 'Unable to geocode' }))
      await expect(nominatimGeocoder(BASE).reverse(LAHUG)).resolves.toEqual({ areas: [] })
    })

    it('is remembered', async () => {
      answerWith(() => json({ error: 'Unable to geocode' }))
      const geocoder = nominatimGeocoder(BASE)
      await geocoder.reverse(LAHUG)
      await geocoder.reverse(LAHUG)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('a spot in another country', () => {
    const SANDAKAN = { address: { country_code: 'my', city: 'Sandakan' } }

    it('is rejected as outside', async () => {
      answerWith(() => json(SANDAKAN))
      await expect(nominatimGeocoder(BASE).reverse(LAHUG)).rejects.toMatchObject({ code: 'outside' })
    })

    it('is not remembered as an address', async () => {
      answerWith(() => json(SANDAKAN))
      const geocoder = nominatimGeocoder(BASE)
      await expect(geocoder.reverse(LAHUG)).rejects.toBeInstanceOf(GeocoderError)
      answerWith()
      await expect(settled(geocoder.reverse(LAHUG))).resolves.toEqual(LAHUG_HINT)
    })
  })

  describe('a pin that cannot be in the Philippines', () => {
    it.each([
      ['the null island', { lat: 0, lng: 0 }],
      ['Singapore', { lat: 1.35, lng: 103.82 }],
      ['a flipped sign', { lat: 14.6, lng: -121 }],
      ['not a number', { lat: Number.NaN, lng: 121 }],
      ['infinity', { lat: 12, lng: Number.POSITIVE_INFINITY }],
    ])('is outside, and nothing is sent (%s)', async (_, pin) => {
      await expect(nominatimGeocoder(BASE).reverse(pin)).rejects.toMatchObject({ code: 'outside' })
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('when the service does not give an answer', () => {
    it.each([429, 403, 500, 502, 503, 504])('says it is busy for a %i', async (status) => {
      answerWith(() => json({ error: 'x' }, status))
      await expect(nominatimGeocoder(BASE).reverse(LAHUG)).rejects.toMatchObject({ code: 'busy' })
    })

    it.each([400, 401, 404, 408, 418])('says it is unavailable for a %i', async (status) => {
      answerWith(() => json({ error: 'x' }, status))
      await expect(nominatimGeocoder(BASE).reverse(LAHUG)).rejects.toMatchObject({ code: 'unavailable' })
    })

    it('says it is unavailable when the network is down', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
      await expect(nominatimGeocoder(BASE).reverse(LAHUG)).rejects.toMatchObject({ code: 'unavailable' })
    })

    it.each([
      ['is not JSON', () => new Response('<html>Bad gateway</html>', { status: 200 })],
      ['is empty', () => new Response('', { status: 200 })],
      ['is a list', () => json([LAHUG_ANSWER])],
      ['is text', () => json('hello')],
      ['has no address', () => json({ place_id: 1 })],
      ['has an address that is not an object', () => json({ address: 'Cebu City' })],
      ['is far too large', () => new Response(' '.repeat(100_001), { status: 200 })],
    ])('says it is unavailable when the answer %s', async (_, make) => {
      answerWith(make)
      await expect(nominatimGeocoder(BASE).reverse(LAHUG)).rejects.toMatchObject({ code: 'unavailable' })
    })

    it('never gives anything but a GeocoderError for a failure of the service', async () => {
      answerWith(() => new Response('oops', { status: 200 }))
      await expect(nominatimGeocoder(BASE).reverse(LAHUG)).rejects.toBeInstanceOf(GeocoderError)
    })

    it.each([
      ['unavailable', 404, 0],
      ['busy', 503, COOLDOWN],
    ])('does not remember a failure (%s), so asking again, once the pause is over, tries again', async (code, status, pause) => {
      const geocoder = nominatimGeocoder(BASE)
      answerWith(() => json({}, status))
      await expect(geocoder.reverse(LAHUG)).rejects.toMatchObject({ code })
      answerWith()
      await vi.advanceTimersByTimeAsync(pause)
      await expect(settled(geocoder.reverse(LAHUG))).resolves.toEqual(LAHUG_HINT)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    describe('and does not answer at all', () => {
      function hang() {
        fetchMock.mockImplementation(
          (_, options) =>
            new Promise<Response>((_resolve, reject) => {
              options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
            }),
        )
      }

      it('gives up after 10 seconds, not before', async () => {
        hang()
        const result = nominatimGeocoder(BASE).reverse(LAHUG)
        const rejected = expect(result).rejects.toMatchObject({ code: 'unavailable' })
        await vi.advanceTimersByTimeAsync(9_999)
        expect(init()?.signal?.aborted).toBe(false)
        await vi.advanceTimersByTimeAsync(1)
        expect(init()?.signal?.aborted).toBe(true)
        await rejected
      })

      it('keeps no timer after it gave up', async () => {
        hang()
        const result = nominatimGeocoder(BASE).reverse(LAHUG)
        const rejected = expect(result).rejects.toBeDefined()
        await vi.advanceTimersByTimeAsync(10_000)
        await rejected
        expect(vi.getTimerCount()).toBe(0)
      })

      it('lets the next call go out on time', async () => {
        const geocoder = nominatimGeocoder(BASE)
        hang()
        const first = expect(geocoder.reverse(LAHUG)).rejects.toBeDefined()
        await vi.advanceTimersByTimeAsync(10_000)
        await first
        answerWith()
        await expect(geocoder.reverse(MAKATI)).resolves.toEqual(LAHUG_HINT)
      })
    })
  })

  describe('the queue', () => {
    it('starts two requests at least 1.1 seconds apart', async () => {
      const geocoder = nominatimGeocoder(BASE)
      const first = geocoder.reverse(spot(1))
      const second = geocoder.reverse(spot(2))
      await vi.advanceTimersByTimeAsync(0)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(GAP - 1)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(1)
      expect(fetchMock).toHaveBeenCalledTimes(2)
      await Promise.all([first, second])
      expect(started).toEqual([0, GAP])
    })

    it('spaces out a burst of calls and answers every one, in order', async () => {
      const geocoder = nominatimGeocoder(BASE)
      const results = [1, 2, 3, 4].map((step) => geocoder.reverse(spot(step)))
      await settled(Promise.all(results))
      expect(started).toEqual([0, GAP, GAP * 2, GAP * 3])
      expect(urls().map((url) => url.match(/lat=([\d.]+)/)?.[1])).toEqual(['10.00010', '10.00020', '10.00030', '10.00040'])
    })

    it('starts at once when the last request was a while ago', async () => {
      const geocoder = nominatimGeocoder(BASE)
      await geocoder.reverse(spot(1))
      await vi.advanceTimersByTimeAsync(5_000)
      await geocoder.reverse(spot(2))
      expect(started).toEqual([0, 5_000])
    })

    it('is one queue for addresses and for searches', async () => {
      const geocoder = nominatimGeocoder(BASE)
      answerWith(() => json([]))
      const search = geocoder.search('lahug')
      const reverse = geocoder.reverse(spot(1))
      await settled(Promise.all([search, reverse].map((promise) => promise.catch(() => undefined))))
      expect(urls().map((url) => url.split('?')[0])).toEqual([`${BASE}/search`, `${BASE}/reverse`])
      expect(started).toEqual([0, GAP])
    })

    it('does not send a call that was aborted before its turn, and does not wait for it either', async () => {
      const geocoder = nominatimGeocoder(BASE)
      const first = geocoder.reverse(spot(1))
      const controller = new AbortController()
      const second = geocoder.reverse(spot(2), controller.signal)
      const secondRejected = expect(second).rejects.toMatchObject({ name: 'AbortError' })
      const third = geocoder.reverse(spot(3))
      controller.abort()
      await secondRejected
      await settled(Promise.all([first, third]))
      expect(started).toEqual([0, GAP])
      expect(urls().some((url) => url.includes('lat=10.00020'))).toBe(false)
    })

    it('rejects at once, and sends nothing, for a signal that is aborted already', async () => {
      const controller = new AbortController()
      controller.abort()
      await expect(nominatimGeocoder(BASE).reverse(LAHUG, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
      await expect(nominatimGeocoder(BASE).search('lahug', controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('rejects with the reason of the abort', async () => {
      const controller = new AbortController()
      const reason = new Error('a newer pin')
      controller.abort(reason)
      await expect(nominatimGeocoder(BASE).reverse(LAHUG, controller.signal)).rejects.toBe(reason)
    })

    describe('when a request is aborted on its way', () => {
      /** A service that answers only when told to. */
      function slow() {
        const pending: ((response: Response) => void)[] = []
        fetchMock.mockImplementation(
          (_, options) =>
            new Promise<Response>((resolve, reject) => {
              started.push(Date.now() - zero)
              pending.push(resolve)
              options?.signal?.addEventListener('abort', () => reject(options.signal?.reason))
            }),
        )
        return pending
      }

      it('rejects with the abort and aborts the request', async () => {
        slow()
        const controller = new AbortController()
        const result = expect(nominatimGeocoder(BASE).reverse(LAHUG, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
        await vi.advanceTimersByTimeAsync(300)
        controller.abort()
        await result
        expect(init()?.signal?.aborted).toBe(true)
      })

      it('does not hold up the queue: the next call goes out when it was due', async () => {
        const pending = slow()
        const geocoder = nominatimGeocoder(BASE)
        const controller = new AbortController()
        const first = expect(geocoder.reverse(spot(1), controller.signal)).rejects.toBeDefined()
        const second = geocoder.reverse(spot(2))
        await vi.advanceTimersByTimeAsync(300)
        controller.abort()
        await first
        await vi.advanceTimersByTimeAsync(GAP)
        expect(started).toEqual([0, GAP])
        pending[1]?.(json(LAHUG_ANSWER))
        await expect(second).resolves.toEqual(LAHUG_HINT)
      })

      it('does not remember the answer that never came', async () => {
        const geocoder = nominatimGeocoder(BASE)
        slow()
        const controller = new AbortController()
        const first = expect(geocoder.reverse(LAHUG, controller.signal)).rejects.toBeDefined()
        await vi.advanceTimersByTimeAsync(0)
        expect(fetchMock).toHaveBeenCalledTimes(1)
        controller.abort()
        await first
        answerWith()
        await expect(settled(geocoder.reverse(LAHUG))).resolves.toEqual(LAHUG_HINT)
        expect(fetchMock).toHaveBeenCalledTimes(2)
      })

      it('lets go of the signal once it has an answer', async () => {
        const controller = new AbortController()
        const add = vi.spyOn(controller.signal, 'addEventListener')
        const remove = vi.spyOn(controller.signal, 'removeEventListener')
        await nominatimGeocoder(BASE).reverse(LAHUG, controller.signal)

        // Every listener put on the signal is taken off again by the same function. Checking only that something was
        // taken off is not enough: the queue removes its own listener, and that alone would satisfy it.
        const added = add.mock.calls.map(([, listener]) => listener)
        const removed = remove.mock.calls.map(([, listener]) => listener)
        expect(added.length).toBeGreaterThan(0)
        for (const listener of added) expect(removed).toContain(listener)

        controller.abort()
        expect(vi.getTimerCount()).toBe(0)
      })
    })
  })

  describe('the memory', () => {
    it('asks once for the same spot', async () => {
      const geocoder = nominatimGeocoder(BASE)
      const first = await geocoder.reverse(LAHUG)
      const second = await geocoder.reverse(LAHUG)
      expect(second).toEqual(first)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('answers from memory at once, without waiting in the queue', async () => {
      const geocoder = nominatimGeocoder(BASE)
      await geocoder.reverse(LAHUG)
      await expect(geocoder.reverse(LAHUG)).resolves.toEqual(LAHUG_HINT)
      expect(vi.getTimerCount()).toBe(0)
    })

    it('treats spots less than a meter apart as one spot, and a meter apart as two', async () => {
      const geocoder = nominatimGeocoder(BASE)
      await geocoder.reverse({ lat: 10.328001, lng: 123.906 })
      await geocoder.reverse({ lat: 10.3280049, lng: 123.9060049 })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      await settled(geocoder.reverse({ lat: 10.32801, lng: 123.906 }))
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('keeps the answers of one geocoder apart from another', async () => {
      await nominatimGeocoder(BASE).reverse(LAHUG)
      await nominatimGeocoder(BASE).reverse(LAHUG)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('gives a copy, so changing an answer does not change the next one', async () => {
      const geocoder = nominatimGeocoder(BASE)
      const first = await geocoder.reverse(LAHUG)
      first.areas.push('Tampered')
      if (first.settlement) first.settlement.name = 'Elsewhere'
      first.state = 'Nowhere'
      const second = await geocoder.reverse(LAHUG)
      expect(second).toEqual(LAHUG_HINT)
      expect(second).not.toBe(first)
    })

    it('gives a copy also when the answer comes from memory', async () => {
      const geocoder = nominatimGeocoder(BASE)
      await geocoder.reverse(LAHUG)
      const fromMemory = await geocoder.reverse(LAHUG)
      fromMemory.areas.push('Tampered')
      if (fromMemory.settlement) fromMemory.settlement.name = 'Elsewhere'
      fromMemory.state = 'Nowhere'
      await expect(geocoder.reverse(LAHUG)).resolves.toEqual(LAHUG_HINT)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('keeps the newest 100 answers and lets the oldest go', async () => {
      const geocoder = nominatimGeocoder(BASE)
      for (let step = 1; step <= 101; step++) await settled(geocoder.reverse(spot(step)))
      expect(fetchMock).toHaveBeenCalledTimes(101)

      // The newest is still there. The very first is not.
      await geocoder.reverse(spot(101))
      expect(fetchMock).toHaveBeenCalledTimes(101)
      await settled(geocoder.reverse(spot(1)))
      expect(fetchMock).toHaveBeenCalledTimes(102)
      // Spot 2 went out to make room for spot 1 coming back.
      await settled(geocoder.reverse(spot(2)))
      expect(fetchMock).toHaveBeenCalledTimes(103)
    })
  })
})

describe('search', () => {
  const NOMINATIM_HITS = [
    { place_id: 1, display_name: 'Lahug, Cebu City, Central Visayas, 6000, Philippines', lat: '10.3280553', lon: '123.9059107', importance: 0.4 },
    { place_id: 2, display_name: 'Lahug, Kalibo, Aklan, Western Visayas, Philippines', lat: '11.7', lon: '122.3', importance: 0.2 },
  ]

  beforeEach(() => {
    answerWith(() => json(NOMINATIM_HITS))
  })

  it('asks for places in the Philippines, at most five, with the options the service documents', async () => {
    await nominatimGeocoder(BASE).search('Lahug Cebu')
    expect(urls()).toEqual([
      `${BASE}/search?format=jsonv2&q=Lahug%20Cebu&countrycodes=ph&limit=5&addressdetails=0&accept-language=en`,
    ])
    expect(init()).toMatchObject({ credentials: 'omit', referrerPolicy: 'strict-origin', headers: { Accept: 'application/json' } })
    expect(Object.keys(init() ?? {}).sort()).toEqual(['credentials', 'headers', 'referrerPolicy', 'signal'])
  })

  it('gives the places with a label and a spot', async () => {
    await expect(nominatimGeocoder(BASE).search('Lahug')).resolves.toEqual([
      { label: 'Lahug, Cebu City, Central Visayas, 6000, Philippines', pin: { lat: 10.32806, lng: 123.90591 } },
      { label: 'Lahug, Kalibo, Aklan, Western Visayas, Philippines', pin: { lat: 11.7, lng: 122.3 } },
    ])
  })

  it('gives an empty list when nothing was found', async () => {
    answerWith(() => json([]))
    await expect(nominatimGeocoder(BASE).search('Zzzzz')).resolves.toEqual([])
  })

  describe('the query', () => {
    it.each(['', ' ', 'a', 'ab', '  ab  ', ' a b'.slice(0, 2), '\t\n', '😀'])(
      'sends nothing for %j, which is shorter than 3 characters',
      async (query) => {
        await expect(nominatimGeocoder(BASE).search(query)).resolves.toEqual([])
        expect(fetchMock).not.toHaveBeenCalled()
      },
    )

    it('sends a query of exactly 3 characters', async () => {
      await nominatimGeocoder(BASE).search(' abc ')
      expect(urls()[0]).toContain('q=abc&')
    })

    it('trims it and tidies the spaces', async () => {
      await nominatimGeocoder(BASE).search('  Lahug \t  Cebu\n')
      expect(urls()[0]).toContain('q=Lahug%20Cebu&')
    })

    it('encodes it, so it cannot add or change a parameter', async () => {
      const query = 'Sta. Cruz & Co? #1=2/../x%00'
      await nominatimGeocoder(BASE).search(query)
      expect(urls()[0]).toContain(`q=${encodeURIComponent(query)}&`)
      const sent = new URL(urls()[0] ?? '').searchParams
      expect(sent.get('q')).toBe(query)
      expect([...sent.keys()]).toEqual(['format', 'q', 'countrycodes', 'limit', 'addressdetails', 'accept-language'])
    })

    it('cuts it to 100 characters', async () => {
      await nominatimGeocoder(BASE).search('x'.repeat(250))
      expect(new URL(urls()[0] ?? '').searchParams.get('q')).toBe('x'.repeat(100))
    })

    it('does not break a character in half when it cuts, and does not throw', async () => {
      await expect(nominatimGeocoder(BASE).search(`${'x'.repeat(99)}😀😀`)).resolves.toBeDefined()
      expect(new URL(urls()[0] ?? '').searchParams.get('q')).toBe(`${'x'.repeat(99)}😀`)
    })

    it('drops lone halves of a character, which a URL cannot hold', async () => {
      await expect(nominatimGeocoder(BASE).search('Lahug\ud83d Cebu\ude00')).resolves.toBeDefined()
      expect(new URL(urls()[0] ?? '').searchParams.get('q')).toBe('Lahug Cebu')
    })

    it('drops control characters', async () => {
      await nominatimGeocoder(BASE).search('Lahug\u0000\u0007Cebu')
      expect(new URL(urls()[0] ?? '').searchParams.get('q')).toBe('Lahug Cebu')
    })
  })

  describe('the memory', () => {
    it('asks once for the same query, whatever the case and the spaces', async () => {
      const geocoder = nominatimGeocoder(BASE)
      const first = await geocoder.search('Lahug Cebu')
      const second = await geocoder.search('  LAHUG   cebu ')
      expect(second).toEqual(first)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('asks again for another query', async () => {
      const geocoder = nominatimGeocoder(BASE)
      await geocoder.search('Lahug')
      await settled(geocoder.search('Mandaue'))
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('remembers that nothing was found', async () => {
      answerWith(() => json([]))
      const geocoder = nominatimGeocoder(BASE)
      await geocoder.search('Zzzzz')
      await geocoder.search('zzzzz')
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it.each([
      ['unavailable', 404, 0],
      ['busy', 429, COOLDOWN],
    ])('does not remember a failure (%s)', async (code, status, pause) => {
      const geocoder = nominatimGeocoder(BASE)
      answerWith(() => json({}, status))
      await expect(geocoder.search('Lahug')).rejects.toMatchObject({ code })
      answerWith(() => json(NOMINATIM_HITS))
      await vi.advanceTimersByTimeAsync(pause)
      await expect(settled(geocoder.search('Lahug'))).resolves.toHaveLength(2)
    })

    it('gives a copy', async () => {
      const geocoder = nominatimGeocoder(BASE)
      const first = await geocoder.search('Lahug')
      if (first[0]) first[0].pin.lat = 0
      first.pop()
      const second = await geocoder.search('Lahug')
      expect(second).toHaveLength(2)
      expect(second[0]?.pin.lat).toBe(10.32806)
    })

    it('gives a copy also when the answer comes from memory', async () => {
      const geocoder = nominatimGeocoder(BASE)
      await geocoder.search('Lahug')
      const fromMemory = await geocoder.search('Lahug')
      if (fromMemory[0]) {
        fromMemory[0].pin.lat = 0
        fromMemory[0].label = 'Tampered'
      }
      fromMemory.pop()
      const third = await geocoder.search('Lahug')
      expect(third).toHaveLength(2)
      expect(third[0]).toEqual({ label: 'Lahug, Cebu City, Central Visayas, 6000, Philippines', pin: { lat: 10.32806, lng: 123.90591 } })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('keeps the newest 100 queries and lets the oldest go', async () => {
      const geocoder = nominatimGeocoder(BASE)
      for (let number = 1; number <= 101; number++) await settled(geocoder.search(`place ${number}`))
      expect(fetchMock).toHaveBeenCalledTimes(101)
      await geocoder.search('place 101')
      expect(fetchMock).toHaveBeenCalledTimes(101)
      await settled(geocoder.search('place 1'))
      expect(fetchMock).toHaveBeenCalledTimes(102)
    })
  })

  describe('the answer', () => {
    it('keeps only places inside the Philippines, at most five', async () => {
      answerWith(() =>
        json([
          { display_name: 'Singapore', lat: '1.35', lon: '103.82' },
          ...Array.from({ length: 8 }, (_, index) => ({ display_name: `Place ${index}`, lat: '10.3', lon: '123.9' })),
        ]),
      )
      const hits = await nominatimGeocoder(BASE).search('place')
      expect(hits.map((hit) => hit.label)).toEqual(['Place 0', 'Place 1', 'Place 2', 'Place 3', 'Place 4'])
    })

    it('says it is unavailable when the answer is not a list', async () => {
      answerWith(() => json({ error: { code: 400 } }))
      await expect(nominatimGeocoder(BASE).search('Lahug')).rejects.toMatchObject({ code: 'unavailable' })
    })

    it.each([429, 403, 500, 503])('says it is busy for a %i', async (status) => {
      answerWith(() => json([], status))
      await expect(nominatimGeocoder(BASE).search('Lahug')).rejects.toMatchObject({ code: 'busy' })
    })

    it('says it is unavailable for a 400 and when the network is down', async () => {
      answerWith(() => json([], 400))
      await expect(nominatimGeocoder(BASE).search('Lahug')).rejects.toMatchObject({ code: 'unavailable' })
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
      await expect(settled(nominatimGeocoder(BASE).search('Lahug'))).rejects.toMatchObject({ code: 'unavailable' })
    })

    it('gives up after 10 seconds', async () => {
      fetchMock.mockImplementation(
        (_, options) =>
          new Promise<Response>((_resolve, reject) => {
            options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
          }),
      )
      const result = expect(nominatimGeocoder(BASE).search('Lahug')).rejects.toMatchObject({ code: 'unavailable' })
      await vi.advanceTimersByTimeAsync(10_000)
      await result
    })

    it('rejects with the abort when it is aborted on its way', async () => {
      fetchMock.mockImplementation(
        (_, options) =>
          new Promise<Response>((_resolve, reject) => {
            options?.signal?.addEventListener('abort', () => reject(options.signal?.reason))
          }),
      )
      const controller = new AbortController()
      const result = expect(nominatimGeocoder(BASE).search('Lahug', controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
      await vi.advanceTimersByTimeAsync(100)
      controller.abort()
      await result
    })
  })
})

describe('after a busy answer', () => {
  const PLACES = [{ display_name: 'Lahug, Cebu City, Central Visayas, Philippines', lat: '10.3', lon: '123.9' }]

  /** The service says it is busy to the first request, and answers well to the ones after it. */
  function busyOnce(status = 429) {
    let first = true
    answerWith(() => {
      if (!first) return json(LAHUG_ANSWER)
      first = false
      return json({ error: 'x' }, status)
    })
  }

  /** Whether every call has finished, without moving the clock: a call that waits in the queue has not. */
  async function finishedAtOnce(...calls: Promise<unknown>[]): Promise<boolean> {
    let open = calls.length
    const close = () => {
      open -= 1
    }
    for (const call of calls) call.then(close, close)
    await vi.advanceTimersByTimeAsync(0)
    return open === 0
  }

  it.each([429, 403, 500, 503])('sends nothing for 30 seconds after a %i, and says busy at once', async (status) => {
    const geocoder = nominatimGeocoder(BASE)
    busyOnce(status)
    await expect(geocoder.reverse(spot(1))).rejects.toMatchObject({ code: 'busy' })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const reverse = geocoder.reverse(spot(2))
    const search = geocoder.search('Lahug')
    expect(await finishedAtOnce(reverse, search)).toBe(true)
    await expect(reverse).rejects.toMatchObject({ code: 'busy' })
    await expect(search).rejects.toMatchObject({ code: 'busy' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('lets a request out again after exactly 30 seconds, and not a moment before', async () => {
    const geocoder = nominatimGeocoder(BASE)
    busyOnce()
    await expect(geocoder.reverse(spot(1))).rejects.toMatchObject({ code: 'busy' })

    await vi.advanceTimersByTimeAsync(COOLDOWN - 1)
    await expect(geocoder.reverse(spot(2))).rejects.toMatchObject({ code: 'busy' })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    await expect(geocoder.reverse(spot(2))).resolves.toEqual(LAHUG_HINT)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    // Everything is normal again, not just the one call.
    await expect(settled(geocoder.reverse(spot(3)))).resolves.toEqual(LAHUG_HINT)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('starts the 30 seconds again from a new busy answer', async () => {
    const geocoder = nominatimGeocoder(BASE)
    answerWith(() => json({ error: 'x' }, 429))
    await expect(geocoder.reverse(spot(1))).rejects.toMatchObject({ code: 'busy' })

    await vi.advanceTimersByTimeAsync(COOLDOWN)
    await expect(geocoder.reverse(spot(2))).rejects.toMatchObject({ code: 'busy' })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(COOLDOWN - 1)
    await expect(geocoder.reverse(spot(3))).rejects.toMatchObject({ code: 'busy' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    await expect(geocoder.reverse(spot(3))).rejects.toMatchObject({ code: 'busy' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('covers addresses and searches alike, whichever one was told', async () => {
    const asked = nominatimGeocoder(BASE)
    answerWith(() => json({ error: 'x' }, 429))
    await expect(asked.search('Lahug')).rejects.toMatchObject({ code: 'busy' })
    await expect(asked.reverse(spot(1))).rejects.toMatchObject({ code: 'busy' })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const searched = nominatimGeocoder(BASE)
    await expect(searched.reverse(spot(1))).rejects.toMatchObject({ code: 'busy' })
    await expect(searched.search('Mandaue')).rejects.toMatchObject({ code: 'busy' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not reach another geocoder', async () => {
    answerWith(() => json({ error: 'x' }, 429))
    await expect(nominatimGeocoder(BASE).reverse(spot(1))).rejects.toMatchObject({ code: 'busy' })
    answerWith()
    await expect(nominatimGeocoder('https://other.test').reverse(spot(2))).resolves.toEqual(LAHUG_HINT)
  })

  it('still gives the answers it remembers', async () => {
    const geocoder = nominatimGeocoder(BASE)
    answerWith(() => json(LAHUG_ANSWER))
    await geocoder.reverse(LAHUG)
    answerWith(() => json(PLACES))
    await settled(geocoder.search('Lahug'))
    expect(fetchMock).toHaveBeenCalledTimes(2)

    answerWith(() => json({ error: 'x' }, 429))
    await expect(settled(geocoder.reverse(spot(1)))).rejects.toMatchObject({ code: 'busy' })
    expect(fetchMock).toHaveBeenCalledTimes(3)

    await expect(geocoder.reverse(LAHUG)).resolves.toEqual(LAHUG_HINT)
    await expect(geocoder.search(' LAHUG ')).resolves.toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    // What is not remembered is still refused.
    await expect(geocoder.reverse(spot(2))).rejects.toMatchObject({ code: 'busy' })
  })

  it.each([
    ['a 404', () => json({ error: 'x' }, 404)],
    ['an answer that is not JSON', () => new Response('oops', { status: 200 })],
    ['a spot in another country', () => json({ address: { country_code: 'my' } })],
    ['a network that is down', () => Promise.reject(new TypeError('Failed to fetch'))],
  ])('is not started by %s', async (_, make) => {
    const geocoder = nominatimGeocoder(BASE)
    answerWith(make)
    await expect(geocoder.reverse(spot(1))).rejects.toBeInstanceOf(GeocoderError)
    answerWith()
    await expect(settled(geocoder.reverse(spot(2)))).resolves.toEqual(LAHUG_HINT)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('is not started by a service that does not answer in time', async () => {
    const geocoder = nominatimGeocoder(BASE)
    fetchMock.mockImplementation(
      (_, options) =>
        new Promise<Response>((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        }),
    )
    const timedOut = expect(geocoder.reverse(spot(1))).rejects.toMatchObject({ code: 'unavailable' })
    await vi.advanceTimersByTimeAsync(10_000)
    await timedOut

    answerWith()
    await expect(geocoder.reverse(spot(2))).resolves.toEqual(LAHUG_HINT)
  })

  it('refuses a call that was waiting for its turn when the busy answer came', async () => {
    const geocoder = nominatimGeocoder(BASE)
    let answer: (response: Response) => void = () => {}
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          answer = resolve
        }),
    )
    const first = expect(geocoder.reverse(spot(1))).rejects.toMatchObject({ code: 'busy' })
    const second = expect(geocoder.reverse(spot(2))).rejects.toMatchObject({ code: 'busy' })
    await vi.advanceTimersByTimeAsync(300)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    answer(json({ error: 'x' }, 429))
    await first
    // The second call's turn comes at 1.1 s. It must not go out.
    await vi.advanceTimersByTimeAsync(GAP)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await second
  })

  it('counts a busy answer also when the caller gave up just before it was read (a fetch that answers anyway)', async () => {
    const geocoder = nominatimGeocoder(BASE)
    const controller = new AbortController()
    fetchMock.mockImplementation(async () => {
      controller.abort()
      return json({ error: 'x' }, 429)
    })
    await expect(geocoder.reverse(spot(1), controller.signal)).rejects.toMatchObject({ name: 'AbortError' })

    answerWith()
    await expect(geocoder.reverse(spot(2))).rejects.toMatchObject({ code: 'busy' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not end early for a good answer that was already on its way', async () => {
    const geocoder = nominatimGeocoder(BASE)
    const answers: ((response: Response) => void)[] = []
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          answers.push(resolve)
        }),
    )
    const first = geocoder.reverse(spot(1))
    const second = geocoder.reverse(spot(2))
    await vi.advanceTimersByTimeAsync(GAP)
    expect(answers).toHaveLength(2)

    answers[0]?.(json({ error: 'x' }, 429))
    await expect(first).rejects.toMatchObject({ code: 'busy' })
    answers[1]?.(json(LAHUG_ANSWER))
    await expect(second).resolves.toEqual(LAHUG_HINT)

    await expect(geocoder.reverse(spot(3))).rejects.toMatchObject({ code: 'busy' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('counts the 30 seconds from the latest busy answer, when two requests were on their way', async () => {
    const geocoder = nominatimGeocoder(BASE)
    const answers: ((response: Response) => void)[] = []
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          answers.push(resolve)
        }),
    )
    const first = expect(geocoder.reverse(spot(1))).rejects.toMatchObject({ code: 'busy' })
    const second = expect(geocoder.reverse(spot(2))).rejects.toMatchObject({ code: 'busy' })
    await vi.advanceTimersByTimeAsync(GAP)
    expect(answers).toHaveLength(2)

    answers[0]?.(json({ error: 'x' }, 429))
    await first
    await vi.advanceTimersByTimeAsync(5_000)
    answers[1]?.(json({ error: 'x' }, 503))
    await second

    // 30 seconds after the first busy answer is not enough, 30 after the second is.
    await vi.advanceTimersByTimeAsync(COOLDOWN - 5_000)
    await expect(geocoder.reverse(spot(3))).rejects.toMatchObject({ code: 'busy' })
    await vi.advanceTimersByTimeAsync(5_000 - 1)
    await expect(geocoder.reverse(spot(3))).rejects.toMatchObject({ code: 'busy' })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(1)
    const third = expect(geocoder.reverse(spot(3))).resolves.toEqual(LAHUG_HINT)
    await vi.advanceTimersByTimeAsync(0)
    expect(answers).toHaveLength(3)
    answers[2]?.(json(LAHUG_ANSWER))
    await third
  })

  it('ends when the clock jumps back, instead of lasting for hours', async () => {
    const geocoder = nominatimGeocoder(BASE)
    busyOnce()
    const busyTime = Date.now()
    await expect(geocoder.reverse(spot(1))).rejects.toMatchObject({ code: 'busy' })

    vi.setSystemTime(busyTime - 3_600_000)
    await expect(settled(geocoder.reverse(spot(2)))).resolves.toEqual(LAHUG_HINT)
  })

  it.each([
    ['ran out', 31_000],
    ['was ended by a clock that jumped back', -3_600_000],
  ])('does not come back when the clock later moves into the 30 seconds of a cooldown that %s', async (_, move) => {
    const geocoder = nominatimGeocoder(BASE)
    busyOnce()
    const busyTime = Date.now()
    await expect(geocoder.reverse(spot(1))).rejects.toMatchObject({ code: 'busy' })

    vi.setSystemTime(busyTime + move)
    await expect(settled(geocoder.reverse(spot(2)))).resolves.toEqual(LAHUG_HINT)

    // The clock now reads 10 s after the busy answer. That answer is long over.
    vi.setSystemTime(busyTime + 10_000)
    await expect(settled(geocoder.reverse(spot(3)))).resolves.toEqual(LAHUG_HINT)
  })
})

describe('the geocoder of the app', () => {
  it('is made without sending anything, and goes to the address in the settings', async () => {
    vi.resetModules()
    const module = await import('./geocoder')
    expect(fetchMock).not.toHaveBeenCalled()

    const app: ReverseGeocoder = module.geocoder
    await app.reverse(LAHUG)
    expect(urls()[0]?.startsWith(`${geocoderUrl}/reverse?`)).toBe(true)
  })
})
