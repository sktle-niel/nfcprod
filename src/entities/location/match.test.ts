import { describe, expect, it } from 'vitest'
import {
  ALCANTARA,
  BUKIDNON,
  CEBU,
  CEBU_CITY,
  cityRef,
  CITY_REFS,
  ILOCOS_NORTE,
  LA_UNION,
  LAOAG,
  MANILA,
  METRO_MANILA,
  PAMPANGA,
  SAN_FERNANDO_BUKIDNON,
  SAN_FERNANDO_CEBU,
  SAN_FERNANDO_LA_UNION,
  SAN_FERNANDO_PAMPANGA,
} from '@/test/locations'
import { matchBarangay, matchCity, matchProvince, normalizeName, type AddressHint } from './match'
import type { CityRef, Place } from './place'

const place = (code: string, name: string): Place => ({ code, name })

describe('normalizeName', () => {
  // Pairs from real answers: the official name (PSGC) on one side, what the map says on the other.
  it.each([
    ['Lahug (Pob.)', 'Lahug'],
    ['Sikatuna Pob.', 'Sikatuna'],
    ['Pob. Sur', 'Poblacion Sur'],
    ['Bgy. 55 - Estanza', 'Estanza'],
    ['Bgy. 19 - Cabagñan', 'Cabagnan'],
    ['Bgy. No. 56-A, Bacsil South', 'Bacsil South'],
    ["Bgy. 1 - Em's Barrio (Pob.)", "Em's Barrio"],
    ['Poblacion No. 7', 'Poblacion 7'],
    ['Barangay 39-D (Pob.)', 'Barangay 39-D'],
    ['Barangay 39-D', 'Barangay 39D'],
    ['74-A Matina Crossing', '74 A Matina Crossing'],
    ['Kalanganan I', 'Kalanganan 1'],
    ['Centro 7 (Pob.)', 'Centro VII'],
    ['Zone I (Pob.)', 'Zone 1'],
    ['Barangay II (Pob.)', 'Barangay 2'],
    ['Barangay Ⅲ', 'Barangay III'],
    ['Barangay Ⅲ', 'Poblacion 3'],
    ['Barangay 007', 'Barangay 7'],
    ['Sta. Teresita', 'Santa Teresita'],
    ['Sto. Niño', 'Santo Nino'],
    ['Gen. Mariano Alvarez', 'General Mariano Alvarez'],
    ['Parañaque', 'Paranaque'],
    ['Las Piñas', 'Las Pinas'],
    ['Dasmariñas City', 'Dasmarinas'],
    ['City of Cebu', 'Cebu City'],
    ['Cebu City', 'Cebu'],
    ['Municipality of Sibutu', 'Sibutu'],
    ['Science City of Muñoz', 'Muñoz'],
    ['Island Garden City of Samal', 'Samal'],
    ["Veteran's Village", 'Veterans Village'],
    ['U.P. Campus', 'U P Campus'],
    ['Duljo-Fatima', 'Duljo Fatima'],
    ['  Lahug\t\n(Pob.) ', 'LAHUG'],
  ])('treats "%s" and "%s" as one name', (official, fromMap) => {
    expect(normalizeName(official)).toBe(normalizeName(fromMap))
  })

  it.each([
    ['Burnham Legarda', 'Legarda-Burnham-Kisad'], // no fuzzy or subset matching, on purpose
    ['San Roque', 'San Roque East'],
    ['Barangay 39-D', 'Barangay 39'],
    ['Barangay 39-D', 'Barangay 39-A'],
    ['Barangay 10-A', 'Barangay 10'],
    ['Poblacion 1', 'Poblacion 2'],
    ['Centro III', 'Centro VII'],
    ['Santa Cruz', 'Santa Clara'],
    ['Santo Niño', 'Santa Niña'],
    ['Señor Santo Niño', 'Sto. Niño'],
    ['Poblacion', 'Barangay'],
    ['Cebu', 'Mandaue'],
    ['Science City of Muñoz', 'Science'],
    ['Island Garden City of Samal', 'Island Garden'],
  ])('keeps "%s" and "%s" apart', (a, b) => {
    expect(normalizeName(a)).not.toBe(normalizeName(b))
  })

  it('drops the words that only say what kind of place it is', () => {
    expect(normalizeName('City of Cebu')).toBe('cebu')
    expect(normalizeName('Barangay 18')).toBe('18')
    expect(normalizeName('Poblacion Barangay 11')).toBe('11')
  })

  it('keeps the number when no name follows it, and drops it only as a label before a name', () => {
    expect(normalizeName('Barangay 18')).toBe('18')
    expect(normalizeName('Barangay 39-D')).toBe('39 d')
    expect(normalizeName('Bgy. 55 - Estanza')).toBe('estanza')
    expect(normalizeName('Brgy. 12, Poblacion')).toBe('poblacion')
  })

  it('keeps the words of a name that is made of nothing else but those words', () => {
    expect(normalizeName('Poblacion')).toBe('poblacion')
    expect(normalizeName('Barangay')).toBe('barangay')
    expect(normalizeName('(Pob.)')).toBe('pob')
  })

  it('writes words in lower case, without accents or punctuation, with single spaces', () => {
    expect(normalizeName("  D'Lotilla, Brgy. -- Señor/Niño & Co.  ")).toBe('dlotilla senor nino co')
  })

  it('turns roman numerals up to XII into digits, and only whole words', () => {
    expect(normalizeName('Phase IV-D')).toBe('phase 4 d')
    expect(normalizeName('Zone XII')).toBe('zone 12')
    expect(normalizeName('Zone XIII')).toBe('zone xiii')
    expect(normalizeName('Mixed Village')).toBe('mixed village')
  })

  it('gives nothing for text with no letters or digits', () => {
    expect(normalizeName('')).toBe('')
    expect(normalizeName('   ')).toBe('')
    expect(normalizeName('---')).toBe('')
  })

  it('is not fooled by names that are keys of every object', () => {
    for (const word of ['constructor', 'toString', 'prototype', 'hasOwnProperty', 'valueOf']) {
      expect(normalizeName(word)).toBe(word.toLowerCase())
    }
    expect(normalizeName('__proto__')).toBe('proto')
  })

  it('stays fast on long runs of spaces and odd characters', () => {
    const started = performance.now()
    expect(normalizeName(`Bgy. 1${' '.repeat(5000)}q`)).toBe('1 q')
    normalizeName('😀'.repeat(500))
    expect(performance.now() - started).toBeLessThan(500)
  })

  it('does not change when it is applied twice', () => {
    for (const name of ['City of Cebu', 'Bgy. 55 - Estanza', 'Centro 7 (Pob.)', 'Poblacion', 'Zone 12', '39-D']) {
      expect(normalizeName(normalizeName(name))).toBe(normalizeName(name))
    }
  })
})

describe('matchProvince', () => {
  const provinces = [CEBU, ILOCOS_NORTE, METRO_MANILA, place('160200000', 'Surigao Del Norte'), place('160300000', 'Tawi-Tawi')]

  it('finds the province whatever the case and spacing', () => {
    expect(matchProvince('Cebu', provinces)).toBe(CEBU)
    expect(matchProvince(' ilocos  NORTE ', provinces)).toBe(ILOCOS_NORTE)
    expect(matchProvince('Surigao del Norte', provinces)?.code).toBe('160200000')
    expect(matchProvince('Tawi Tawi', provinces)?.code).toBe('160300000')
  })

  it('finds Metro Manila, which the lists add as a province', () => {
    expect(matchProvince('Metro Manila', provinces)).toBe(METRO_MANILA)
  })

  it('gives null when no province has that name, or the name is empty', () => {
    expect(matchProvince('Atlantis', provinces)).toBeNull()
    expect(matchProvince('', provinces)).toBeNull()
    expect(matchProvince('---', provinces)).toBeNull()
    expect(matchProvince('Cebu', [])).toBeNull()
  })

  it('gives null when more than one province has that name', () => {
    expect(matchProvince('Cebu', [CEBU, place('999999999', 'CEBU')])).toBeNull()
  })

  it('does not match part of a name', () => {
    expect(matchProvince('Surigao', provinces)).toBeNull()
    expect(matchProvince('Norte', provinces)).toBeNull()
  })
})

describe('matchCity', () => {
  const provinces = [BUKIDNON, CEBU, ILOCOS_NORTE, LA_UNION, METRO_MANILA, PAMPANGA]
  const hint = (settlement: AddressHint['settlement'], extra: Partial<AddressHint> = {}): AddressHint => ({
    ...(settlement ? { settlement } : {}),
    areas: [],
    ...extra,
  })
  const asCity = (name: string) => ({ name, kind: 'city' as const })
  const asTown = (name: string) => ({ name, kind: 'town' as const })

  const ref = (code: string, name: string, province: Place, regionCode: string, isCity: boolean) =>
    cityRef(place(code, name), province, regionCode, isCity)
  const QUEZON_CITY = ref('137404000', 'Quezon City', METRO_MANILA, '130000000', true)
  const QUEZON_BUKIDNON = ref('101319000', 'Quezon', BUKIDNON, '100000000', false)
  const QUEZON_ISABELA = ref('023122000', 'Quezon', place('023100000', 'Isabela'), '020000000', false)
  const BASILAN = place('150700000', 'Basilan')
  const ISABELA_BASILAN = ref('099701000', 'Isabela City', BASILAN, '090000000', true)
  const ISABELA_NEGROS = ref('064514000', 'Isabela', place('064500000', 'Negros Occidental'), '060000000', false)
  const all = [...CITY_REFS, SAN_FERNANDO_LA_UNION, SAN_FERNANDO_PAMPANGA, SAN_FERNANDO_CEBU, SAN_FERNANDO_BUKIDNON]

  describe('when the name fits one place', () => {
    it('gives the city and its province', () => {
      const found = matchCity(hint(asCity('Cebu City')), CITY_REFS, provinces)
      expect(found).toEqual({ city: expect.objectContaining({ code: CEBU_CITY.code }), province: CEBU })
    })

    it('does not need the word "City" on either side', () => {
      for (const name of ['Cebu', 'City of Cebu', 'cebu city', 'CEBU CITY']) {
        expect(matchCity(hint(asCity(name)), CITY_REFS, provinces)).toMatchObject({ city: { code: CEBU_CITY.code } })
      }
    })

    it('gives Metro Manila as the province of a Metro Manila city', () => {
      expect(matchCity(hint(asCity('Manila')), CITY_REFS, provinces)).toMatchObject({
        city: { code: MANILA.code },
        province: METRO_MANILA,
      })
    })

    it('finds a municipality by the name the map calls a town', () => {
      expect(matchCity(hint(asTown('Alcantara')), CITY_REFS, provinces)).toMatchObject({
        city: { code: ALCANTARA.code },
        province: CEBU,
      })
    })

    it('finds a city whose name has an accent when the map has none', () => {
      const parañaque = ref('137604000', 'Parañaque City', METRO_MANILA, '130000000', true)
      expect(matchCity(hint(asCity('Paranaque')), [parañaque], provinces)).toMatchObject({ city: { code: '137604000' } })
    })

    it('finds a city by the short name people use, when the official name has words before "City of"', () => {
      const samal = ref('112408000', 'Island Garden City of Samal', place('112300000', 'Davao Del Norte'), '110000000', true)
      const bataan = ref('030801000', 'Samal', place('030800000', 'Bataan'), '030000000', false)
      const lists = [...provinces, place('112300000', 'Davao Del Norte'), place('030800000', 'Bataan')]
      expect(matchCity(hint(asCity('Samal')), [samal, bataan], lists)).toMatchObject({ city: { code: samal.code } })
      expect(matchCity(hint(asCity('Island Garden City of Samal')), [samal, bataan], lists)).toMatchObject({
        city: { code: samal.code },
      })
      expect(matchCity(hint(asTown('Samal'), { state: 'Bataan' }), [samal, bataan], lists)).toMatchObject({
        city: { code: bataan.code },
      })
    })

    it('does not use the clues when the name is already enough', () => {
      // The map says the wrong province and the wrong kind. The name fits one place only.
      const found = matchCity(hint(asTown('Laoag'), { state: 'Cebu', isoRegion: 'PH-07' }), CITY_REFS, provinces)
      expect(found).toMatchObject({ city: { code: LAOAG.code }, province: ILOCOS_NORTE })
    })

    it('does not match part of a name', () => {
      expect(matchCity(hint(asCity('San')), all, provinces)).toBeNull()
      expect(matchCity(hint(asCity('Cebu City Proper')), CITY_REFS, provinces)).toBeNull()
    })
  })

  describe('when there is nothing to find', () => {
    it('gives null when no city has that name', () => {
      expect(matchCity(hint(asCity('Atlantis')), CITY_REFS, provinces)).toBeNull()
    })

    it('gives null when the hint names no city, or only punctuation', () => {
      expect(matchCity(hint(undefined, { state: 'Cebu' }), CITY_REFS, provinces)).toBeNull()
      expect(matchCity(hint(asCity('---')), CITY_REFS, provinces)).toBeNull()
      expect(matchCity(hint(asCity('')), CITY_REFS, provinces)).toBeNull()
    })

    it('gives null when there are no cities', () => {
      expect(matchCity(hint(asCity('Cebu City')), [], provinces)).toBeNull()
    })

    it('gives null when the province of the one city is not in the list of provinces', () => {
      expect(matchCity(hint(asCity('Cebu City')), CITY_REFS, [ILOCOS_NORTE])).toBeNull()
    })
  })

  describe('when a name repeats (San Fernando is four places here)', () => {
    it('says it is ambiguous when nothing in the hint decides', () => {
      expect(matchCity(hint(asCity('San Fernando')), all, provinces)).toBe('ambiguous')
      expect(matchCity(hint(asTown('San Fernando')), all, provinces)).toBe('ambiguous')
    })

    it('lets the province decide first, whatever the kind', () => {
      for (const kind of ['city', 'town'] as const) {
        const settlement = { name: 'San Fernando', kind }
        expect(matchCity(hint(settlement, { state: 'La Union' }), all, provinces)).toMatchObject({
          city: { code: SAN_FERNANDO_LA_UNION.code },
          province: LA_UNION,
        })
        expect(matchCity(hint(settlement, { state: 'Cebu' }), all, provinces)).toMatchObject({
          city: { code: SAN_FERNANDO_CEBU.code },
          province: CEBU,
        })
      }
    })

    it('lets the kind decide next: a city is a city, a town is a municipality', () => {
      const withoutPampanga = all.filter((city) => city.code !== SAN_FERNANDO_PAMPANGA.code)
      expect(matchCity(hint(asCity('San Fernando')), withoutPampanga, provinces)).toMatchObject({
        city: { code: SAN_FERNANDO_LA_UNION.code },
      })
      const onlyOneTown = all.filter((city) => city.code !== SAN_FERNANDO_BUKIDNON.code)
      expect(matchCity(hint(asTown('San Fernando')), onlyOneTown, provinces)).toMatchObject({
        city: { code: SAN_FERNANDO_CEBU.code },
      })
    })

    it('lets the ISO region decide last', () => {
      expect(matchCity(hint(asCity('San Fernando'), { isoRegion: 'PH-01' }), all, provinces)).toMatchObject({
        city: { code: SAN_FERNANDO_LA_UNION.code },
      })
      expect(matchCity(hint(asCity('San Fernando'), { isoRegion: 'PH-03' }), all, provinces)).toMatchObject({
        city: { code: SAN_FERNANDO_PAMPANGA.code },
      })
      expect(matchCity(hint(asTown('San Fernando'), { isoRegion: 'PH-07' }), all, provinces)).toMatchObject({
        city: { code: SAN_FERNANDO_CEBU.code },
      })
      expect(matchCity(hint(asTown('San Fernando'), { isoRegion: 'PH-10' }), all, provinces)).toMatchObject({
        city: { code: SAN_FERNANDO_BUKIDNON.code },
      })
    })

    it('reads the ISO code however it is written', () => {
      for (const iso of ['ph-03', ' PH-03 ']) {
        expect(matchCity(hint(asCity('San Fernando'), { isoRegion: iso }), all, provinces)).toMatchObject({
          city: { code: SAN_FERNANDO_PAMPANGA.code },
        })
      }
    })

    it('ignores a clue that would leave no candidate', () => {
      // The map names a province with no San Fernando in it. The region still decides.
      const found = matchCity(hint(asCity('San Fernando'), { state: 'Ilocos Norte', isoRegion: 'PH-03' }), all, provinces)
      expect(found).toMatchObject({ city: { code: SAN_FERNANDO_PAMPANGA.code } })
      // Nothing decides, and the province clue alone is not enough.
      expect(matchCity(hint(asCity('San Fernando'), { state: 'Ilocos Norte' }), all, provinces)).toBe('ambiguous')
      // The kind clue would leave none (both are cities, and the map calls it a town). The region still decides.
      const cities = [SAN_FERNANDO_LA_UNION, SAN_FERNANDO_PAMPANGA]
      expect(matchCity(hint(asTown('San Fernando'), { isoRegion: 'PH-03' }), cities, provinces)).toMatchObject({
        city: { code: SAN_FERNANDO_PAMPANGA.code },
      })
    })

    it('stays ambiguous, and does not pick, when the clues point to different places', () => {
      // A town, in the region of La Union: the towns are elsewhere, and the one city is not a town.
      expect(matchCity(hint(asTown('San Fernando'), { isoRegion: 'PH-01' }), all, provinces)).toBe('ambiguous')
    })

    it('does not narrow by a region that has no ISO number or that it does not know', () => {
      for (const iso of ['PH-99', 'PH-NIR', '', 'Negros Island Region']) {
        expect(matchCity(hint(asCity('San Fernando'), { isoRegion: iso }), all, provinces)).toBe('ambiguous')
      }
    })

    it('reads all 17 ISO region numbers as the right PSGC regions', () => {
      const regions = [
        ['PH-00', '130000000'],
        ['PH-01', '010000000'],
        ['PH-02', '020000000'],
        ['PH-03', '030000000'],
        ['PH-05', '050000000'],
        ['PH-06', '060000000'],
        ['PH-07', '070000000'],
        ['PH-08', '080000000'],
        ['PH-09', '090000000'],
        ['PH-10', '100000000'],
        ['PH-11', '110000000'],
        ['PH-12', '120000000'],
        ['PH-13', '160000000'], // Caraga: the ISO number is not the PSGC number
        ['PH-14', '150000000'], // BARMM
        ['PH-15', '140000000'], // Cordillera
        ['PH-40', '040000000'], // CALABARZON
        ['PH-41', '170000000'], // MIMAROPA
      ] as const
      for (const [iso, regionCode] of regions) {
        // Two cities with one name, in different regions: only the right region can pick the first one.
        const here: CityRef = ref('111111111', 'Twin City', CEBU, regionCode, true)
        const elsewhere: CityRef = ref('222222222', 'Twin City', CEBU, regionCode === '010000000' ? '020000000' : '010000000', true)
        expect(matchCity(hint(asCity('Twin'), { isoRegion: iso }), [elsewhere, here], provinces)).toMatchObject({
          city: { code: '111111111' },
        })
      }
    })
  })

  describe('when a city has the same name as municipalities', () => {
    const quezons = [QUEZON_BUKIDNON, QUEZON_CITY, QUEZON_ISABELA]

    it('takes the city for a city, with no province in the hint (Metro Manila has none)', () => {
      expect(matchCity(hint(asCity('Quezon City')), quezons, provinces)).toMatchObject({
        city: { code: QUEZON_CITY.code },
        province: METRO_MANILA,
      })
    })

    it('takes the municipality for a town, with the province to say which', () => {
      expect(matchCity(hint(asTown('Quezon'), { state: 'Bukidnon' }), quezons, provinces)).toMatchObject({
        city: { code: QUEZON_BUKIDNON.code },
      })
    })

    it('says it is ambiguous for a town in two provinces when the hint does not say which', () => {
      expect(matchCity(hint(asTown('Quezon')), quezons, provinces)).toBe('ambiguous')
    })

    it('takes the island city over the municipality of the same name by the province in the hint', () => {
      const both = [ISABELA_NEGROS, ISABELA_BASILAN]
      const lists = [...provinces, BASILAN, place('064500000', 'Negros Occidental')]
      expect(matchCity(hint(asCity('Isabela'), { state: 'Basilan' }), both, lists)).toMatchObject({
        city: { code: ISABELA_BASILAN.code },
        province: BASILAN,
      })
      expect(matchCity(hint(asCity('Isabela')), both, lists)).toMatchObject({ city: { code: ISABELA_BASILAN.code } })
    })
  })

  it('does not change what it is given', () => {
    const input = Object.freeze(all.map((city) => Object.freeze({ ...city })))
    const lists = Object.freeze([...provinces])
    const areas: string[] = []
    Object.freeze(areas)
    const asked = Object.freeze({ ...hint(asCity('San Fernando'), { state: 'La Union' }), areas })
    expect(() => matchCity(asked, input, lists)).not.toThrow()
  })
})

describe('matchBarangay', () => {
  const lahug = place('072217044', 'Lahug')
  const adlaon = place('072217001', 'Adlaon')
  const barangays = [
    adlaon,
    lahug,
    place('1', 'Kasambagan'),
    place('2', 'Centro 3 (Pob.)'),
    place('3', 'Centro 7 (Pob.)'),
    place('4', 'Sta. Teresita'),
    place('5', 'Bgy. 55 - Estanza'),
    place('6', 'Poblacion No. 7'),
    place('7', 'Barangay 39-D (Pob.)'),
    place('8', 'Legarda-Burnham-Kisad'),
    place('9', 'San Roque East'),
  ]
  const byCode = (code: string) => barangays.find((barangay) => barangay.code === code) ?? null

  it('finds the barangay that a name points to', () => {
    expect(matchBarangay(['Lahug'], barangays)).toBe(lahug)
    expect(matchBarangay(['Kasambagan'], barangays)).toBe(byCode('1'))
  })

  it.each([
    ['Centro VII', '3'],
    ['Santa Teresita', '4'],
    ['Estanza', '5'],
    ['Poblacion 7', '6'],
    ['Barangay 39-D', '7'],
    ['Barangay 39D', '7'],
    ['LAHUG (Pob.)', '072217044'],
  ])('finds "%s" in the official list', (fromMap, code) => {
    expect(matchBarangay([fromMap], barangays)).toBe(byCode(code))
  })

  it('picks the one name that fits among names that do not', () => {
    expect(matchBarangay(['Diliman', 'Lahug', 'Some Village'], barangays)).toBe(lahug)
  })

  it('does not call it a tie when two names point to the same barangay', () => {
    expect(matchBarangay(['Lahug', 'LAHUG (Pob.)'], barangays)).toBe(lahug)
  })

  it('fills nothing when the names point to different barangays', () => {
    expect(matchBarangay(['Lahug', 'Adlaon'], barangays)).toBeNull()
    expect(matchBarangay(['Centro III', 'Centro VII'], barangays)).toBeNull()
    expect(matchBarangay(['Estanza', 'Kasambagan', 'Lahug'], barangays)).toBeNull()
  })

  it('fills nothing when no name fits, or there is no name, or no barangay', () => {
    expect(matchBarangay(['Duljo Fatima', 'Señor Santo Niño'], barangays)).toBeNull()
    expect(matchBarangay([], barangays)).toBeNull()
    expect(matchBarangay(['Lahug'], [])).toBeNull()
    expect(matchBarangay(['', '---'], barangays)).toBeNull()
  })

  it('does not use fuzzy or subset matching', () => {
    expect(matchBarangay(['Burnham Legarda'], barangays)).toBeNull()
    expect(matchBarangay(['San Roque'], barangays)).toBeNull()
    expect(matchBarangay(['Lahug Heights'], barangays)).toBeNull()
    expect(matchBarangay(['Estanza Subdivision'], barangays)).toBeNull()
  })

  describe('when official names repeat inside the city', () => {
    const twins = [place('11', 'San Isidro'), place('12', 'San Isidro'), place('13', 'Mabolo')]

    it('ignores a name that fits two barangays, so it can never pick the wrong one', () => {
      expect(matchBarangay(['San Isidro'], twins)).toBeNull()
    })

    it('still uses another name that fits only one', () => {
      expect(matchBarangay(['San Isidro', 'Mabolo'], twins)).toBe(twins[2])
    })

    it('ignores names that only differ by the words that say what kind of place it is', () => {
      const list = [place('21', 'San Diego'), place('22', 'San Diego Poblacion'), place('23', 'Mabolo')]
      expect(matchBarangay(['San Diego'], list)).toBeNull()
      expect(matchBarangay(['Mabolo'], list)).toBe(list[2])
    })
  })

  it('does not change what it is given', () => {
    const areas = Object.freeze(['Lahug'])
    const list = Object.freeze([...barangays])
    expect(matchBarangay(areas, list)).toBe(lahug)
  })
})

// What Nominatim really said about 44 spots (2026-10-19), against the real PSGC names of that city. The lists are
// trimmed to the names that matter and two others. A name means one barangay fits. Null means a tie between
// different barangays, or that no barangay has that name: nothing is filled, because a wrong barangay is worse than none.
describe('real answers from the probe', () => {
  it.each<[spot: string, areas: string[], names: string[], expected: string | null]>([
    ['Makati CBD', ['Urdaneta'], ['Urdaneta', 'Bangkal', 'Bel-Air'], 'Urdaneta'],
    ['Quezon City Diliman', ['Diliman', 'U.P. Campus'], ['U.P. Campus', 'Alicia', 'Amihan'], 'U.P. Campus'],
    ['Manila Intramuros', ['Intramuros', 'Barangay 655'], ['Barangay 654', 'Barangay 655', 'Barangay 656'], 'Barangay 655'],
    ['Pasig Ortigas', ['San Antonio'], ['San Antonio', 'Bagong Ilog', 'Bagong Katipunan'], 'San Antonio'],
    ['Taguig BGC', ['Fort Bonifacio'], ['Fort Bonifacio', 'Bagumbayan', 'Bambang'], 'Fort Bonifacio'],
    ['Caloocan', ['Poblacion', 'Barangay 18'], ['Barangay 18', 'Barangay 1', 'Barangay 2'], 'Barangay 18'],
    ['Marikina', ['Concepcion Uno', 'Amang Rodriguez Village'], ['Concepcion Uno', 'Barangka', 'Calumpang'], 'Concepcion Uno'],
    ['Paranaque', ['Don Bosco'], ['Don Bosco', 'B. F. Homes', 'Baclaran'], 'Don Bosco'],
    ['Las Pinas', ['Pamplona Tres', 'Dona Manuela Phase IV-D'], ['Pamplona Tres', 'Almanza Dos', 'Almanza Uno'], 'Pamplona Tres'],
    ['Cebu City Lahug IT Park', ['Kasambagan'], ['Kasambagan', 'Adlaon', 'Agsungot'], 'Kasambagan'],
    ['Cebu City Colon', ['Duljo Fatima', 'Señor Santo Niño'], ['Adlaon', 'Agsungot'], null],
    ['Mandaue', ['Subangdaku', 'Bamboo Bay Community'], ['Subangdaku', 'Alang-alang', 'Bakilid'], 'Subangdaku'],
    ['Davao Poblacion', ['Poblacion District', 'Barangay 39-D'], ['Barangay 39-D (Pob.)', 'Acacia', 'Agdao'], 'Barangay 39-D (Pob.)'],
    ['Davao Matina', ['74-A Matina Crossing', 'Juna'], ['Acacia', 'Agdao'], null],
    ['Zamboanga City', ['Santa Catalina', 'Canelar', 'Armor Village'], ['Canelar', 'Santa Catalina', 'Arena Blanco', 'Ayala'], null],
    ['Bacolod', ['Barangay 9'], ['Barangay 9 (Pob.)', 'Alangilan', 'Alijis'], 'Barangay 9 (Pob.)'],
    ['Baguio Session Rd', ['District 4', 'Burnham Legarda', 'Purok 8'], ['A. Bonifacio-Caguioa-Rimando', 'Abanao-Zandueta-Kayong-Chugum-Otek'], null],
    ['Cagayan de Oro Divisoria', ['Poblacion', 'Barangay 16', 'Burgos'], ['Barangay 16 (Pob.)', 'Agusan', 'Baikingon'], 'Barangay 16 (Pob.)'],
    ['Cotabato City', ['Kalanganan 1', 'Bagua', 'Rosary Heights 1', 'Mabuhay'], ['Bagua', 'Kalanganan I', 'Rosary Heights I', 'Bagua I', 'Bagua II'], null],
    ['Isabela City Basilan', ['Cabunbata', 'Sumagdang', 'Kaumpurnah I'], ['Cabunbata', 'Sumagdang', 'Aguada', 'Balatanay'], null],
    ['Iloilo City', ['City Proper', 'Villa Anita', 'Edganzon'], ['Edganzon', 'Villa Anita', 'Abeto Mirasol Taft South', 'Aguinaldo'], null],
    ['Angeles City', ['Santa Teresita'], ['Sta. Teresita', 'Agapito del Rosario', 'Amsic'], 'Sta. Teresita'],
    ['Tacloban', ['Downtown', 'Barangay 18'], ['Barangay 18', 'Barangay 2', 'Barangay 5'], 'Barangay 18'],
    ['General Santos', ['Dadiangas West', 'Silway'], ['Dadiangas West', 'Apopong', 'Baluan'], 'Dadiangas West'],
    ['Puerto Princesa', ['San Miguel', 'Model', 'Masikap'], ['Masikap (Pob.)', 'Model (Pob.)', 'San Miguel', 'Babuyan', 'Bacungan'], null],
    ['Dagupan', ['Pogo Grande', 'Poblacion Oeste', 'Pantal West'], ['Poblacion Oeste', 'Pogo Grande', 'Bacayao Norte', 'Bacayao Sur'], null],
    ['Naga', ['Tinago', 'Naga City Subdivision'], ['Tinago', 'Abella', 'Bagumbayan Norte'], 'Tinago'],
    ['Legazpi', ['Estanza', 'Cabagñan'], ['Bgy. 19 - Cabagñan', 'Bgy. 55 - Estanza', "Bgy. 1 - Em's Barrio (Pob.)", "Bgy. 2 - Em's Barrio South (Pob.)"], null],
    ['Lipa Batangas', ['Poblacion', 'Poblacion Barangay 11'], ['Poblacion Barangay 11', 'Adya', 'Anilao'], 'Poblacion Barangay 11'],
    ['Dasmarinas Cavite', ['Poblacion', 'Zone 1', 'Dasmaville'], ['Zone I (Pob.)', 'Burol', 'Burol I'], 'Zone I (Pob.)'],
    ['Antipolo', ['San Roque', 'Villa Carmen Subdivision'], ['San Roque (Pob.)', 'Bagong Nayon', 'Beverly Hills'], 'San Roque (Pob.)'],
    ['San Fernando La Union', ['Sagayad', 'Barangay II'], ['Barangay II (Pob.)', 'Sagayad', 'Abut', 'Apaleng'], null],
    ['Tuguegarao', ['Balzain West', 'Centro III', 'Centro VII'], ['Centro 3 (Pob.)', 'Centro 7 (Pob.)', 'Annafunan East', 'Annafunan West'], null],
    ['Butuan', ['Poblacion', 'Sikatuna', 'Mangoville'], ['Sikatuna Pob.', 'Agao Pob.', 'Agusan Pequeño'], 'Sikatuna Pob.'],
    ['Dumaguete', ['Poblacion 7'], ['Poblacion No. 7', 'Bagacay', 'Bajumpandan'], 'Poblacion No. 7'],
    ['Sibutu Tawi-Tawi', ['Nunukan'], ['Nunukan', 'Ambulong Sapal', 'Datu Amilhamja Jaafar'], 'Nunukan'],
    ['Itbayat Batanes', ['San Rafael'], ['San Rafael', 'Raele', 'Santa Lucia'], 'San Rafael'],
    ['Siargao General Luna', ['Tawin-tawin', 'Poblacion', 'Barangay III'], ['Poblacion III', 'Tawin-tawin', 'Anajawan', 'Cabitoonan'], null],
    ['Coron Palawan', ['Poblacion 1', 'Poblacion 2', 'San Juan'], ['Barangay I (Pob.)', 'Barangay II (Pob.)', 'Banuang Daan', 'Barangay III (Pob.)'], null],
    ['Sagada', ['Ambasing', 'Dagdag', 'Makingking'], ['Ambasing', 'Dagdag (Pob.)', 'Aguid', 'Angkeling'], null],
    ['Bukidnon rural', ['Barangay 7'], ['Barangay 7 (Pob.)', 'Aglayan', 'Apo Macote'], 'Barangay 7 (Pob.)'],
    ['Vigan', ['Barangay II'], ['Barangay II (Pob.)', 'Ayusan Norte', 'Ayusan Sur'], 'Barangay II (Pob.)'],
    ['Catbalogan Samar', ['Poblacion', 'Barangay 7'], ['Poblacion 7', 'Albalate', 'Bagongon'], 'Poblacion 7'],
    ['Calapan Mindoro', ['San Vicente East', 'Bonbon'], ['San Vicente East (Pob.)', 'Balingayan', 'Balite'], 'San Vicente East (Pob.)'],
  ])('%s', (_, areas, names, expected) => {
    const barangays = names.map((name, index) => place(String(index + 1), name))
    expect(matchBarangay(areas, barangays)?.name ?? null).toBe(expected)
  })
})
