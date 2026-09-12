import { describe, expect, it, vi } from "vitest";
import { resolveShortlink } from "../src/index.js";
import { SecurityChallengeError } from "../src/core/errors.js";

const telegram = "https://t.me/example_channel";

describe("resolveShortlink", () => {
  it("follows ordinary HTTP redirects to a Telegram destination", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/step" } }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: telegram } }));

    const result = await resolveShortlink("https://move2link.co/example", { fetchImpl });

    expect(result.finalUrl).toBe(telegram);
    expect(result.provider).toBe("move2link");
    expect(result.method).toBe("http");
    expect(result.hops).toEqual([
      expect.objectContaining({ url: "https://move2link.co/example", status: 302, location: "https://move2link.co/step" }),
      expect.objectContaining({ url: "https://move2link.co/step", status: 302, location: telegram }),
    ]);
  });

  it("rejects a non-Telegram terminal destination", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("done", { status: 200 }));
    await expect(resolveShortlink("https://move2link.co/example", { fetchImpl }))
      .rejects.toThrow("did not resolve to a Telegram URL");
  });

  it("reports a mandatory Cloudflare challenge without trying to bypass it", async () => {
    const html = '<title>Just a moment...</title><iframe title="Widget containing a Cloudflare security challenge"></iframe>';
    const fetchImpl = vi.fn().mockResolvedValue(new Response(html, {
      status: 403,
      headers: { "content-type": "text/html; charset=UTF-8" },
    }));

    await expect(resolveShortlink("https://move2link.co/example", { fetchImpl }))
      .rejects.toBeInstanceOf(SecurityChallengeError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects unsupported input hosts", async () => {
    await expect(resolveShortlink("https://example.com/x"))
      .rejects.toThrow("Unsupported shortlink provider");
  });
});
