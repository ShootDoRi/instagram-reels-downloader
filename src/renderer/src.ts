import type { DownloadQuality, DownloadResult } from '../shared/contracts'
import './style.css'

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing element: ${id}`)
  return element as T
}

const form = byId<HTMLFormElement>('download-form')
const urlInput = byId<HTMLInputElement>('reel-url')
const directoryInput = byId<HTMLInputElement>('save-directory')
const qualityInput = byId<HTMLSelectElement>('quality')
const fileNameInput = byId<HTMLInputElement>('file-name')
const metadataInput = byId<HTMLInputElement>('write-metadata')
const downloadButton = byId<HTMLButtonElement>('download-button')
const cancelButton = byId<HTMLButtonElement>('cancel-button')
const loginButton = byId<HTMLButtonElement>('login-button')
const completeLoginButton = byId<HTMLButtonElement>('complete-login-button')
const logoutButton = byId<HTMLButtonElement>('logout-button')
const sessionNote = byId<HTMLElement>('session-note')
const chooseDirectoryButton = byId<HTMLButtonElement>('choose-directory')
const message = byId<HTMLParagraphElement>('form-message')
const engineStatus = byId<HTMLSpanElement>('engine-status')
const progressArea = byId<HTMLElement>('progress-area')
const progressMessage = byId<HTMLSpanElement>('progress-message')
const progressPercent = byId<HTMLElement>('progress-percent')
const progressBar = byId<HTMLElement>('progress-bar')
const resultCard = byId<HTMLElement>('result-card')
const resultTitle = byId<HTMLElement>('result-title')
const resultDetail = byId<HTMLElement>('result-detail')
const openResultButton = byId<HTMLButtonElement>('open-result')

let isDownloading = false
let lastResult: DownloadResult | undefined
let isAuthenticated = false
let downloaderReady = false

function updateDownloadAvailability(): void {
  downloadButton.disabled = isDownloading || !isAuthenticated || !downloaderReady
}

function setMessage(text: string, state: 'normal' | 'error' | 'success' = 'normal'): void {
  message.textContent = text
  message.dataset.state = state
}

function setDownloading(active: boolean): void {
  isDownloading = active
  updateDownloadAvailability()
  cancelButton.hidden = !active
  loginButton.disabled = active
  logoutButton.disabled = active
  chooseDirectoryButton.disabled = active
  urlInput.disabled = active
  qualityInput.disabled = active
  fileNameInput.disabled = active
  metadataInput.disabled = active
}

function setProgress(percent: number, text: string): void {
  const safePercent = Math.min(100, Math.max(0, percent))
  progressArea.hidden = false
  progressMessage.textContent = text
  progressPercent.textContent = `${Math.round(safePercent)}%`
  progressBar.style.width = `${safePercent}%`
}

function showResult(result: DownloadResult): void {
  lastResult = result
  resultCard.hidden = false
  const dimensions = result.width && result.height ? ` · ${result.width}×${result.height}` : ''
  resultTitle.textContent = result.title
  resultDetail.textContent = `${result.filePath}${dimensions}`
}

async function initialize(): Promise<void> {
  try {
    const status = await window.appApi.getStatus()
    directoryInput.value = status.defaultDirectory
    downloaderReady = status.downloaderReady
    isAuthenticated = status.loggedIn
    updateDownloadAvailability()
    sessionNote.textContent = status.loggedIn ? 'Instagram 로그인됨' : 'Instagram 로그인 필요'
    engineStatus.textContent = status.downloaderReady ? '다운로드 엔진 준비됨' : '다운로드 엔진 없음'
    engineStatus.dataset.state = status.downloaderReady ? 'ready' : 'error'
    if (!status.downloaderReady) {
      setMessage('다운로드 엔진을 찾지 못했습니다. 앱을 다시 설치해 주세요.', 'error')
      updateDownloadAvailability()
    }
  } catch {
    setMessage('앱 상태를 읽지 못했습니다. 앱을 다시 실행해 주세요.', 'error')
  }
}

loginButton.addEventListener('click', async () => {
  try {
    await window.appApi.openLogin()
    setMessage('열린 Chrome 또는 Edge 창에서 Instagram에 직접 로그인해 주세요.')
  } catch {
    setMessage('로그인 창을 열지 못했습니다.', 'error')
  }
})

completeLoginButton.addEventListener('click', async () => {
  try {
    completeLoginButton.disabled = true
    await window.appApi.completeLogin()
  } catch (error) {
    setMessage(error instanceof Error ? error.message : '로그인 상태를 확인하지 못했습니다.', 'error')
  } finally {
    completeLoginButton.disabled = false
  }
})

logoutButton.addEventListener('click', async () => {
  try {
    await window.appApi.logout()
    isAuthenticated = false
    updateDownloadAvailability()
    sessionNote.textContent = 'Instagram 로그인 필요'
    setMessage('Instagram 로그인 세션을 삭제했습니다.', 'success')
  } catch (error) {
    setMessage(error instanceof Error ? error.message : '로그아웃하지 못했습니다.', 'error')
  }
})

chooseDirectoryButton.addEventListener('click', async () => {
  const selected = await window.appApi.chooseDirectory()
  if (selected) directoryInput.value = selected
})

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  resultCard.hidden = true
  if (!urlInput.value.trim()) {
    setMessage('릴스 또는 동영상 스토리 URL을 입력해 주세요.', 'error')
    urlInput.focus()
    return
  }
  setDownloading(true)
  setProgress(0, '다운로드 요청을 준비하는 중…')
  setMessage('릴스 정보를 확인하는 중입니다.')
  try {
    await window.appApi.startDownload({
      url: urlInput.value,
      directory: directoryInput.value,
      quality: qualityInput.value as DownloadQuality,
      fileName: fileNameInput.value,
      writeMetadata: metadataInput.checked
    })
  } catch (error) {
    setDownloading(false)
    setMessage(error instanceof Error ? error.message : '다운로드를 시작하지 못했습니다.', 'error')
  }
})

cancelButton.addEventListener('click', async () => {
  cancelButton.disabled = true
  setMessage('다운로드를 취소하는 중입니다.')
  await window.appApi.cancelDownload()
})

openResultButton.addEventListener('click', async () => {
  if (!lastResult) return
  try {
    await window.appApi.openPath(lastResult.filePath)
  } catch {
    setMessage('저장한 파일을 열지 못했습니다.', 'error')
  }
})

window.appApi.onDownloadProgress((progress) => setProgress(progress.percent, progress.message))
window.appApi.onDownloadComplete((result) => {
  setDownloading(false)
  setProgress(100, '저장이 완료되었습니다.')
  showResult(result)
  setMessage('릴스를 저장했습니다.', 'success')
})
window.appApi.onDownloadError((error) => {
  setDownloading(false)
  progressArea.hidden = true
  setMessage(error, 'error')
})
window.appApi.onAuthStatus((status) => {
  completeLoginButton.hidden = status.state !== 'waiting' && status.state !== 'ready' && status.state !== 'error'
  loginButton.disabled = status.state === 'opening' || status.state === 'waiting' || status.state === 'connecting'
  isAuthenticated = status.state === 'logged-in'
  updateDownloadAvailability()
  sessionNote.textContent = status.state === 'logged-in'
    ? 'Instagram 로그인됨'
    : status.state === 'logged-out'
      ? 'Instagram 로그인 필요'
      : status.message
  setMessage(status.message, status.state === 'error' ? 'error' : status.state === 'logged-in' ? 'success' : 'normal')
})

initialize().catch(() => undefined)
