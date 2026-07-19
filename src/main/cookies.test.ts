import { describe, expect, it } from 'vitest'
import type { Cookie } from 'electron'
import { toNetscapeCookieFile } from './cookies'

describe('toNetscapeCookieFile', () => {
  it('HttpOnly 쿠키를 Netscape 형식으로 변환한다', () => {
    const cookie = {
      domain: '.instagram.com',
      path: '/',
      secure: true,
      httpOnly: true,
      session: false,
      expirationDate: 1_800_000_000,
      name: 'sessionid',
      value: 'secret'
    } as Cookie
    const output = toNetscapeCookieFile([cookie])
    expect(output).toContain('#HttpOnly_.instagram.com\tTRUE\t/\tTRUE\t1800000000\tsessionid\tsecret')
  })
})
