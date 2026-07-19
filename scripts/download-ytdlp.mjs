import { createHash } from 'node:crypto'
import { readFile, mkdir, rename, rm, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = resolve(root, 'resources/ytdlp-manifest.json')
const destination = resolve(root, 'resources/yt-dlp.exe')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

if (!/^[a-f0-9]{64}$/i.test(manifest.sha256)) {
  throw new Error('resources/ytdlp-manifest.json에 검증된 yt-dlp SHA-256을 입력해야 합니다.')
}

async function verify(filePath) {
  const digest = createHash('sha256').update(await readFile(filePath)).digest('hex')
  return digest.toLowerCase() === manifest.sha256.toLowerCase()
}

try {
  if ((await stat(destination)).isFile() && await verify(destination)) {
    console.log(`yt-dlp ${manifest.version} 검증 완료: ${destination}`)
    process.exit(0)
  }
} catch {
  // 다운로드가 필요합니다.
}

await mkdir(dirname(destination), { recursive: true })
const response = await fetch(manifest.url, { redirect: 'follow' })
if (!response.ok || !response.body) {
  throw new Error(`yt-dlp 다운로드 실패: HTTP ${response.status}`)
}

const temporary = `${destination}.download`
await rm(temporary, { force: true })
const bytes = Buffer.from(await response.arrayBuffer())
const digest = createHash('sha256').update(bytes).digest('hex')
if (digest.toLowerCase() !== manifest.sha256.toLowerCase()) {
  throw new Error(`yt-dlp SHA-256 검증 실패: 기대값 ${manifest.sha256}, 실제값 ${digest}`)
}

await import('node:fs/promises').then(({ writeFile }) => writeFile(temporary, bytes, { mode: 0o755 }))
await rename(temporary, destination)
console.log(`yt-dlp ${manifest.version} 다운로드 및 검증 완료`)
