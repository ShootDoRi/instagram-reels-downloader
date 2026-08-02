import { describe, expect, it } from 'vitest'
import { buildDownloadArgs, buildInfoArgs, formatSelector } from './ytdlp-args'

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
    expect(args).toContain('before_dl:START:%(filename)s')
    expect(args).toContain('https://www.instagram.com/reel/test/')
  })

  it('프로필형 스토리 URL에서는 활성 동영상 목록 처리를 허용한다', () => {
    const url = 'https://www.instagram.com/stories/test.user/'
    expect(buildInfoArgs(url, 'cookies.txt', true)).not.toContain('--no-playlist')
    expect(buildDownloadArgs({
      url,
      cookiePath: 'cookies.txt',
      outputTemplate: 'story_%(playlist_index)02d_%(id)s.%(ext)s',
      quality: 'best',
      allowPlaylist: true
    })).not.toContain('--no-playlist')
  })
})
