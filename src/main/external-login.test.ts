import { describe, expect, it } from 'vitest'
import { browserExecutableCandidates, toElectronCookieDetails } from './external-login'

describe('external browser login', () => {
  it('Chrome을 Edge보다 먼저 찾는다', () => {
    const candidates = browserExecutableCandidates({
      LOCALAPPDATA: 'C:\\Users\\tester\\AppData\\Local',
      PROGRAMFILES: 'C:\\Program Files',
      'PROGRAMFILES(X86)': 'C:\\Program Files (x86)'
    })
    expect(candidates[0]).toContain('Google\\Chrome')
    expect(candidates.at(-1)).toContain('Microsoft\\Edge')
  })

  it('Instagram CDP 쿠키를 Electron 쿠키 형식으로 변환한다', () => {
    expect(toElectronCookieDetails({
      name: 'sessionid', value: 'secret', domain: '.instagram.com', path: '/', expires: 1_900_000_000,
      httpOnly: true, secure: true, sameSite: 'None'
    })).toMatchObject({
      url: 'https://instagram.com/', name: 'sessionid', value: 'secret', domain: '.instagram.com',
      secure: true, httpOnly: true, sameSite: 'no_restriction', expirationDate: 1_900_000_000
    })
  })
})
