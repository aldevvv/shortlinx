import { describe, expect, it } from "vitest";
import { isTelegramUrl } from "../src/core/urls.js";

describe("isTelegramUrl", () => {
  it.each([
    "https://t.me/channel",
    "https://telegram.me/channel",
    "https://telegram.dog/channel",
  ])("accepts Telegram-controlled URL %s", (url) => {
    expect(isTelegramUrl(url)).toBe(true);
  });

  it.each([
    "https://evil.example/?next=https://t.me/channel",
    "https://t.me.evil.example/channel",
    "javascript:alert(1)",
  ])("rejects non-Telegram URL %s", (url) => {
    expect(isTelegramUrl(url)).toBe(false);
  });
});
