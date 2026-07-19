import { describe, expect, it } from 'vitest'
import { makeDefaultFileStem, sanitizeFileStem } from './file-name'

describe('sanitizeFileStem', () => {
  it('Windows에서 금지된 문자를 제거하고 예약 이름을 피한다', () => {
    expect(sanitizeFileStem('  summer:reel?  ', 'fallback')).toBe('summer reel')
    expect(sanitizeFileStem('CON', 'fallback')).toBe('CON_')
    expect(sanitizeFileStem('....', 'fallback')).toBe('fallback')
  })

  it('기본 파일명에는 게시일과 shortcode를 사용한다', () => {
    expect(makeDefaultFileStem('20260719', 'Cxa12')).toBe('20260719_Cxa12')
  })
})
