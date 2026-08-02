export type DownloadQuality = 'best' | '1080' | '720'

export interface DownloadRequest {
  url: string
  directory: string
  quality: DownloadQuality
  fileName: string
  writeMetadata: boolean
}

export interface DownloadProgress {
  percent: number
  downloadedBytes?: number
  totalBytes?: number
  message: string
}

export interface DownloadResult {
  filePath: string
  filePaths: string[]
  metadataPath?: string
  metadataPaths?: string[]
  openPath: string
  savedCount: number
  title: string
  width?: number
  height?: number
}

export interface AppStatus {
  defaultDirectory: string
  downloaderReady: boolean
  loggedIn: boolean
}

export interface AuthStatus {
  state: 'opening' | 'waiting' | 'ready' | 'connecting' | 'logged-in' | 'logged-out' | 'error'
  message: string
}

export interface AppApi {
  getStatus(): Promise<AppStatus>
  chooseDirectory(): Promise<string | undefined>
  openLogin(): Promise<void>
  completeLogin(): Promise<void>
  logout(): Promise<void>
  startDownload(request: DownloadRequest): Promise<void>
  cancelDownload(): Promise<void>
  openPath(targetPath: string): Promise<void>
  onDownloadProgress(listener: (progress: DownloadProgress) => void): () => void
  onDownloadComplete(listener: (result: DownloadResult) => void): () => void
  onDownloadError(listener: (message: string) => void): () => void
  onAuthStatus(listener: (status: AuthStatus) => void): () => void
}
