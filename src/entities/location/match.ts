import type { CityRef, Place } from './place'

/**
 * What a reverse lookup said about a spot, cut down to the parts that help find our own place names.
 * Every string is plain text from outside. All of them are only compared with our lists, except `road` and `houseNumber`:
 * those two become the street suggestion (cleaned to the street rules) and are shown in the street box.
 */
export type AddressHint = {
  /** The province as the map names it. Missing for Metro Manila and for most independent cities. */
  state?: string
  /** The region as the map names it, for example "Central Visayas". */
  region?: string
  /** The ISO 3166-2 region code the map gives, for example "PH-07". */
  isoRegion?: string
  /** The city or municipality as the map names it. `kind` is what the map calls it: a city, or a town or municipality. */
  settlement?: { name: string; kind: 'city' | 'town' }
  /**
   * Names the map gave for areas inside the city. Any of them may be a barangay, and often several are
   * (a barangay, a subdivision, a district). Unique and in the order village, suburb, quarter, neighbourhood, city_block, hamlet.
   */
  areas: string[]
  road?: string
  houseNumber?: string
}

// ISO 3166-2 numbers the regions on its own (there is no PH-04). Most codes read as the PSGC number, but PH-00, PH-13 to
// PH-15, PH-40 and PH-41 do not, so every code is written out here and none is worked out from its digits.
// The new Negros Island Region has no ISO code yet, so it is not here and it narrows nothing.
const REGION_OF_ISO: ReadonlyMap<string, string> = new Map([
  ['PH-00', '130000000'], // Metro Manila (NCR)
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
  ['PH-13', '160000000'], // Caraga
  ['PH-14', '150000000'], // BARMM
  ['PH-15', '140000000'], // Cordillera (CAR)
  ['PH-40', '040000000'], // CALABARZON
  ['PH-41', '170000000'], // MIMAROPA
])

// Short forms the official lists use and people spell out, or the other way round.
const EXPANSIONS: ReadonlyMap<string, string> = new Map([
  ['sta', 'santa'],
  ['sto', 'santo'],
  ['gen', 'general'],
  ['gov', 'governor'],
  ['pres', 'president'],
  ['sen', 'senator'],
  ['dr', 'doctor'],
])

// Barangays are often numbered in roman numerals ("Centro VII"). Up to XII is all the lists use.
const ROMAN: ReadonlyMap<string, string> = new Map(
  ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'].map((numeral, index) => [numeral, String(index + 1)]),
)

// Words that say what kind of place it is, not which one. Dropped on both sides, so "City of Cebu",
// "Cebu City" and "Cebu" are one name, and so are "Lahug (Pob.)" and "Lahug".
const NOISE = new Set(['city', 'of', 'municipality', 'barangay', 'brgy', 'bgy', 'bry', 'pob', 'poblacion', 'no', 'the'])

// "Bgy. 55 - Estanza" and "Bgy. No. 56-A, Bacsil South" are named Estanza and Bacsil South. The number is only a label
// when a name of at least two letters follows it: "Barangay 39-D" keeps its number.
const NUMBER_LABEL = /^(?:bgy|brgy|bry|barangay)\.?\s*(?:no\.?\s*)?\d+(?:\s*-?\s*[a-z])?\s*[-,]\s*(?=\p{L}{2})/u

// "39D" and "39-D" are the same barangay. Two passes, because a match uses up the characters it covers.
const DIGIT_THEN_LETTER = /(\p{N})(\p{L})/gu
const LETTER_THEN_DIGIT = /(\p{L})(\p{N})/gu

/**
 * A name reduced so that spellings of the same place are equal: case, accents, "City of", "(Pob.)", "Sta.", roman numerals.
 * It never guesses between different words: "Burnham Legarda" and "Legarda-Burnham-Kisad" stay different.
 */
export function normalizeName(value: string): string {
  const plain = value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    // One space at most between words, which also keeps the label pattern below from backtracking on long runs of spaces.
    .replace(/\s+/g, ' ')
    .replace(NUMBER_LABEL, '')
    .replace(DIGIT_THEN_LETTER, '$1 $2')
    .replace(LETTER_THEN_DIGIT, '$1 $2')

  const words = plain
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== '')
    .map((word) => EXPANSIONS.get(word) ?? ROMAN.get(word) ?? word.replace(/^0+(?=\d)/, ''))

  // "Science City of Muñoz" and "Island Garden City of Samal" are called Muñoz and Samal.
  const cityOf = words.findIndex((word, index) => word === 'city' && words[index + 1] === 'of')
  const named = cityOf >= 0 && cityOf + 2 < words.length ? words.slice(cityOf + 2) : words

  // A barangay really named "Poblacion" would be left with nothing: keep its words then.
  const kept = named.filter((word) => !NOISE.has(word))
  return (kept.length > 0 ? kept : named).join(' ')
}

/** The only item of a list, or null when it is empty or has several. */
function only<T>(items: readonly T[]): T | null {
  return items.length === 1 ? (items[0] ?? null) : null
}

/** The province whose name equals `state`, or null when none or more than one does. */
export function matchProvince(state: string, provinces: readonly Place[]): Place | null {
  const wanted = normalizeName(state)
  return wanted === '' ? null : only(provinces.filter((province) => normalizeName(province.name) === wanted))
}

export type CityMatch = { city: CityRef; province: Place }

/**
 * Finds the city or municipality the hint names, and its province. Null when nothing matches.
 * 'ambiguous' when the name fits more than one place and nothing in the hint decides between them.
 */
export function matchCity(
  hint: AddressHint,
  cities: readonly CityRef[],
  provinces: readonly Place[],
): CityMatch | 'ambiguous' | null {
  const { settlement } = hint
  if (!settlement) return null
  const wanted = normalizeName(settlement.name)
  if (wanted === '') return null

  let candidates = cities.filter((city) => normalizeName(city.name) === wanted)
  if (candidates.length === 0) return null

  const provinceByCode = new Map(provinces.map((province) => [province.code, province]))
  const state = hint.state === undefined ? '' : normalizeName(hint.state)
  const region = hint.isoRegion === undefined ? undefined : REGION_OF_ISO.get(hint.isoRegion.trim().toUpperCase())

  // Names repeat ("San Fernando" is 7 places). These clues tell them apart, strongest first. A clue is used
  // only if it keeps at least one candidate, so a clue the map got wrong cannot empty the list.
  const clues: ((city: CityRef) => boolean)[] = [
    (city) => state !== '' && normalizeName(provinceByCode.get(city.provinceCode)?.name ?? '') === state,
    (city) => city.isCity === (settlement.kind === 'city'),
    (city) => region !== undefined && city.regionCode === region,
  ]
  for (const clue of clues) {
    if (candidates.length === 1) break
    const narrowed = candidates.filter(clue)
    if (narrowed.length > 0) candidates = narrowed
  }

  if (candidates.length > 1) return 'ambiguous'
  const city = only(candidates)
  const province = city === null ? undefined : provinceByCode.get(city.provinceCode)
  return city !== null && province ? { city, province } : null
}

/**
 * The one barangay that the names point to. Null when none fits, or when they point to different barangays.
 * A name that fits two barangays (they repeat inside a city) points to neither. A wrong barangay is worse than an empty one.
 */
export function matchBarangay(areas: readonly string[], barangays: readonly Place[]): Place | null {
  const byName = new Map<string, Place[]>()
  for (const barangay of barangays) {
    const name = normalizeName(barangay.name)
    if (name !== '') byName.set(name, [...(byName.get(name) ?? []), barangay])
  }

  const matched = new Map<string, Place>()
  for (const area of areas) {
    const barangay = only(byName.get(normalizeName(area)) ?? [])
    if (barangay !== null) matched.set(barangay.code, barangay)
  }
  return only([...matched.values()])
}
