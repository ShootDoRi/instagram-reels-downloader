import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const args = process.argv.slice(2)
const modeIndex = args.indexOf('--fake-mode')
const mode = modeIndex >= 0 ? args[modeIndex + 1] : 'success'
const targetUrl = args.at(-1) ?? ''
const isStoryCollection = /\/stories\/[^/]+\/?(?:[?#].*)?$/.test(targetUrl)

if (args.includes('--dump-single-json')) {
  if (mode === 'login-required') {
    console.error('ERROR: Login required')
    process.exit(1)
  }
  if (isStoryCollection) {
    console.log(JSON.stringify({
      _type: 'playlist',
      id: 'fake-user',
      title: 'Story by fake-user',
      entries: [
        { id: 'story-one', title: '스토리 1', upload_date: '20260802', width: 1080, height: 1920 },
        { id: 'story-two', title: '스토리 2', upload_date: '20260802', width: 1080, height: 1920 }
      ]
    }))
    process.exit(0)
  }
  console.log(JSON.stringify({
    id: 'fake-reel',
    title: '테스트 릴스',
    description: '테스트 캡션',
    upload_date: '20260719',
    width: 1080,
    height: 1920
  }))
  process.exit(0)
}

if (mode === 'slow') {
  console.log('PROGRESS:5.0%|5|100')
  setTimeout(() => process.exit(0), 3_000)
} else if (mode === 'download-failure') {
  console.error('ERROR: Unable to download video')
  process.exit(1)
} else {
  const outputIndex = args.indexOf('--output')
  const outputTemplate = args[outputIndex + 1]
  const entries = isStoryCollection
    ? [{ id: 'story-one', index: 1 }, { id: 'story-two', index: 2 }]
    : [{ id: 'fake-reel', index: 1 }]
  for (const entry of entries) {
    const outputPath = outputTemplate
      .replace('%(playlist_index)02d', String(entry.index).padStart(2, '0'))
      .replace('%(id)s', entry.id)
      .replace('%(ext)s', 'mp4')
    console.log(`START:${outputPath}`)
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, 'fake video')
    console.log('PROGRESS:50.0%|50|100')
    if (mode === 'collection-slow') {
      await new Promise((resolve) => setTimeout(resolve, 3_000))
      process.exit(0)
    }
    console.log(`RESULT:${outputPath}`)
  }
  process.exit(0)
}
