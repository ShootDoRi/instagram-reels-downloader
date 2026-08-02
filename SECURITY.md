# Security Policy

## Supported versions

Security fixes are applied to the latest published release. Older versions may
not receive patches, so users should upgrade before reporting a problem.

| Version | Supported |
| --- | --- |
| Latest release | Yes |
| Older releases | No |

## Reporting a vulnerability

Do not open a public issue for a vulnerability. Use GitHub's **Security →
Report a vulnerability** flow for this repository. If private vulnerability
reporting is unavailable, contact the maintainer through the contact options on
the [ShootDoRi GitHub profile](https://github.com/ShootDoRi) without publishing
technical details.

Include:

- affected app version and Windows version;
- reproduction steps using a test account or non-sensitive data;
- expected impact and any suggested mitigation;
- whether the issue exposes cookies, local files, or command execution.

Never send real passwords, Instagram cookies, `sessionid` values, private media
URLs, or other people's personal information. The maintainer will acknowledge a
complete report as soon as practical and coordinate disclosure after a fix is
available.

## Security boundaries

- Instagram authentication occurs in a separate Chrome or Edge profile.
- The app does not provide a password field or intentionally log credentials.
- Download cookies are exported to a temporary local file and removed after
  success, cancellation, or failure.
- `yt-dlp.exe` is pinned by version and verified with SHA-256 before packaging.

These controls reduce risk but do not make the application immune to browser,
Instagram, Electron, or third-party dependency vulnerabilities.
