import { describe, expect, it } from 'vitest'
import { checkSocial, checkSocialLink, LINK_MAX } from './social'

const passes = (value: string) => ({ ok: true, value })
const refused = { ok: false, error: 'invalid' }

describe('checkSocialLink', () => {
  it('reads an empty or missing link as none', () => {
    expect(checkSocialLink('facebook', '')).toEqual(passes(''))
    expect(checkSocialLink('facebook', '   ')).toEqual(passes(''))
    expect(checkSocialLink('tiktok', undefined)).toEqual(passes(''))
    expect(checkSocialLink('website', null)).toEqual(passes(''))
  })

  it.each([
    ['facebook', 'https://www.facebook.com/cafeluna', 'https://www.facebook.com/cafeluna'],
    ['facebook', 'https://m.facebook.com/cafeluna', 'https://m.facebook.com/cafeluna'],
    ['facebook', 'https://fb.com/cafeluna', 'https://fb.com/cafeluna'],
    ['facebook', 'facebook.com/cafeluna', 'https://facebook.com/cafeluna'],
    ['instagram', 'https://instagram.com/cafeluna', 'https://instagram.com/cafeluna'],
    ['instagram', ' www.instagram.com/cafeluna/ ', 'https://www.instagram.com/cafeluna/'],
    ['tiktok', 'https://www.tiktok.com/@cafeluna', 'https://www.tiktok.com/@cafeluna'],
    ['website', 'https://cafeluna.ph', 'https://cafeluna.ph/'],
    ['website', 'cafeluna.example.com/menu', 'https://cafeluna.example.com/menu'],
  ] as const)('takes a %s link %j', (network, typed, stored) => {
    expect(checkSocialLink(network, typed)).toEqual(passes(stored))
  })

  it.each([
    ['facebook', 'https://instagram.com/cafeluna'],
    ['facebook', 'https://evilfacebook.com/cafeluna'],
    ['facebook', 'https://facebook.com.evil.example/cafeluna'],
    ['facebook', 'https://facebook.com:8443/cafeluna'],
    ['facebook', 'http://facebook.com/cafeluna'],
    ['facebook', 'javascript:alert(1)//facebook.com'],
    ['facebook', 'https://facebook.com@evil.example/'],
    ['facebook', 'https://me:pw@facebook.com/cafeluna'],
    ['instagram', 'https://instagr.am/cafeluna'],
    ['tiktok', 'https://tiktok.co/@cafeluna'],
    ['website', 'http://cafeluna.ph'],
    ['website', 'ftp://cafeluna.ph'],
    ['website', 'data:text/html,hello'],
    ['website', 'https://localhost:3000'],
    ['website', 'https://cafe luna.ph'],
  ] as const)('refuses a %s link %j', (network, typed) => {
    expect(checkSocialLink(network, typed)).toEqual(refused)
  })

  it('refuses a link that is too long', () => {
    expect(checkSocialLink('website', `https://cafeluna.ph/${'a'.repeat(LINK_MAX)}`)).toEqual({ ok: false, error: 'tooLong' })
  })

  it('refuses what is not text', () => {
    expect(checkSocialLink('website', 42)).toEqual(refused)
    expect(checkSocialLink('website', ['https://cafeluna.ph'])).toEqual(refused)
  })
})

describe('checkSocial', () => {
  it('takes all four links and reads missing ones as none', () => {
    expect(checkSocial({ facebook: 'facebook.com/cafeluna', website: 'https://cafeluna.ph' })).toEqual({
      ok: true,
      value: { facebook: 'https://facebook.com/cafeluna', instagram: '', tiktok: '', website: 'https://cafeluna.ph/' },
    })
  })

  it('gives the first problem in the order of the networks', () => {
    expect(checkSocial({ facebook: 'https://cafeluna.ph', tiktok: 'x'.repeat(LINK_MAX + 1) })).toEqual(refused)
    expect(checkSocial({ tiktok: 'x'.repeat(LINK_MAX + 1), website: 'http://cafeluna.ph' })).toEqual({ ok: false, error: 'tooLong' })
  })

  it.each([null, undefined, 'https://facebook.com/cafeluna', []])('refuses %j, which is not a set of links', (value) => {
    expect(checkSocial(value)).toEqual(refused)
  })
})
