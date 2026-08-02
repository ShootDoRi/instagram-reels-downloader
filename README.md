# Instagram 릴스·스토리 다운로더

[![CI](https://github.com/ShootDoRi/instagram-reels-downloader/actions/workflows/ci.yml/badge.svg)](https://github.com/ShootDoRi/instagram-reels-downloader/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D4.svg)](#시스템-요구사항)

[English](README.en.md) | 한국어

본인이 소유하거나 저장 권한이 있는 Instagram 릴스와 동영상 스토리를
로컬 MP4 파일로 보관하는 Windows 데스크톱 앱입니다. Electron/TypeScript로
구현되며, 별도 Chrome 또는 Edge 창에서 사용자가 직접 로그인합니다.

> [!IMPORTANT]
> 이 프로젝트는 Meta 또는 Instagram과 관련이 없는 비공식 도구입니다.
> 본인 소유이거나 명시적으로 저장 권한을 받은 콘텐츠에만 사용하세요.
> 사용자는 관련 법률과 플랫폼 약관을 준수할 책임이 있습니다.

## 주요 기능

- 단일 릴스와 개별 동영상 스토리 MP4 저장
- `stories/사용자명/` 주소의 활성 동영상 스토리 전체 저장
- 최고 화질, 1080p 이하, 720p 이하 선택
- 제목·게시일·원본 URL·캡션 TXT 선택 저장
- 한 번에 하나의 다운로드 작업, 진행률 표시 및 안전한 취소
- 앱이 비밀번호를 수집하지 않는 외부 Chrome/Edge 로그인
- 영구 로그인 세션과 다운로드별 임시 쿠키 파일 분리
- 버전과 SHA-256이 고정된 공식 `yt-dlp.exe` 패키징

## 지원 URL

| 유형 | 예시 | 동작 |
| --- | --- | --- |
| 릴스 | `https://www.instagram.com/reel/SHORTCODE/` | 영상 한 개 저장 |
| 개별 스토리 | `https://www.instagram.com/stories/user/123456789/` | 해당 동영상 저장 |
| 활성 스토리 | `https://www.instagram.com/stories/user/` | 현재 접근 가능한 동영상 스토리 전체 저장 |

일반 게시물, 프로필 전체 스캔, 예약 다운로드, 다른 SNS는 지원하지 않습니다.

## 설치

1. [GitHub Releases](https://github.com/ShootDoRi/instagram-reels-downloader/releases)에서 최신 `Setup.exe`와 `SHA256SUMS.txt`를 다운로드합니다.
2. PowerShell에서 설치 파일의 체크섬을 확인합니다.

   ```powershell
   Get-FileHash -LiteralPath '.\Instagram 릴스 다운로더 Setup 1.1.3.exe' -Algorithm SHA256
   ```

3. 체크섬이 `SHA256SUMS.txt`와 일치하면 설치 프로그램을 실행합니다.

현재 설치 파일에는 상용 코드 서명 인증서가 없으므로 Windows SmartScreen 경고가
표시될 수 있습니다. 출처와 SHA-256을 확인한 경우에만 실행하세요.

## 사용 방법

1. 앱에서 **브라우저로 Instagram 로그인**을 선택합니다.
2. 열린 Chrome 또는 Edge 창에서 직접 로그인하고 브라우저를 완전히 닫습니다.
3. 앱에 **Instagram 로그인됨**이 표시되면 지원 URL과 저장 폴더를 입력합니다.
4. 화질과 선택 옵션을 지정하고 **영상 다운로드**를 선택합니다.

CAPTCHA와 2단계 인증은 사용자가 브라우저에서 직접 완료합니다. 스토리는 만료되거나
로그인 계정에 접근 권한이 없으면 저장할 수 없습니다.

## 개인정보 및 보안

- 앱에는 Instagram 비밀번호 입력란이 없습니다.
- 로그인 세션은 현재 Windows 사용자 계정의 앱 데이터에만 저장됩니다.
- `yt-dlp`용 쿠키 파일은 작업별 임시 폴더에 생성되고 성공·취소·실패 후 삭제됩니다.
- 앱 로그와 메타데이터 TXT에는 쿠키나 인증 정보를 기록하지 않습니다.
- **로그아웃**은 전용 브라우저 프로필과 Electron 세션 데이터를 삭제합니다.

자세한 내용은 [개인정보 안내](PRIVACY.md)와 [보안 정책](SECURITY.md)을 확인하세요.

## 시스템 요구사항

- Windows 10 또는 Windows 11 x64
- 인터넷 연결
- Chrome 또는 Microsoft Edge
- 소스 빌드 시 Node.js 22 이상

## 개발

```powershell
git clone https://github.com/ShootDoRi/instagram-reels-downloader.git
cd instagram-reels-downloader
npm ci
npm test
npm run build
npm run dev
```

Windows NSIS 설치 프로그램은 다음 명령으로 생성합니다.

```powershell
npm run package:win
```

이 명령은 [yt-dlp manifest](resources/ytdlp-manifest.json)의 버전과 SHA-256을
검증한 뒤 `release/`에 로컬 산출물을 만듭니다. 실행 파일과 빌드 산출물은 Git에
커밋하지 않습니다.

`v1.2.3` 형식의 태그를 푸시하면 [Release workflow](.github/workflows/release.yml)가
테스트와 패키징을 수행하고 설치 파일 및 `SHA256SUMS.txt`를 GitHub Release에
게시합니다. 태그 버전은 `package.json` 버전과 일치해야 합니다.

## 기여

버그 신고와 작은 범위의 Pull Request를 환영합니다.

- [기여 가이드](CONTRIBUTING.md)
- [행동강령](CODE_OF_CONDUCT.md)
- [보안 취약점 신고](SECURITY.md)
- [변경 이력](CHANGELOG.md)

공개 Issue에 비밀번호, 쿠키, `sessionid`, 비공개 URL 또는 개인정보를 포함하지
마세요.

## 라이선스

프로젝트 소스 코드는 [MIT License](LICENSE)로 배포됩니다. 포함되거나 다운로드되는
제3자 구성요소에는 각각의 라이선스가 적용됩니다. 자세한 고지는
[THIRD_PARTY_NOTICES.md](resources/THIRD_PARTY_NOTICES.md)를 확인하세요.
