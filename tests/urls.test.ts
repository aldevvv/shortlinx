import { describe, expect, it } from "vitest";
import { isTelegramUrl, sanitizeUrlForDiagnostics } from "../src/core/urls.js";

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

describe("sanitizeUrlForDiagnostics", () => {
  it("redacts sensitive query values while preserving useful routing data", () => {
    const input = "https://redirect.example/next?step=2&token=secret-value&session_id=session-secret&sig=signature";
    const output = sanitizeUrlForDiagnostics(input);

    expect(output).toBe("https://redirect.example/next?step=2&token=%5BREDACTED%5D&session_id=%5BREDACTED%5D&sig=%5BREDACTED%5D");
    expect(output).not.toContain("secret-value");
    expect(output).not.toContain("session-secret");
    expect(output).not.toContain("signature");
  });
});
