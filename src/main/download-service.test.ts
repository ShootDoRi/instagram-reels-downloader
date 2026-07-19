import { spawn } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { Cookie } from 'electron'
import type { DownloadProgress } from '../shared/contracts'
import { DownloadService } from './download-service'

const fixture = fileURLToPath(new URL('./test-fake-ytdlp.mjs', import.meta.url))
const cookie = { domain: '.instagram.com', path: '/', secure: true, httpOnly: true, session: true, name: 'sessionid', value: 'not-logged-value' } as Cookie

async function withTempDirectory<T>(callback: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), 'ig-reels-test-'))
  try {
    return await callback(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

function createService(directory: string, mode: string, onProgress: (event: DownloadProgress) => void = () => undefined): DownloadService {
  return new DownloadService({
    ytdlpPath: process.execPath,
    tempRoot: directory,
    getInstagramCookies: async () => [cookie],
    onProgress,
    spawnCommand: (_command, args, options) => spawn(process.execPath, [fixture, '--fake-mode', mode, ...args], options)
  })
}

describe('DownloadService', () => {
  it('가짜 다운로더로 MP4와 선택 메타데이터를 저장하고 임시 쿠키를 제거한다', async () => {
    await withTempDirectory(async (directory) => {
      const outputDirectory = join(directory, 'output')
      const progress: number[] = []
      const service = createService(directory, 'success', (event) => progress.push(event.percent))
      const result = await service.download({
        url: 'https://www.instagram.com/reel/Fake_Reel/',
        directory: outputDirectory,
        quality: 'best',
        fileName: '내 테스트: 릴스',
        writeMetadata: true
      })
      expect(await readFile(result.filePath, 'utf8')).toBe('fake video')
      expect(await readFile(result.metadataPath!, 'utf8')).toContain('테스트 캡션')
      expect(progress).toContain(50)
      expect((await readdir(directory)).filter((entry) => entry.startsWith('ig-reels-cookies-'))).toEqual([])
    })
  })

  it('로그인 오류와 잘못된 URL 이후에도 작업 잠금을 해제한다', async () => {
    await withTempDirectory(async (directory) => {
      const service = createService(directory, 'login-required')
      await expect(service.download({
        url: 'https://www.instagram.com/reel/Fake_Reel/', directory, quality: 'best', fileName: '', writeMetadata: false
      })).rejects.toThrow('접근할 수 없습니다')
      expect(service.isRunning()).toBe(false)
      await expect(service.download({
        url: 'https://www.instagram.com/p/Fake_Reel/', directory, quality: 'best', fileName: '', writeMetadata: false
      })).rejects.toThrow('릴스 또는 동영상 스토리')
      expect(service.isRunning()).toBe(false)
    })
  })

  it('취소하면 생성 중인 파일을 남기지 않는다', async () => {
    await withTempDirectory(async (directory) => {
      let cancelNow: (() => void) | undefined
      const service = createService(directory, 'slow', (event) => {
        if (event.message === '다운로드를 시작하는 중…') cancelNow?.()
      })
      cancelNow = () => service.cancel()
      const pending = service.download({
        url: 'https://www.instagram.com/reel/Fake_Reel/', directory, quality: 'best', fileName: 'cancelled', writeMetadata: false
      })
      await expect(pending).rejects.toThrow('취소했습니다')
      await expect(stat(join(directory, 'cancelled.mp4'))).rejects.toThrow()
      expect(service.isRunning()).toBe(false)
    })
  })
})
