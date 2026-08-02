# Instagram 릴스·스토리 다운로더

Windows에서 Instagram 릴스 또는 동영상 스토리 URL을 MP4로 저장하는 개인용 데스크톱 앱입니다. `stories/사용자명/` 주소를 입력하면 현재 접근 가능한 동영상 스토리를 모두 저장합니다.

## 사용 방법

1. `release/Instagram 릴스 다운로더 Setup 1.1.3.exe`를 실행해 설치합니다.
2. 앱에서 **브라우저로 Instagram 로그인**을 눌러 열린 일반 Chrome 또는 Edge에서 로그인합니다.
3. 로그인이 완료되면 브라우저 창을 완전히 닫습니다. 앱이 세션을 자동으로 연결하며, 실패한 경우에만 **로그인 완료 확인**을 누릅니다.
4. 앱 상단에 **Instagram 로그인됨**이 표시되면 URL과 저장 옵션을 선택한 뒤 **영상 다운로드**를 누릅니다.

앱에는 Instagram 비밀번호 입력란이 없으며, 로그인 세션은 이 Windows 사용자 계정의 앱 저장소에만 유지됩니다. **로그아웃**을 누르거나 제거 프로그램에서 앱 데이터 삭제를 선택하면 세션이 지워집니다.

본인이 소유하거나 저장 권한을 가진 영상만 사용하세요. Instagram의 페이지 구조 또는 인증 정책 변경으로 로그인이 만료되거나 다운로드가 동작하지 않을 경우에는 다시 로그인하거나 앱의 `yt-dlp` 버전을 업데이트해야 할 수 있습니다.

## 개발 및 패키징

```powershell
npm install
npm run dev
npm test
npm run package:win
```

`npm run package:win`은 `resources/ytdlp-manifest.json`에 고정된 공식 `yt-dlp.exe`를 다운로드하고 SHA-256을 검증한 뒤, NSIS 설치 프로그램을 `release/`에 만듭니다.

## 범위

- Instagram 릴스 또는 아직 접근 가능한 동영상 스토리 URL 한 건씩 처리
- `stories/사용자명/` URL에서는 현재 활성 상태인 동영상 스토리를 모두 개별 MP4로 저장
- MP4 최고 화질, 1080p 이하, 720p 이하 선택
- 선택적으로 제목·게시일·URL·캡션 TXT 생성
- 프로필 스캔, 일괄 다운로드, 예약 다운로드 및 다른 SNS는 지원하지 않음
