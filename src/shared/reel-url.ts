export type InstagramMediaKind = 'reel' | 'story'

export interface ParsedInstagramMediaUrl {
  canonicalUrl: string
  mediaId: string
  kind: InstagramMediaKind
}

const allowedHosts = new Set(['instagram.com', 'www.instagram.com', 'm.instagram.com'])

export function parseInstagramMediaUrl(rawUrl: string): ParsedInstagramMediaUrl {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    throw new Error('릴스 또는 동영상 스토리 URL을 입력해 주세요.')
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error('유효한 Instagram 릴스 또는 스토리 URL이 아닙니다.')
  }

  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname.toLowerCase())) {
    throw new Error('Instagram의 https 릴스 또는 스토리 URL만 사용할 수 있습니다.')
  }

  const reelMatch = /^\/(?:reel|reels)\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname)
  if (reelMatch) {
    return {
      kind: 'reel',
      mediaId: reelMatch[1],
      canonicalUrl: `https://www.instagram.com/reel/${reelMatch[1]}/`
    }
  }

  const storyMatch = /^\/stories\/([A-Za-z0-9._]+)\/(\d+)\/?$/.exec(url.pathname)
  if (storyMatch) {
    return {
      kind: 'story',
      mediaId: storyMatch[2],
      canonicalUrl: `https://www.instagram.com/stories/${storyMatch[1]}/${storyMatch[2]}/`
    }
  }

  throw new Error('Instagram 릴스 또는 동영상 스토리 URL만 지원합니다.')
}
