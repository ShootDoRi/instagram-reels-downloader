import { describe, expect, it } from 'vitest'
import { parseInstagramMediaUrl } from './reel-url'

describe('parseInstagramMediaUrl', () => {
  it('정규화된 릴스 URL과 shortcode를 반환한다', () => {
    expect(parseInstagramMediaUrl('https://www.instagram.com/reel/Cx_A-42/?igsh=example')).toEqual({
      canonicalUrl: 'https://www.instagram.com/reel/Cx_A-42/',
      mediaId: 'Cx_A-42',
      kind: 'reel'
    })
  })

  it('사용자명과 숫자 ID가 포함된 스토리 URL을 허용한다', () => {
    expect(parseInstagramMediaUrl('https://www.instagram.com/stories/ye.s_day/3944584301409041186/?utm_source=test')).toEqual({
      canonicalUrl: 'https://www.instagram.com/stories/ye.s_day/3944584301409041186/',
      mediaId: '3944584301409041186',
      kind: 'story'
    })
  })

  it('일반 게시물과 다른 도메인을 거절한다', () => {
    expect(() => parseInstagramMediaUrl('https://www.instagram.com/p/Cx_A-42/')).toThrow('릴스 또는 동영상 스토리')
    expect(() => parseInstagramMediaUrl('https://instagram.example/reel/Cx_A-42/')).toThrow('Instagram의 https')
    expect(() => parseInstagramMediaUrl('http://www.instagram.com/reel/Cx_A-42/')).toThrow('Instagram의 https')
  })
})
