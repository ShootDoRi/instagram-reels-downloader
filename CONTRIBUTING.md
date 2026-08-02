# Contributing

Thank you for helping improve Instagram Reels & Stories Downloader. Bug fixes,
tests, documentation improvements, accessibility work, and narrowly scoped
features are welcome.

## Before you start

- Use the app only with media you own or are authorized to download.
- Never post Instagram cookies, `sessionid` values, passwords, private story
  URLs, or logs containing authentication data.
- Search existing issues before opening a new one.
- For security vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of
  opening a public issue.

## Development setup

The project targets Windows 10/11 and requires Node.js 22 or later.

```powershell
git clone https://github.com/ShootDoRi/instagram-reels-downloader.git
cd instagram-reels-downloader
npm ci
npm test
npm run build
```

Run the app during development with:

```powershell
npm run dev
```

Create a local NSIS installer with:

```powershell
npm run package:win
```

This command downloads the pinned official `yt-dlp.exe`, verifies its SHA-256,
and places build artifacts in `release/`. Build artifacts and the executable
are intentionally not committed to Git.

## Pull requests

1. Keep each pull request focused on one problem.
2. Add or update tests for behavior changes.
3. Run `npm test` and `npm run build` before submitting.
4. Explain user impact, security implications, and manual verification steps.
5. Do not include generated files from `out/`, `release/`, or `node_modules/`.

By contributing, you agree that your contribution is licensed under the MIT
License included in this repository.

---

한국어 기여도 환영합니다. 변경 범위를 작게 유지하고, 동작 변경에는 테스트를
추가해 주세요. 공개 Issue나 로그에 Instagram 인증 정보 또는 비공개 URL을
절대 포함하지 마세요.
