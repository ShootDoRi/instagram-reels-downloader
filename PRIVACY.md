# Privacy

Instagram Reels & Stories Downloader is designed as a local desktop
application. It does not include analytics, advertising, telemetry, or a
project-operated server.

## Data handled by the app

- **Login:** You enter credentials only in a separate Chrome or Edge window.
  The app does not create a password field or intentionally collect passwords.
- **Session data:** Instagram cookies are stored in the app's local persistent
  Electron session so login can survive an app restart.
- **Downloads:** Cookies needed by `yt-dlp` are written to a temporary local
  file for one download and removed after success, cancellation, or failure.
- **Media and metadata:** MP4 and optional TXT files are saved only to the
  folder selected by the user.
- **Network requests:** The app and bundled `yt-dlp` contact Instagram and the
  media hosts required to resolve and download the requested content.

## Deleting local data

Use **Logout** in the app to remove the dedicated browser profile, cookies,
cache, and session data. Downloaded MP4/TXT files remain in the selected folder
until the user deletes them.

## Responsible use

Only download media you own or have permission to save. Do not submit private
URLs, cookies, or account information in public GitHub issues.
