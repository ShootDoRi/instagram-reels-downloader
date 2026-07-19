import { describe, expect, it } from 'vitest'
import { buildDownloadArgs, formatSelector } from './ytdlp-args'

describe('yt-dlp arguments', () => {
  it('각 화질에 MP4 단일 파일 선택자를 만든다', () => {
    expect(formatSelector('best')).toContain('best[ext=mp4]')
    expect(formatSelector('1080')).toContain('height<=1080')
    expect(formatSelector('720')).toContain('height<=720')
  })

  it('셸을 거치지 않는 다운로드 인수를 구성한다', () => {
    const args = buildDownloadArgs({
      url: 'https://www.instagram.com/reel/test/',
      cookiePath: 'C:\\Temp\\cookies.txt',
      outputTemplate: 'C:\\Downloads\\test.%(ext)s',
      quality: 'best'
    })
    expect(args).toContain('--cookies')
    expect(args).toContain('C:\\Temp\\cookies.txt')
    expect(args).toContain('--no-part')
    expect(args).toContain('https://www.instagram.com/reel/test/')
  })
})
