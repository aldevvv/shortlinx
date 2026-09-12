# move2link Investigation

Target: `https://move2link.co/mh7f403bbc`

Investigation date: 2026-09-13

## Result

The final Telegram destination could not be discovered from the available environment because the initial page requires an interactive Cloudflare human-verification challenge. No CAPTCHA or challenge bypass was attempted.

## HTTP probe

A fresh direct HTTP request returned:

```text
GET https://move2link.co/mh7f403bbc
HTTP 403
Content-Type: text/html; charset=UTF-8
Title: Just a moment...
Location: absent
Set-Cookie: absent
```

The body contained Cloudflare challenge markers, including a script origin under `challenges.cloudflare.com`.

## Browser probes

Two independent Chromium browser contexts were created with no reused cookies, local storage, session storage, or browser profile. Both produced the same main-frame sequence:

```text
Run 1: 307 -> 403 -> title "Just a moment..." -> Cloudflare challenge iframe
Run 2: 307 -> 403 -> title "Just a moment..." -> Cloudflare challenge iframe
```

Each context was observed for 15 seconds. The challenge did not clear automatically. The page exposed a human-verification control in the Cloudflare iframe. It was not clicked.

No application page, Continue button, Get Link button, countdown, form, move2link API request, or destination-producing operation became accessible before this boundary.

## What is established

- The security challenge is before the move2link application flow in this environment.
- Plain HTTP redirect following is insufficient for this target from the current IP.
- JavaScript execution alone is insufficient: fresh Chromium contexts reach the same challenge.
- There is no evidence yet about whether move2link's visible countdowns are client-side or server-enforced because they are downstream of the challenge.
- There is no verified final Telegram URL. None is stored in this repository.

## Reproduction

```bash
npm install
npm run resolve -- https://move2link.co/mh7f403bbc
```

Expected result in the investigated environment:

```text
[shortlinx:move2link] opening https://move2link.co/mh7f403bbc
[shortlinx:move2link] status: 403
[shortlinx:move2link] BLOCKED: Mandatory security challenge encountered at https://move2link.co/mh7f403bbc; refusing to bypass it (HTTP 403)
```

The process exits with code `3` for this explicit security-boundary condition.

## Safe continuation path

If the target becomes reachable through an ordinary browser session without an interactive challenge, continue by recording main-frame navigation and fetch/XHR metadata, then trace the first destination-releasing request backwards. Do not persist cookies, authorization headers, browser profiles, or HAR files containing session material.
