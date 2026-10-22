import { describe, expect, it } from 'vitest'
import {
  checkBoolean,
  checkInteger,
  checkList,
  checkOneOf,
  checkText,
  combine,
  fail,
  hasDuplicates,
  isMissing,
  isOneOf,
  matchKey,
  pass,
  readField,
  safely,
} from './checks'

describe('readField', () => {
  it('reads a field the object has itself', () => {
    expect(readField({ name: 'Cafe Luna' }, 'name')).toBe('Cafe Luna')
  })

  it('never reads a field through the prototype', () => {
    expect(readField(Object.create({ name: 'inherited' }), 'name')).toBeUndefined()
    expect(readField({}, 'toString')).toBeUndefined()
    expect(readField({}, 'constructor')).toBeUndefined()
    expect(readField({}, '__proto__')).toBeUndefined()
  })

  it('reads "__proto__" from JSON as a plain name and leaves Object.prototype alone', () => {
    const input: unknown = JSON.parse('{"__proto__": {"polluted": true}, "name": "Cafe"}')
    expect(readField(input, 'name')).toBe('Cafe')
    expect(readField(input, 'polluted')).toBeUndefined()
    expect(readField(input, '__proto__')).toEqual({ polluted: true })
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('reads an object without a prototype', () => {
    const input = Object.assign(Object.create(null) as object, { name: 'Cafe' })
    expect(readField(input, 'name')).toBe('Cafe')
  })

  it.each([null, undefined, 'name', 42, true, ['name']])('finds no fields in %j', (input) => {
    expect(readField(input, 'name')).toBeUndefined()
    expect(readField(input, 'length')).toBeUndefined()
  })
})

describe('isMissing', () => {
  it('counts undefined and null as missing, and nothing else', () => {
    expect([undefined, null].every(isMissing)).toBe(true)
    expect(['', 0, false, Number.NaN, [], {}].some(isMissing)).toBe(false)
  })
})

describe('isOneOf and checkOneOf', () => {
  const LAYOUTS = ['grid', 'list'] as const

  it('accepts a word of the list as it is written', () => {
    expect(isOneOf(LAYOUTS, 'grid')).toBe(true)
    expect(checkOneOf(LAYOUTS, 'list')).toEqual(pass('list'))
  })

  it.each(['Grid', ' grid', 'grid ', '', '__proto__', 'constructor', 'toString', 'length'])('refuses %j', (value) => {
    expect(isOneOf(LAYOUTS, value)).toBe(false)
    expect(checkOneOf(LAYOUTS, value)).toEqual(fail('invalid'))
  })

  it('refuses what is not text, and calls a missing choice required', () => {
    expect(checkOneOf(LAYOUTS, ['grid'])).toEqual(fail('invalid'))
    expect(checkOneOf(LAYOUTS, 1)).toEqual(fail('invalid'))
    expect(checkOneOf(LAYOUTS, undefined)).toEqual(fail('required'))
    expect(checkOneOf(LAYOUTS, null)).toEqual(fail('required'))
  })
})

describe('checkBoolean', () => {
  it('takes true and false only', () => {
    expect(checkBoolean(true)).toEqual(pass(true))
    expect(checkBoolean(false)).toEqual(pass(false))
    expect(checkBoolean('true')).toEqual(fail('invalid'))
    expect(checkBoolean(0)).toEqual(fail('invalid'))
    expect(checkBoolean(undefined)).toEqual(fail('required'))
  })
})

describe('checkInteger', () => {
  it('takes whole numbers from min to max, both ends included', () => {
    expect(checkInteger(0, 0, 10)).toEqual(pass(0))
    expect(checkInteger(10, 0, 10)).toEqual(pass(10))
  })

  it('calls a whole number outside the bounds out of range', () => {
    expect(checkInteger(-1, 0, 10)).toEqual(fail('range'))
    expect(checkInteger(11, 0, 10)).toEqual(fail('range'))
    expect(checkInteger(Number.MAX_SAFE_INTEGER * 4, 0, 10)).toEqual(fail('range'))
  })

  it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY, '5', 5n, true, {}, []])('refuses %s as not a whole number', (value) => {
    expect(checkInteger(value, 0, 10)).toEqual(fail('invalid'))
  })

  it('calls a missing number required', () => {
    expect(checkInteger(undefined, 0, 10)).toEqual(fail('required'))
    expect(checkInteger(null, 0, 10)).toEqual(fail('required'))
  })

  it('stores minus zero as zero', () => {
    const result = checkInteger(-0, 0, 10)
    expect(result.ok && Object.is(result.value, 0)).toBe(true)
  })
})

describe('checkText', () => {
  it('cleans the text: trimmed, one space between words, no control characters', () => {
    expect(checkText('  Iced \t  Coffee\u0000 \n', { max: 40 })).toEqual(pass('Iced Coffee'))
  })

  it('normalizes look-alike characters such as full-width letters', () => {
    expect(checkText('Ｃａｆｅ', { max: 40 })).toEqual(pass('Cafe'))
    expect(checkText('Café', { max: 4 })).toEqual(pass('Café'))
  })

  it('calls missing, empty and blank text required', () => {
    for (const value of [undefined, null, '', '   ', '\n\t', '\u0000\u0007']) {
      expect(checkText(value, { max: 40 })).toEqual(fail('required'))
    }
  })

  it('treats text made only of invisible characters as empty', () => {
    expect(checkText('​​', { max: 40 })).toEqual(fail('required'))
    expect(checkText('́', { max: 40 })).toEqual(fail('required'))
    expect(checkText('​', { min: 0, max: 40 })).toEqual(pass(''))
  })

  it('reads missing or empty text as empty when it may be empty', () => {
    expect(checkText(undefined, { min: 0, max: 40 })).toEqual(pass(''))
    expect(checkText('  ', { min: 0, max: 40 })).toEqual(pass(''))
  })

  it('measures after cleaning', () => {
    expect(checkText(`  ${'a'.repeat(40)}  `, { max: 40 })).toEqual(pass('a'.repeat(40)))
    expect(checkText('a'.repeat(41), { max: 40 })).toEqual(fail('tooLong'))
    expect(checkText('ab', { min: 3, max: 40 })).toEqual(fail('tooShort'))
  })

  it('keeps letters of every script, and emoji', () => {
    expect(checkText('Kapehan ni Lola ☕', { max: 40 })).toEqual(pass('Kapehan ni Lola ☕'))
    expect(checkText('咖啡店', { max: 40 })).toEqual(pass('咖啡店'))
  })

  it('refuses a very long text quickly', () => {
    expect(checkText('x'.repeat(1_000_000), { max: 80 })).toEqual(fail('tooLong'))
  })

  it.each([42, true, {}, ['text'], Symbol('text')])('refuses %s, which is not text', (value) => {
    expect(checkText(value, { max: 40 })).toEqual(fail('invalid'))
  })
})

describe('checkList', () => {
  it('takes an array up to the limit', () => {
    expect(checkList([1, 2], 2)).toEqual(pass([1, 2]))
    expect(checkList([1, 2, 3], 2)).toEqual(fail('tooMany'))
  })

  it('refuses a huge array by its length alone', () => {
    const huge: unknown[] = []
    huge.length = 2 ** 32 - 1
    expect(checkList(huge, 8)).toEqual(fail('tooMany'))
  })

  it('refuses what only looks like an array', () => {
    expect(checkList({ length: 1, 0: 'a' }, 8)).toEqual(fail('invalid'))
    expect(checkList('abc', 8)).toEqual(fail('invalid'))
    expect(checkList(undefined, 8)).toEqual(fail('required'))
  })
})

describe('matchKey and hasDuplicates', () => {
  it('compares names cleaned and without case', () => {
    expect(matchKey('  Iced   COFFEE ')).toBe(matchKey('iced coffee'))
    expect(matchKey('Cafe')).not.toBe(matchKey('Café'))
  })

  it('finds a repeated key', () => {
    expect(hasDuplicates(['a', 'b'])).toBe(false)
    expect(hasDuplicates(['a', 'b', 'a'])).toBe(true)
    expect(hasDuplicates([])).toBe(false)
  })
})

describe('combine', () => {
  it('gives every clean value when every check passed', () => {
    expect(combine({ name: pass('Cafe'), visible: pass(true) })).toEqual({ ok: true, value: { name: 'Cafe', visible: true } })
  })

  it('gives every problem and no value when any check failed', () => {
    expect(combine({ name: fail('required'), visible: pass(true), price: fail('range') })).toEqual({
      ok: false,
      errors: { name: 'required', price: 'range' },
    })
  })
})

describe('safely', () => {
  it('passes the result through when nothing throws', () => {
    expect(safely('name', () => combine({ name: pass('Cafe') }))).toEqual({ ok: true, value: { name: 'Cafe' } })
  })

  it('refuses input whose getter throws instead of throwing', () => {
    const hostile = {
      get name(): string {
        throw new Error('boom')
      },
    }
    const result = safely('name', () => combine({ name: checkText(readField(hostile, 'name'), { max: 40 }) }))
    expect(result).toEqual({ ok: false, errors: { name: 'invalid' } })
  })

  it('refuses a revoked proxy instead of throwing', () => {
    const { proxy, revoke } = Proxy.revocable({}, {})
    revoke()
    const result = safely('name', () => combine({ name: checkText(readField(proxy, 'name'), { max: 40 }) }))
    expect(result).toEqual({ ok: false, errors: { name: 'invalid' } })
  })
})
