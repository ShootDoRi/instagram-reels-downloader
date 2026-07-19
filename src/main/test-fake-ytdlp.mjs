import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const args = process.argv.slice(2)
const modeIndex = args.indexOf('--fake-mode')
const mode = modeIndex >= 0 ? args[modeIndex + 1] : 'success'

if (args.includes('--dump-single-json')) {
  if (mode === 'login-required') {
    console.error('ERROR: Login required')
    process.exit(1)
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
  const outputPath = outputTemplate.replace('%(ext)s', 'mp4')
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, 'fake video')
  console.log('PROGRESS:50.0%|50|100')
  console.log(`RESULT:${outputPath}`)
  process.exit(0)
}
