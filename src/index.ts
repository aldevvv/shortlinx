import type { ResolveOptions, ResolveResult } from "./core/types.js";
import { resolveMove2link } from "./providers/move2link.js";

export type { ResolutionHop, ResolveOptions, ResolveResult } from "./core/types.js";
export { SecurityChallengeError } from "./core/errors.js";
export { isTelegramUrl, sanitizeUrlForDiagnostics } from "./core/urls.js";

export async function resolveShortlink(
  input: string,
  options: ResolveOptions = {},
): Promise<ResolveResult> {
  const url = new URL(input);
  if (url.username || url.password) {
    throw new Error("Shortlink URL must not contain embedded credentials");
  }
  if (url.protocol !== "https:" || !["move2link.co", "www.move2link.co"].includes(url.hostname.toLowerCase())) {
    throw new Error(`Unsupported shortlink provider: ${url.hostname}`);
  }
  return resolveMove2link(url.href, options);
}
