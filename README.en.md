# Instagram Reels & Stories Downloader

[![CI](https://github.com/ShootDoRi/instagram-reels-downloader/actions/workflows/ci.yml/badge.svg)](https://github.com/ShootDoRi/instagram-reels-downloader/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D4.svg)](#system-requirements)

English | [한국어](README.md)

A privacy-conscious Windows desktop app for saving Instagram Reels and video
Stories that you own or are authorized to download. It is built with
Electron/TypeScript and uses a separate Chrome or Edge window for user-managed
authentication.

> [!IMPORTANT]
> This is an unofficial project and is not affiliated with Meta or Instagram.
> Use it only for media you own or have explicit permission to save. Users are
> responsible for complying with applicable law and platform terms.

## Features

- Save individual Reels and video Stories as MP4
- Save all accessible active video Stories from `stories/username/` URLs
- Best MP4, up to 1080p, or up to 720p quality selection
- Optional TXT metadata containing title, date, source URL, and caption
- One download job at a time with progress and cancellation cleanup
- External Chrome/Edge login without an in-app password field
- Persistent local login session and per-download temporary cookie export
- Official pinned `yt-dlp.exe` verified by version and SHA-256

## Supported URLs

| Type | Example | Behavior |
| --- | --- | --- |
| Reel | `https://www.instagram.com/reel/SHORTCODE/` | Saves one video |
| Individual Story | `https://www.instagram.com/stories/user/123456789/` | Saves that video Story |
| Active Stories | `https://www.instagram.com/stories/user/` | Saves all currently accessible video Stories |

Regular posts, full profile scanning, scheduled downloads, and other social
networks are outside the current scope.

## Installation

1. Download the latest `Setup.exe` and `SHA256SUMS.txt` from
   [GitHub Releases](https://github.com/ShootDoRi/instagram-reels-downloader/releases).
2. Verify the installer checksum in PowerShell:

   ```powershell
   Get-FileHash -LiteralPath '.\Instagram 릴스 다운로더 Setup 1.1.3.exe' -Algorithm SHA256
   ```

3. Run the installer only when the checksum matches `SHA256SUMS.txt`.

The installer is not currently signed with a commercial code-signing
certificate, so Windows SmartScreen may display a warning.

## Usage

1. Select **Login with Instagram in browser** in the app.
2. Sign in directly in the Chrome or Edge window, then close that browser
   completely.
3. Wait until the app displays **Instagram logged in**.
4. Enter a supported URL, choose the destination and options, and start the
   download.

CAPTCHA and two-factor authentication remain entirely in the browser. Expired
Stories and content unavailable to the signed-in account cannot be downloaded.

## Privacy and security

- The app does not provide an Instagram password field.
- Session data stays in the current Windows user's local app data.
- A temporary cookie file is created only for a download and removed after
  success, cancellation, or failure.
- Cookies and credentials are not intentionally written to app logs or metadata.
- Logging out clears the dedicated browser profile and Electron session data.

See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md) for details.

## System requirements

- Windows 10 or Windows 11 x64
- Internet connection
- Chrome or Microsoft Edge
- Node.js 22 or later for source builds

## Development

```powershell
git clone https://github.com/ShootDoRi/instagram-reels-downloader.git
cd instagram-reels-downloader
npm ci
npm test
npm run build
npm run dev
```

Build the Windows NSIS installer with:

```powershell
npm run package:win
```

This downloads and verifies the version and SHA-256 defined in the
[yt-dlp manifest](resources/ytdlp-manifest.json), then writes local artifacts to
`release/`. Executables and build output are intentionally excluded from Git.

Pushing a tag such as `v1.2.3` runs the
[Release workflow](.github/workflows/release.yml), which tests and packages the
app and publishes the installer with `SHA256SUMS.txt`. The tag must match the
version in `package.json`.

## Contributing

Issues and narrowly scoped pull requests are welcome. Read
[CONTRIBUTING.md](CONTRIBUTING.md), the [Code of Conduct](CODE_OF_CONDUCT.md),
and the [Security Policy](SECURITY.md) before contributing. Never publish
passwords, cookies, `sessionid` values, private URLs, or personal account data.

## License

Project source code is available under the [MIT License](LICENSE). Bundled or
downloaded third-party components remain under their respective licenses; see
[THIRD_PARTY_NOTICES.md](resources/THIRD_PARTY_NOTICES.md).
