import { SecurityChallengeError } from "../core/errors.js";
import { assertSafeRedirectUrl } from "../core/network.js";
import type { ResolutionHop, ResolveOptions, ResolveResult } from "../core/types.js";
import { isTelegramUrl, sanitizeUrlForDiagnostics } from "../core/urls.js";

const CHALLENGE_MARKERS = [
  "cf-chl-",
  "challenges.cloudflare.com",
  "cloudflare security challenge",
  "verify you are human",
  "just a moment...",
];

function isSecurityChallenge(status: number, body: string): boolean {
  if (status !== 403 && status !== 503) return false;
  const normalized = body.toLowerCase();
  return CHALLENGE_MARKERS.some((marker) => normalized.includes(marker));
}

export async function resolveMove2link(
  originalUrl: string,
  options: ResolveOptions = {},
): Promise<ResolveResult> {
  const started = performance.now();
  const request = options.fetchImpl ?? fetch;
  const maxHops = options.maxHops ?? 12;
  const log = options.logger ?? (() => undefined);
  const hops: ResolutionHop[] = [];
  let current = originalUrl;

  for (let index = 0; index < maxHops; index += 1) {
    const diagnosticCurrent = sanitizeUrlForDiagnostics(current);
    log(`[shortlinx:move2link] opening ${diagnosticCurrent}`);
    const response = await request(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "user-agent": "shortlinx/0.1 (+https://github.com/aldevvv/shortlinx)",
      },
    });

    const isRedirect = response.status >= 300 && response.status < 400;
    const locationHeader = isRedirect ? response.headers.get("location") : null;
    const location = locationHeader ? new URL(locationHeader, current).href : undefined;
    const diagnosticLocation = location
      ? (isTelegramUrl(location) ? location : sanitizeUrlForDiagnostics(location))
      : undefined;
    const hop: ResolutionHop = {
      url: diagnosticCurrent,
      method: "GET",
      status: response.status,
      ...(diagnosticLocation ? { location: diagnosticLocation } : {}),
      ...(response.headers.get("content-type")
        ? { contentType: response.headers.get("content-type")! }
        : {}),
    };
    hops.push(hop);
    log(`[shortlinx:move2link] status: ${response.status}`);

    if (location) {
      log(`[shortlinx:move2link] redirect: ${diagnosticLocation}`);
      if (isTelegramUrl(location)) {
        const elapsedMs = Math.round(performance.now() - started);
        log(`[shortlinx:move2link] final destination: ${location}`);
        log(`[shortlinx:move2link] completed in ${elapsedMs} ms`);
        return { originalUrl, finalUrl: location, provider: "move2link", hops, method: "http", elapsedMs };
      }
      await assertSafeRedirectUrl(location, options.resolveHost);
      current = location;
      continue;
    }

    const body = await response.text();
    if (isSecurityChallenge(response.status, body)) {
      throw new SecurityChallengeError(
        `Mandatory security challenge encountered at ${diagnosticCurrent}; refusing to bypass it`,
        diagnosticCurrent,
        response.status,
      );
    }

    if (isTelegramUrl(current)) {
      const elapsedMs = Math.round(performance.now() - started);
      return { originalUrl, finalUrl: current, provider: "move2link", hops, method: "http", elapsedMs };
    }

    throw new Error(`move2link flow stopped at ${diagnosticCurrent} and did not resolve to a Telegram URL`);
  }

  throw new Error(`move2link exceeded the ${maxHops}-hop safety limit`);
}
