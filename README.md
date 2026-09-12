# Shortlinx

Shortlinx is a diagnostics-first TypeScript/Node.js proof of concept for resolving public shortlinks while preserving a safe, auditable hop trace.

## Status

The `move2link` provider is implemented for ordinary HTTP redirects and strict Telegram destination validation. Live investigation of the supplied target is currently blocked at the initial request by a mandatory Cloudflare human-verification challenge. Shortlinx detects and reports that boundary instead of attempting to bypass it.

See [`INVESTIGATION.md`](INVESTIGATION.md) for captured evidence and the exact limitation.

## Supported providers

- `move2link.co`: ordinary HTTP redirect tracing, challenge detection, and Telegram final-URL validation

## Requirements

- Node.js 20 or newer
- npm

## Installation

```bash
npm install
```

## Usage

```bash
npm run resolve -- https://move2link.co/mh7f403bbc
```

Library API:

```ts
import { resolveShortlink } from "shortlinx";

const result = await resolveShortlink("https://move2link.co/example");
console.log(result);
```

## Output

Successful resolutions return:

```ts
{
  originalUrl: "https://move2link.co/example",
  finalUrl: "https://t.me/example_channel",
  provider: "move2link",
  hops: [
    {
      url: "https://move2link.co/example",
      method: "GET",
      status: 302,
      location: "https://t.me/example_channel"
    }
  ],
  method: "http",
  elapsedMs: 123
}
```

The Telegram URL above is a documentation placeholder, not the destination of the supplied shortlink.

Diagnostics go to stderr. Results go to stdout. Complete cookies, authorization headers, and browser state are never included in hop data.

## Architecture

```text
src/
  cli.ts                  command-line entry point
  index.ts                provider dispatch and public API
  core/
    errors.ts             typed security-boundary errors
    types.ts              result and hop interfaces
    urls.ts               strict Telegram URL validation
  providers/
    move2link.ts          move2link-specific resolution logic
tests/
  resolver.test.ts        redirect and challenge behavior
  urls.test.ts            destination-domain validation
```

The resolver follows redirects manually so each transition can be recorded without leaking session material. Provider-specific behavior is isolated from the public interface.

## Development

```bash
npm test
npm run build
```

## Known limitations

- A mandatory CAPTCHA, Turnstile, Cloudflare human-verification widget, authentication prompt, or equivalent control is treated as a hard security boundary.
- The current live target cannot be traced beyond Cloudflare from the available server IP without crossing that boundary.
- Client-side forms, JavaScript state transitions, and countdown analysis can only be implemented after the initial protected page becomes accessible through an ordinary, non-bypassing session.
- Provider markup and redirect behavior may change.
