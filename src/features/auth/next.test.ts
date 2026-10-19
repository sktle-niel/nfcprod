import { describe, expect, it } from 'vitest'
import { safeNext } from './next'

describe('safeNext', () => {
  it.each([
    ['/dashboard', '/dashboard'],
    ['/dashboard/menu?tab=items', '/dashboard/menu?tab=items'],
    ['/dashboard#theme', '/dashboard#theme'],
    ['/?order=cards', '/?order=cards'],
  ])('keeps %j', (value, expected) => {
    expect(safeNext(value)).toBe(expected)
  })

  it.each([
    null,
    '',
    'dashboard',
    '//evil.example/dashboard',
    'https://evil.example',
    '/\\evil.example',
    '/admin',
    '/dashboardx',
    '/dashboard%2F..%2Fadmin',
    '/?order=cards&x=1',
    '/?order=other',
  ])('sends %j to the dashboard instead', (value) => {
    expect(safeNext(value)).toBe('/dashboard')
  })
})
