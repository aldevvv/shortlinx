const TELEGRAM_HOSTS = new Set(["t.me", "telegram.me", "telegram.dog"]);
const SENSITIVE_QUERY_KEYS = new Set([
  "apikey",
  "auth",
  "authorization",
  "code",
  "cookie",
  "credential",
  "key",
  "password",
  "refreshtoken",
  "session",
  "sessionid",
  "sig",
  "signature",
  "state",
  "token",
  "accesstoken",
  "clientsecret",
]);

function normalizeQueryKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function sanitizeUrlForDiagnostics(value: string): string {
  const url = new URL(value);
  for (const key of [...url.searchParams.keys()]) {
    if (SENSITIVE_QUERY_KEYS.has(normalizeQueryKey(key))) {
      url.searchParams.set(key, "[REDACTED]");
    }
  }
  if (url.hash) url.hash = "[REDACTED]";
  return url.href;
}

export function isTelegramUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && TELEGRAM_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
