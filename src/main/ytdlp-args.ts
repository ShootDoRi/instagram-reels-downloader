import type { DownloadQuality } from '../shared/contracts'

export function formatSelector(quality: DownloadQuality): string {
  const base = 'best[ext=mp4][vcodec!=none][acodec!=none]'
  if (quality === '1080') return `best[height<=1080][ext=mp4][vcodec!=none][acodec!=none]/${base}/best[ext=mp4]`
  if (quality === '720') return `best[height<=720][ext=mp4][vcodec!=none][acodec!=none]/${base}/best[ext=mp4]`
  return `${base}/best[ext=mp4]`
}

export function buildInfoArgs(url: string, cookiePath: string, allowPlaylist = false): string[] {
  return [
    ...(allowPlaylist ? [] : ['--no-playlist']),
    '--skip-download', '--dump-single-json', '--cookies', cookiePath, url
  ]
}

export function buildDownloadArgs(options: {
  url: string
  cookiePath: string
  outputTemplate: string
  quality: DownloadQuality
  allowPlaylist?: boolean
}): string[] {
  return [
    ...(options.allowPlaylist ? [] : ['--no-playlist']),
    '--no-part',
    '--no-overwrites',
    '--newline',
    '--format', formatSelector(options.quality),
    '--output', options.outputTemplate,
    '--progress-template', 'download:PROGRESS:%(progress._percent_str)s|%(progress.downloaded_bytes)s|%(progress.total_bytes)s',
    '--print', 'before_dl:START:%(filename)s',
    '--print', 'after_move:RESULT:%(filepath)s',
    '--cookies', options.cookiePath,
    options.url
  ]
}
