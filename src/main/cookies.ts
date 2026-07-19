import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Cookie } from 'electron'

function cookieDomain(cookie: Cookie): string {
  const rawDomain = cookie.domain ?? ''
  const domain = rawDomain.startsWith('.') ? rawDomain : `.${rawDomain}`
  return cookie.httpOnly ? `#HttpOnly_${domain}` : domain
}

export function toNetscapeCookieFile(cookies: Cookie[]): string {
  const rows = ['# Netscape HTTP Cookie File']
  for (const cookie of cookies) {
    const expires = cookie.session || cookie.expirationDate === undefined ? '0' : String(Math.floor(cookie.expirationDate))
    rows.push([
      cookieDomain(cookie),
      (cookie.domain ?? '').startsWith('.') ? 'TRUE' : 'FALSE',
      cookie.path || '/',
      cookie.secure ? 'TRUE' : 'FALSE',
      expires,
      cookie.name,
      cookie.value
    ].join('\t'))
  }
  return `${rows.join('\n')}\n`
}

export async function createTemporaryCookieFile(tempRoot: string, cookies: Cookie[]): Promise<{ directory: string; filePath: string }> {
  const directory = await mkdtemp(join(tempRoot, 'ig-reels-cookies-'))
  const filePath = join(directory, 'cookies.txt')
  await writeFile(filePath, toNetscapeCookieFile(cookies), { encoding: 'utf8', mode: 0o600 })
  return { directory, filePath }
}

export async function removeTemporaryCookieDirectory(directory: string | undefined): Promise<void> {
  if (directory) await rm(directory, { recursive: true, force: true, maxRetries: 2 })
}
