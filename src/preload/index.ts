import { contextBridge, ipcRenderer } from 'electron'
import type { AppApi, AuthStatus, DownloadProgress, DownloadResult } from '../shared/contracts'

function subscribe<T>(channel: string, listener: (value: T) => void): () => void {
  const wrapped = (_event: Electron.IpcRendererEvent, value: T) => listener(value)
  ipcRenderer.on(channel, wrapped)
  return () => ipcRenderer.removeListener(channel, wrapped)
}

const api: AppApi = {
  getStatus: () => ipcRenderer.invoke('get-status'),
  chooseDirectory: () => ipcRenderer.invoke('choose-directory'),
  openLogin: () => ipcRenderer.invoke('open-login'),
  completeLogin: () => ipcRenderer.invoke('complete-login'),
  logout: () => ipcRenderer.invoke('logout'),
  startDownload: (request) => ipcRenderer.invoke('start-download', request),
  cancelDownload: () => ipcRenderer.invoke('cancel-download'),
  openPath: (targetPath) => ipcRenderer.invoke('open-path', targetPath),
  onDownloadProgress: (listener) => subscribe<DownloadProgress>('download-progress', listener),
  onDownloadComplete: (listener) => subscribe<DownloadResult>('download-complete', listener),
  onDownloadError: (listener) => subscribe<string>('download-error', listener),
  onAuthStatus: (listener) => subscribe<AuthStatus>('auth-status', listener)
}

contextBridge.exposeInMainWorld('appApi', api)
