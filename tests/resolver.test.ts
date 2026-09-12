import { describe, expect, it, vi } from "vitest";
import { resolveShortlink } from "../src/index.js";
import { SecurityChallengeError } from "../src/core/errors.js";

const telegram = "https://t.me/example_channel";

describe("resolveShortlink", () => {
  it("follows ordinary HTTP redirects to a Telegram destination", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/step" } }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: telegram } }));

    const result = await resolveShortlink("https://move2link.co/example", {
      fetchImpl,
      resolveHost: async () => ["203.0.114.10"],
    });

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

  it("rejects credentials embedded in the initial URL", async () => {
    await expect(resolveShortlink("https://user:password@move2link.co/x"))
      .rejects.toThrow("must not contain embedded credentials");
  });

  it("blocks redirects to private network addresses before fetching them", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1:8080/admin" },
      }));

    await expect(resolveShortlink("https://move2link.co/example", { fetchImpl }))
      .rejects.toThrow("Unsafe redirect destination");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("blocks redirects whose hostname resolves to a private address", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response(null, {
      status: 302,
      headers: { location: "https://internal.example/admin" },
    }));

    await expect(resolveShortlink("https://move2link.co/example", {
      fetchImpl,
      resolveHost: async () => ["10.0.0.8"],
    })).rejects.toThrow("Unsafe redirect destination");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not treat Location on a 200 response as a redirect", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response("ordinary page", {
      status: 200,
      headers: { location: telegram },
    }));

    await expect(resolveShortlink("https://move2link.co/example", { fetchImpl }))
      .rejects.toThrow("did not resolve to a Telegram URL");
  });
});
