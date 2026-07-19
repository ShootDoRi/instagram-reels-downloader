import { spawn, type ChildProcessWithoutNullStreams, type SpawnOptionsWithoutStdio } from 'node:child_process'
import { access, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { Cookie } from 'electron'
import type { DownloadProgress, DownloadRequest, DownloadResult } from '../shared/contracts'
import { makeDefaultFileStem, sanitizeFileStem } from '../shared/file-name'
import { parseInstagramMediaUrl } from '../shared/reel-url'
import { createTemporaryCookieFile, removeTemporaryCookieDirectory } from './cookies'
import { buildDownloadArgs, buildInfoArgs } from './ytdlp-args'

interface MediaInfo {
  id?: string
  title?: string
  description?: string
  upload_date?: string
  webpage_url?: string
  width?: number
  height?: number
}

interface ActiveDownload {
  child: ChildProcessWithoutNullStreams
  cancelled: boolean
  outputPath: string
}

export interface DownloadServiceOptions {
  ytdlpPath: string
  tempRoot: string
  getInstagramCookies: () => Promise<Cookie[]>
  onProgress: (progress: DownloadProgress) => void
  spawnCommand?: (command: string, args: readonly string[], options: SpawnOptionsWithoutStdio) => ChildProcessWithoutNullStreams
}

function mapDownloadError(value: string): string {
  const normalized = value.toLowerCase()
  if (normalized.includes('private') || normalized.includes('login required') || normalized.includes('not logged in')) {
    return '이 콘텐츠에 접근할 수 없습니다. Instagram 로그인 상태와 스토리 공개 시간을 확인해 주세요.'
  }
  if (normalized.includes('unable to download video') || normalized.includes('requested format is not available')) {
    return '선택한 화질의 MP4를 찾지 못했습니다. 최고 화질 옵션으로 다시 시도해 주세요.'
  }
  if (normalized.includes('http error 404') || normalized.includes('not available')) {
    return '릴스를 찾을 수 없습니다. URL이 올바른지 확인해 주세요.'
  }
  return '다운로드에 실패했습니다. 로그인 상태와 Instagram URL을 확인한 뒤 다시 시도해 주세요.'
}

function parseProgress(line: string): DownloadProgress | undefined {
  const match = /PROGRESS:\s*([0-9.]+)%\|([0-9]+|NA)\|([0-9]+|NA)/.exec(line)
  if (!match) return undefined
  const toNumber = (value: string): number | undefined => value === 'NA' ? undefined : Number(value)
  return {
    percent: Math.min(100, Math.max(0, Number(match[1]))),
    downloadedBytes: toNumber(match[2]),
    totalBytes: toNumber(match[3]),
    message: '영상 저장 중…'
  }
}

function writeMetadataText(info: MediaInfo, canonicalUrl: string): string {
  const lines = [
    `제목: ${info.title?.trim() || 'Instagram Media'}`,
    `게시일: ${info.upload_date || '알 수 없음'}`,
    `원본 URL: ${canonicalUrl}`
  ]
  if (info.description?.trim()) {
    lines.push('', '캡션:', info.description.trim())
  }
  return `${lines.join('\r\n')}\r\n`
}

async function fileStemIsUnused(directory: string, stem: string): Promise<boolean> {
  try {
    const entries = await readdir(directory)
    return !entries.some((entry) => entry === `${stem}.mp4` || entry === `${stem}.mp4.part`)
  } catch {
    return true
  }
}

async function uniqueFileStem(directory: string, desiredStem: string): Promise<string> {
  for (let index = 0; index < 10_000; index += 1) {
    const candidate = index === 0 ? desiredStem : `${desiredStem} (${index})`
    if (await fileStemIsUnused(directory, candidate)) return candidate
  }
  throw new Error('같은 이름의 파일이 너무 많습니다. 다른 파일명을 입력해 주세요.')
}

function runJsonCommand(
  spawnCommand: (command: string, args: readonly string[], options: SpawnOptionsWithoutStdio) => ChildProcessWithoutNullStreams,
  executable: string,
  args: string[]
): Promise<MediaInfo> {
  return new Promise((resolve, reject) => {
    const child = spawnCommand(executable, args, { shell: false, windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.once('error', reject)
    child.once('close', (code) => {
      if (code !== 0) return reject(new Error(mapDownloadError(`${stderr}\n${stdout}`)))
      try {
        resolve(JSON.parse(stdout.trim()) as MediaInfo)
      } catch {
        reject(new Error('Instagram 콘텐츠 정보를 읽지 못했습니다. 로그인 상태를 확인해 주세요.'))
      }
    })
  })
}

function runDownloadCommand(
  active: ActiveDownload,
  onProgress: (progress: DownloadProgress) => void
): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const child = active.child
    let stderr = ''
    let outputPath: string | undefined
    const processLine = (line: string) => {
      const progress = parseProgress(line)
      if (progress) onProgress(progress)
      const result = /^RESULT:(.+)$/m.exec(line)
      if (result) outputPath = result[1].trim()
    }
    let pendingStdout = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      pendingStdout += chunk
      const lines = pendingStdout.split(/\r?\n/)
      pendingStdout = lines.pop() ?? ''
      lines.forEach(processLine)
    })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.once('error', reject)
    child.once('close', (code) => {
      if (pendingStdout) processLine(pendingStdout)
      if (active.cancelled) return reject(new Error('다운로드를 취소했습니다.'))
      if (code !== 0) return reject(new Error(mapDownloadError(stderr)))
      resolve(outputPath)
    })
  })
}

export class DownloadService {
  private active: ActiveDownload | undefined
  private busy = false

  constructor(private readonly options: DownloadServiceOptions) {}

  isRunning(): boolean {
    return this.busy
  }

  cancel(): void {
    if (!this.active) return
    this.active.cancelled = true
    this.active.child.kill()
  }

  async download(request: DownloadRequest): Promise<DownloadResult> {
    if (this.busy) throw new Error('이미 다운로드가 진행 중입니다. 완료하거나 취소한 뒤 다시 시도해 주세요.')
    this.busy = true

    let cookieDirectory: string | undefined
    let outputPath: string | undefined
    try {
      const media = parseInstagramMediaUrl(request.url)
      if (!request.directory.trim()) throw new Error('저장 폴더를 선택해 주세요.')
      await mkdir(request.directory, { recursive: true })
      try {
        await access(this.options.ytdlpPath)
      } catch {
        throw new Error('다운로드 엔진을 찾을 수 없습니다. 앱을 다시 설치해 주세요.')
      }

      const cookies = (await this.options.getInstagramCookies()).filter((cookie) => (cookie.domain ?? '').toLowerCase().includes('instagram.com'))
      if (cookies.length === 0) throw new Error('Instagram 로그인 상태가 없습니다. 로그인 창에서 먼저 로그인해 주세요.')
      const cookieFile = await createTemporaryCookieFile(this.options.tempRoot, cookies)
      cookieDirectory = cookieFile.directory

      this.options.onProgress({ percent: 0, message: '릴스 정보를 확인 중…' })
      const info = await runJsonCommand(this.spawnCommand, this.options.ytdlpPath, buildInfoArgs(media.canonicalUrl, cookieFile.filePath))
      const suggestedStem = request.fileName.trim()
        ? sanitizeFileStem(request.fileName, makeDefaultFileStem(info.upload_date, media.mediaId))
        : makeDefaultFileStem(info.upload_date, media.mediaId)
      const stem = await uniqueFileStem(request.directory, suggestedStem)
      outputPath = join(request.directory, `${stem}.mp4`)
      const child = this.spawnCommand(this.options.ytdlpPath, buildDownloadArgs({
        url: media.canonicalUrl,
        cookiePath: cookieFile.filePath,
        outputTemplate: join(request.directory, `${stem}.%(ext)s`),
        quality: request.quality
      }), { shell: false, windowsHide: true })
      this.active = { child, cancelled: false, outputPath }
      const downloadPromise = runDownloadCommand(this.active, this.options.onProgress)
      this.options.onProgress({ percent: 0, message: '다운로드를 시작하는 중…' })
      const printedOutput = await downloadPromise
      const finalPath = printedOutput || outputPath
      const metadataPath = request.writeMetadata ? join(request.directory, `${stem}.txt`) : undefined
      if (metadataPath) await writeFile(metadataPath, writeMetadataText(info, media.canonicalUrl), { encoding: 'utf8', mode: 0o600 })
      this.options.onProgress({ percent: 100, message: '저장이 완료되었습니다.' })
      return { filePath: finalPath, metadataPath, title: info.title?.trim() || basename(finalPath), width: info.width, height: info.height }
    } catch (error) {
      if (this.active?.cancelled && outputPath) {
        await Promise.all([
          rm(outputPath, { force: true }),
          rm(`${outputPath}.part`, { force: true })
        ])
      }
      throw error
    } finally {
      this.active = undefined
      this.busy = false
      await removeTemporaryCookieDirectory(cookieDirectory)
    }
  }

  private get spawnCommand(): (command: string, args: readonly string[], options: SpawnOptionsWithoutStdio) => ChildProcessWithoutNullStreams {
    return this.options.spawnCommand ?? spawn
  }
}
