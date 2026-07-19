import { spawn, type ChildProcess } from 'node:child_process'
import { access, mkdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { CookiesSetDetails, Session } from 'electron'
import type { AuthStatus } from '../shared/contracts'

interface CdpCookie {
  name: string
  value: string
  domain: string
  path: string
  expires: number
  httpOnly: boolean
  secure: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

interface CdpMessage {
  id?: number
  result?: unknown
  error?: { message?: string }
}

const instagramLoginUrl = 'https://www.instagram.com/accounts/login/'

export function browserExecutableCandidates(environment: NodeJS.ProcessEnv = process.env): string[] {
  const values = [
    environment.LOCALAPPDATA && join(environment.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    environment.PROGRAMFILES && join(environment.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    environment['PROGRAMFILES(X86)'] && join(environment['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
    environment.PROGRAMFILES && join(environment.PROGRAMFILES, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    environment['PROGRAMFILES(X86)'] && join(environment['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  ]
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

async function findBrowserExecutable(): Promise<string> {
  for (const candidate of browserExecutableCandidates()) {
    try {
      await access(candidate)
      return candidate
    } catch {
      // 다음 Chrome 계열 브라우저를 확인합니다.
    }
  }
  throw new Error('Chrome 또는 Microsoft Edge를 찾지 못했습니다.')
}

export function toElectronCookieDetails(cookie: CdpCookie): CookiesSetDetails | undefined {
  const host = cookie.domain.replace(/^\./, '')
  if (!host.toLowerCase().includes('instagram.com')) return undefined
  const sameSite = cookie.sameSite === 'Strict'
    ? 'strict'
    : cookie.sameSite === 'Lax'
      ? 'lax'
      : cookie.sameSite === 'None'
        ? 'no_restriction'
        : 'unspecified'
  return {
    url: `${cookie.secure ? 'https' : 'http'}://${host}${cookie.path || '/'}`,
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path || '/',
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite,
    ...(cookie.expires > 0 ? { expirationDate: cookie.expires } : {})
  }
}

export async function saveInstagramCookies(targetSession: Session, cookies: CdpCookie[]): Promise<number> {
  const details = cookies.map(toElectronCookieDetails).filter((cookie): cookie is CookiesSetDetails => Boolean(cookie))
  for (const cookie of details) await targetSession.cookies.set(cookie)
  targetSession.cookies.flushStore()
  return details.length
}

class CdpClient {
  private nextId = 1
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()

  private constructor(private readonly socket: WebSocket) {
    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(String(event.data)) as CdpMessage
        if (!message.id) return
        const request = this.pending.get(message.id)
        if (!request) return
        this.pending.delete(message.id)
        if (message.error) request.reject(new Error(message.error.message || '브라우저 연결 오류'))
        else request.resolve(message.result)
      } catch {
        // Chrome의 관련 없는 DevTools 이벤트는 무시합니다.
      }
    })
    socket.addEventListener('close', () => {
      for (const request of this.pending.values()) request.reject(new Error('로그인 브라우저가 닫혔습니다.'))
      this.pending.clear()
    })
  }

  static connect(url: string): Promise<CdpClient> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url)
      const onError = () => reject(new Error('Chrome 로그인 세션에 연결하지 못했습니다.'))
      socket.addEventListener('error', onError, { once: true })
      socket.addEventListener('open', () => {
        socket.removeEventListener('error', onError)
        resolve(new CdpClient(socket))
      }, { once: true })
    })
  }

  send<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: (value) => resolve(value as T), reject })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  close(): void {
    this.socket.close()
  }
}

async function waitForDevTools(profilePath: string, child: ChildProcess): Promise<string> {
  const portFile = join(profilePath, 'DevToolsActivePort')
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (child.exitCode !== null) throw new Error('로그인 브라우저가 시작 직후 종료되었습니다.')
    try {
      const [port, webSocketPath] = (await readFile(portFile, 'utf8')).trim().split(/\r?\n/)
      if (/^\d+$/.test(port) && webSocketPath?.startsWith('/')) return `ws://127.0.0.1:${port}${webSocketPath}`
    } catch {
      // Chrome이 DevTools 포트를 준비할 때까지 기다립니다.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('로그인 브라우저 연결 시간이 초과되었습니다.')
}

export interface ExternalLoginOptions {
  profilePath: string
  targetSession: Session
  onStatus: (status: AuthStatus) => void
}

export class ExternalLoginManager {
  private child: ChildProcess | undefined
  private client: CdpClient | undefined
  private stage: 'idle' | 'browser' | 'ready' | 'connecting' = 'idle'
  private browserPath: string | undefined

  constructor(private readonly options: ExternalLoginOptions) {}

  isRunning(): boolean {
    return this.stage === 'browser' || this.stage === 'connecting'
  }

  async start(): Promise<void> {
    if (this.stage === 'browser') throw new Error('이미 로그인 브라우저가 열려 있습니다.')
    if (this.stage === 'connecting') throw new Error('로그인 세션을 확인하고 있습니다.')
    this.options.onStatus({ state: 'opening', message: 'Chrome 또는 Edge 로그인 창을 여는 중…' })
    try {
      const browserPath = await findBrowserExecutable()
      this.browserPath = browserPath
      await mkdir(this.options.profilePath, { recursive: true })
      const child = spawn(browserPath, [
        `--user-data-dir=${this.options.profilePath}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-mode',
        '--new-window',
        instagramLoginUrl
      ], { shell: false, windowsHide: false, stdio: 'ignore' })
      this.child = child
      await new Promise<void>((resolve, reject) => {
        child.once('spawn', resolve)
        child.once('error', reject)
      })
      this.stage = 'browser'
      this.options.onStatus({ state: 'waiting', message: '브라우저에서 로그인한 뒤 창을 완전히 닫아 주세요.' })
      child.once('exit', () => {
        if (this.stage !== 'browser') return
        this.child = undefined
        this.stage = 'ready'
        this.options.onStatus({ state: 'ready', message: '브라우저가 닫혔습니다. 로그인 세션을 자동으로 연결합니다.' })
        setTimeout(() => {
          if (this.stage === 'ready') void this.complete().catch(() => undefined)
        }, 500)
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '로그인 브라우저를 열지 못했습니다.'
      this.stage = 'idle'
      this.options.onStatus({ state: 'error', message })
      throw error
    }
  }

  async complete(): Promise<void> {
    if (this.stage === 'browser') throw new Error('먼저 로그인 브라우저 창을 완전히 닫아 주세요.')
    if (this.stage === 'connecting') throw new Error('이미 로그인 세션을 확인하고 있습니다.')
    this.stage = 'connecting'
    this.options.onStatus({ state: 'connecting', message: '로그인 세션을 안전하게 연결하는 중…' })
    try {
      const browserPath = this.browserPath ?? await findBrowserExecutable()
      await mkdir(this.options.profilePath, { recursive: true })
      await rm(join(this.options.profilePath, 'DevToolsActivePort'), { force: true })
      const child = spawn(browserPath, [
        '--headless=new',
        '--disable-gpu',
        '--remote-debugging-port=0',
        '--remote-debugging-address=127.0.0.1',
        `--user-data-dir=${this.options.profilePath}`,
        '--no-first-run',
        '--disable-background-mode',
        'about:blank'
      ], { shell: false, windowsHide: true, stdio: 'ignore' })
      this.child = child
      const webSocketUrl = await Promise.race([
        waitForDevTools(this.options.profilePath, child),
        new Promise<never>((_resolve, reject) => child.once('error', reject))
      ])
      const client = await CdpClient.connect(webSocketUrl)
      this.client = client
      const response = await client.send<{ cookies: CdpCookie[] }>('Storage.getCookies')
      const instagramCookies = response.cookies.filter((cookie) => cookie.domain.toLowerCase().includes('instagram.com'))
      const loggedIn = instagramCookies.some((cookie) => cookie.name === 'sessionid' && cookie.value)
      if (!loggedIn) throw new Error('Instagram 로그인 상태를 찾지 못했습니다. 브라우저 로그인을 다시 진행해 주세요.')
      await saveInstagramCookies(this.options.targetSession, instagramCookies)
      this.options.onStatus({ state: 'logged-in', message: 'Instagram 로그인 상태를 확인했습니다.' })
      void client.send('Browser.close').catch(() => undefined)
      this.stage = 'idle'
    } catch (error) {
      const message = error instanceof Error ? error.message : '로그인 세션을 연결하지 못했습니다.'
      this.stage = 'ready'
      this.options.onStatus({ state: 'error', message })
      throw error
    } finally {
      this.client?.close()
      this.client = undefined
      if (this.child && this.child.exitCode === null) this.child.kill()
      this.child = undefined
    }
  }

  async restoreIfAvailable(): Promise<boolean> {
    if (this.stage !== 'idle') return false
    const cookieFiles = [
      join(this.options.profilePath, 'Default', 'Network', 'Cookies'),
      join(this.options.profilePath, 'Default', 'Cookies')
    ]
    let profileExists = false
    for (const cookieFile of cookieFiles) {
      try {
        await access(cookieFile)
        profileExists = true
        break
      } catch {
        // 다른 Chrome 버전의 쿠키 경로도 확인합니다.
      }
    }
    if (!profileExists) return false
    try {
      await this.complete()
      return true
    } catch {
      return false
    }
  }

  stop(): void {
    this.client?.close()
    if (this.child && this.child.exitCode === null) this.child.kill()
    this.client = undefined
    this.child = undefined
    this.stage = 'idle'
  }

  async clearProfile(): Promise<void> {
    this.stop()
    await rm(this.options.profilePath, { recursive: true, force: true, maxRetries: 3 })
  }
}
