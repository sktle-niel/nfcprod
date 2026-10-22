import { describe, expect, it } from 'vitest'
import { cleanLines } from './lines'

describe('cleanLines', () => {
  it('keeps line breaks and cleans each line', () => {
    expect(cleanLines('  Mon to Fri    8am to 5pm  \n   Sat  9am to 3pm ', 6)).toBe('Mon to Fri 8am to 5pm\nSat 9am to 3pm')
  })

  it('reads Windows and old Mac line breaks as line breaks', () => {
    expect(cleanLines('Mon\r\nTue\rWed', 6)).toBe('Mon\nTue\nWed')
  })

  it('drops control characters other than line feeds', () => {
    expect(cleanLines('Mon\u0000day\tOpen\u0007\nSun\u001bclosed', 6)).toBe('Mon day Open\nSun closed')
  })

  it('drops empty and blank lines', () => {
    expect(cleanLines('\n\nMon\n   \n\t\nTue\n\n', 6)).toBe('Mon\nTue')
  })

  it('treats a Unicode line separator as a space, not a new line', () => {
    expect(cleanLines('Mon Tue', 6)).toBe('Mon Tue')
  })

  it('joins the lines past the limit onto the last one, so nothing typed is lost', () => {
    const typed = ['1', '2', '3', '4', '5', '6', '7', '8'].join('\n')
    expect(cleanLines(typed, 6)).toBe('1\n2\n3\n4\n5\n6 7 8')
  })

  it('keeps at least one line', () => {
    expect(cleanLines('a\nb', 1)).toBe('a b')
    expect(cleanLines('a\nb', 0)).toBe('a b')
    expect(cleanLines('a\nb', -3)).toBe('a b')
  })

  it('gives an empty text for nothing but spaces', () => {
    expect(cleanLines('', 6)).toBe('')
    expect(cleanLines(' \n \r\n ', 6)).toBe('')
  })
})
