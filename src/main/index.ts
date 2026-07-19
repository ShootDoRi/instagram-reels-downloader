import { app, BrowserWindow, dialog, ipcMain, session, shell, type OpenDialogOptions, type Session } from 'electron'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { DownloadRequest } from '../shared/contracts'
import { DownloadService } from './download-service'
import { ExternalLoginManager } from './external-login'

app.setName('Instagram 릴스 다운로더')

const instagramPartition = 'persist:instagram'
let instagramSession!: Session
let mainWindow: BrowserWindow | undefined
let downloadService!: DownloadService
let externalLogin!: ExternalLoginManager

function rendererTarget(): BrowserWindow | undefined {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined
}

function defaultDirectory(): string {
  return join(app.getPath('downloads'), 'Instagram Reels')
}

function ytdlpPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'yt-dlp.exe')
    : join(app.getAppPath(), 'resources', 'yt-dlp.exe')
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 960,
    minWidth: 780,
    height: 760,
    minHeight: 660,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#101019',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  window.once('ready-to-show', () => window.show())
  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
  window.on('closed', () => { if (mainWindow === window) mainWindow = undefined })
  return window
}

async function clearInstagramSession(): Promise<void> {
  const cookies = await instagramSession.cookies.get({})
  await Promise.all(cookies.map(async (cookie) => {
    const host = (cookie.domain ?? '').replace(/^\./, '')
    if (!host) return
    const protocol = cookie.secure ? 'https' : 'http'
    await instagramSession.cookies.remove(`${protocol}://${host}${cookie.path || '/'}`, cookie.name)
  }))
  await instagramSession.clearStorageData()
  await instagramSession.clearCache()
  await instagramSession.clearAuthCache()
}

function registerIpc(): void {
  ipcMain.handle('get-status', async () => {
    const directory = defaultDirectory()
    await mkdir(directory, { recursive: true })
    try {
      await import('node:fs/promises').then(({ access }) => access(ytdlpPath()))
      const cookies = await instagramSession.cookies.get({})
      const loggedIn = cookies.some((cookie) => cookie.name === 'sessionid' && (cookie.domain ?? '').includes('instagram.com'))
      return { defaultDirectory: directory, downloaderReady: true, loggedIn }
    } catch {
      return { defaultDirectory: directory, downloaderReady: false, loggedIn: false }
    }
  })

  ipcMain.handle('choose-directory', async () => {
    const options: OpenDialogOptions = {
      title: '저장 폴더 선택',
      defaultPath: defaultDirectory(),
      properties: ['openDirectory', 'createDirectory']
    }
    const owner = rendererTarget()
    const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options)
    return result.canceled ? undefined : result.filePaths[0]
  })

  ipcMain.handle('open-login', () => {
    if (externalLogin.isRunning()) throw new Error('이미 로그인 브라우저가 열려 있습니다.')
    void externalLogin.start().catch(() => undefined)
  })
  ipcMain.handle('complete-login', async () => externalLogin.complete())
  ipcMain.handle('logout', async () => {
    if (downloadService.isRunning()) throw new Error('다운로드가 끝난 뒤 로그아웃할 수 있습니다.')
    await externalLogin.clearProfile()
    await clearInstagramSession()
    rendererTarget()?.webContents.send('auth-status', { state: 'logged-out', message: 'Instagram 로그인 세션을 삭제했습니다.' })
  })

  ipcMain.handle('start-download', async (_event, request: DownloadRequest) => {
    const cookies = await instagramSession.cookies.get({})
    const loggedIn = cookies.some((cookie) => cookie.name === 'sessionid' && (cookie.domain ?? '').includes('instagram.com'))
    if (!loggedIn) {
      rendererTarget()?.webContents.send('download-error', 'Chrome 로그인 창을 닫으면 세션이 자동 연결됩니다. 상단에 Instagram 로그인됨이 표시된 뒤 다시 시도해 주세요.')
      return
    }
    void downloadService.download(request)
      .then((result) => rendererTarget()?.webContents.send('download-complete', result))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : '다운로드 중 알 수 없는 오류가 발생했습니다.'
        rendererTarget()?.webContents.send('download-error', message)
      })
  })
  ipcMain.handle('cancel-download', () => downloadService.cancel())
  ipcMain.handle('open-path', async (_event, targetPath: string) => {
    const error = await shell.openPath(targetPath)
    if (error) throw new Error('파일을 열 수 없습니다.')
  })
}

app.whenReady().then(() => {
  instagramSession = session.fromPartition(instagramPartition)
  externalLogin = new ExternalLoginManager({
    profilePath: join(app.getPath('userData'), 'ExternalLoginProfileV2'),
    targetSession: instagramSession,
    onStatus: (status) => {
      rendererTarget()?.webContents.send('auth-status', status)
      if (status.state === 'ready' || status.state === 'logged-in') {
        rendererTarget()?.show()
        rendererTarget()?.focus()
      }
    }
  })
  downloadService = new DownloadService({
    ytdlpPath: ytdlpPath(),
    tempRoot: app.getPath('temp'),
    getInstagramCookies: () => instagramSession.cookies.get({}),
    onProgress: (progress) => rendererTarget()?.webContents.send('download-progress', progress)
  })
  registerIpc()
  mainWindow = createMainWindow()
  mainWindow.webContents.once('did-finish-load', () => {
    void externalLogin.restoreIfAvailable()
  })
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => externalLogin?.stop())
