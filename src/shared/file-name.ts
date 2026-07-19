const reservedNames = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  ...Array.from({ length: 9 }, (_, index) => `COM${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `LPT${index + 1}`)
])

export function sanitizeFileStem(value: string, fallback: string): string {
  const withoutUnsafeCharacters = value
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 100)

  const candidate = withoutUnsafeCharacters || fallback
  return reservedNames.has(candidate.toUpperCase()) ? `${candidate}_` : candidate
}

export function makeDefaultFileStem(uploadDate: string | undefined, shortcode: string): string {
  const date = /^\d{8}$/.test(uploadDate ?? '') ? uploadDate : new Date().toISOString().slice(0, 10).replaceAll('-', '')
  return `${date}_${shortcode}`
}
