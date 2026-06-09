# SRM Secure Browser Security Review

This repository contains a focused security review of `SRMUG-Secure-Browser v1.0.22`, an Electron-based exam browser distributed by Eduswitch Solutions. The review was written from the perspective of a defensive application security assessment: identify risky design choices, explain their impact, and give maintainers a clear remediation path.

## Scope

The reviewed application bundle was extracted from `app.asar` and inspected as a desktop Electron application. The review covers readable renderer/preload code, bundled JavaScript, native helper binaries, Firebase/WebRTC usage, and the visible client-side exam/proctoring flow.

The compiled `main.jsc` file was not fully decompiled, so the report calls out that limitation where main-process behavior could not be confirmed from source.

## Key Findings

The report documents 11 issues across client-side trust boundaries, exposed secrets, unsafe IPC/message handling, insecure exam-state design, outdated Electron dependencies, and privacy concerns.

Severity snapshot:

| Severity | Count | Main Themes |
|---|---:|---|
| Critical | 3 | Exposed client-side secrets, unauthenticated message control, answer-key exposure |
| High | 4 | Public privileged globals, weak DevTools lockdown, old Electron, client-writable Firebase state |
| Medium | 3 | Weak VM checks, deprecated request library, GPS collection concerns |
| Low | 1 | Ineffective PrintScreen handling |

## Repository Contents

| File | Purpose |
|---|---|
| `SRM_Secure_Browser_Security_Review.md` | Full public review with exploit-ready secrets and bypass steps redacted |
| `README.md` | Repo overview, scope, severity summary, and remediation guidance |

## Responsible Handling

The public version of this report intentionally avoids publishing live-looking keys or step-by-step exam bypass instructions. The goal is to document architectural weaknesses and help a maintainer, researcher, or reviewer understand what needs to be fixed without turning the write-up into an operational abuse guide.

If you are maintaining a similar Electron-based exam or kiosk application, treat the renderer as untrusted. Sensitive decisions should be enforced by the server or privileged main process, with strict validation at every boundary.

## Recommended Fix Order

1. Move answer keys and grading logic fully server-side.
2. Remove hardcoded secrets from renderer code and rotate exposed credentials.
3. Replace AES-ECB usage with modern authenticated encryption where encryption is actually needed.
4. Validate `postMessage` origins, schemas, and allowed actions.
5. Remove public privileged globals such as test start/stop controls from the page context.
6. Lock Firebase rules to per-student/per-session permissions and validate writes server-side.
7. Upgrade Electron and remove deprecated `remote` usage.
8. Rework privacy-sensitive flows such as geolocation collection with explicit consent and retention rules.

## Status

This is a static review, not a full penetration test. The findings should be validated in a controlled environment before remediation work is prioritized for production.
