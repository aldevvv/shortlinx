const TELEGRAM_HOSTS = new Set(["t.me", "telegram.me", "telegram.dog"]);

export function isTelegramUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && TELEGRAM_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
