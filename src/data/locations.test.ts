import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocationError, psgcLocations } from './locations'

const BASE = 'https://psgc.test/api'

const CEBU = { code: '072200000', name: 'Cebu', regionCode: '070000000' }
const ILOCOS = { code: '012800000', name: 'Ilocos Norte', regionCode: '010000000' }
const BASILAN = '150700000'
const MAGUINDANAO = '153800000'
const ISABELA_CITY = { code: '099701000', name: 'City of Isabela', provinceCode: false }
const COTABATO_CITY = { code: '129804000', name: 'City of Cotabato', provinceCode: false }

const fetchMock = vi.fn<typeof fetch>()

/** Answers each path with JSON (or with the Response you give). Any other path is a 404. */
function serve(routes: Record<string, unknown>) {
  fetchMock.mockImplementation(async (input) => {
    const path = String(input).replace(BASE, '')
    if (!(path in routes)) return new Response('missing', { status: 404 })
    const body = routes[path]
    return body instanceof Response ? body : new Response(JSON.stringify(body), { status: 200 })
  })
}

const requested = () => fetchMock.mock.calls.map(([input]) => String(input).replace(BASE, ''))

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('provinces', () => {
  it('lists the provinces and Metro Manila, in order', async () => {
    serve({ '/provinces/': [CEBU, ILOCOS] })
    const places = await psgcLocations(BASE).provinces()
    expect(places).toEqual([
      { code: '072200000', name: 'Cebu' },
      { code: '012800000', name: 'Ilocos Norte' },
      { code: '130000000', name: 'Metro Manila' },
    ])
  })

  it('asks without cookies and without telling the host which page it came from', async () => {
    serve({ '/provinces/': [CEBU] })
    await psgcLocations(BASE).provinces()
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/provinces/`,
      expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }),
    )
  })

  it('copes with a slash at the end of the base address', async () => {
    serve({ '/provinces/': [CEBU] })
    await psgcLocations(`${BASE}///`).provinces()
    expect(requested()).toEqual(['/provinces/'])
  })
})

describe('cities', () => {
  it('lists the cities and municipalities of a province', async () => {
    serve({ '/provinces/072200000/cities-municipalities/': [{ code: '072217000', name: 'City of Cebu ' }, { code: '072201000', name: 'Alcantara' }] })
    const places = await psgcLocations(BASE).cities('072200000')
    expect(places.map((place) => place.name)).toEqual(['Alcantara', 'Cebu City'])
  })

  it('reads the cities of Metro Manila from its region, since it has no provinces', async () => {
    serve({ '/regions/130000000/cities-municipalities/': [{ code: '133900000', name: 'City of Manila' }] })
    const places = await psgcLocations(BASE).cities('130000000')
    expect(places).toEqual([{ code: '133900000', name: 'Manila City' }])
    expect(requested()).toEqual(['/regions/130000000/cities-municipalities/'])
  })

  it.each([
    [BASILAN, ISABELA_CITY, { code: '150702000', name: 'Lamitan City' }],
    [MAGUINDANAO, COTABATO_CITY, { code: '153801000', name: 'Ampatuan' }],
  ])('adds the city the API lists under no province (province %s)', async (province, city, other) => {
    serve({
      [`/provinces/${province}/cities-municipalities/`]: [other],
      [`/cities-municipalities/${city.code}/`]: city,
    })
    const places = await psgcLocations(BASE).cities(province)
    expect(places.map((place) => place.code).sort()).toEqual([other.code, city.code].sort())
  })

  it('does not list that city twice if the API starts to list it', async () => {
    serve({
      [`/provinces/${BASILAN}/cities-municipalities/`]: [{ code: ISABELA_CITY.code, name: 'City of Isabela' }],
      [`/cities-municipalities/${ISABELA_CITY.code}/`]: ISABELA_CITY,
    })
    expect(await psgcLocations(BASE).cities(BASILAN)).toHaveLength(1)
  })

  it('still lists the province when the extra city cannot be loaded', async () => {
    serve({ [`/provinces/${BASILAN}/cities-municipalities/`]: [{ code: '150702000', name: 'Lamitan City' }] })
    expect(await psgcLocations(BASE).cities(BASILAN)).toEqual([{ code: '150702000', name: 'Lamitan City' }])
  })
})

describe('barangays', () => {
  it('lists the barangays of a city, with the odd characters cleaned', async () => {
    serve({
      '/cities-municipalities/072217000/barangays/': [
        { code: '072217001', name: 'Adlaon' },
        { code: '072217002', name: 'Fuentes*' },
      ],
    })
    const places = await psgcLocations(BASE).barangays('072217000')
    expect(places.map((place) => place.name)).toEqual(['Adlaon', 'Fuentes'])
  })

  it.each(['', 'abc', '../admin', '072217000/../../x', '07221700', '072217000\n'])(
    'refuses the code %j and sends nothing',
    async (code) => {
      serve({})
      await expect(psgcLocations(BASE).barangays(code)).rejects.toBeInstanceOf(LocationError)
      await expect(psgcLocations(BASE).cities(code)).rejects.toBeInstanceOf(LocationError)
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )
})

describe('when the API misbehaves', () => {
  it.each([
    ['answers with an error', new Response('oops', { status: 500 })],
    ['answers with something that is not JSON', new Response('<html>Not a list</html>', { status: 200 })],
    ['answers with an object instead of a list', new Response('{"data":[]}', { status: 200 })],
    ['answers with a list of something else', new Response('[{"nombre":"Cebu"}]', { status: 200 })],
    ['answers with far too much', new Response(' '.repeat(1_000_001), { status: 200 })],
  ])('rejects when it %s', async (_, response) => {
    serve({ '/provinces/': response })
    await expect(psgcLocations(BASE).provinces()).rejects.toBeInstanceOf(LocationError)
  })

  it('rejects when the network is down', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(psgcLocations(BASE).provinces()).rejects.toBeInstanceOf(LocationError)
  })

  it('gives up on a request that never ends', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(
      (_, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        }),
    )
    const result = expect(psgcLocations(BASE).provinces()).rejects.toBeInstanceOf(LocationError)
    await vi.advanceTimersByTimeAsync(12_000)
    await result
  })
})

describe('caching', () => {
  const path = '/cities-municipalities/072217000/barangays/'
  const list = [{ code: '072217001', name: 'Adlaon' }]

  it('asks once for a list and remembers it', async () => {
    serve({ [path]: list })
    const repository = psgcLocations(BASE)
    await repository.barangays('072217000')
    await repository.barangays('072217000')
    expect(requested()).toEqual([path])
  })

  it('shares one request between callers that ask at the same time', async () => {
    serve({ [path]: list })
    const repository = psgcLocations(BASE)
    await Promise.all([repository.barangays('072217000'), repository.barangays('072217000')])
    expect(requested()).toEqual([path])
  })

  it('does not remember a failure, so asking again tries again', async () => {
    const repository = psgcLocations(BASE)
    serve({})
    await expect(repository.barangays('072217000')).rejects.toBeInstanceOf(LocationError)
    serve({ [path]: list })
    await expect(repository.barangays('072217000')).resolves.toEqual(list)
  })
})
