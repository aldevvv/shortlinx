import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

export type HostResolver = (hostname: string) => Promise<string[]>;

const blockedAddresses = new BlockList();

for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv4");
}

for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["2001:db8::", 32],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv6");
}

async function defaultResolveHost(hostname: string): Promise<string[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

function normalizedHostname(url: URL): string {
  return url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
}

function mappedIpv4(address: string): string | undefined {
  const normalized = address.toLowerCase();
  if (!normalized.startsWith("::ffff:")) return undefined;
  const suffix = normalized.slice(7);
  if (isIP(suffix) === 4) return suffix;
  const match = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(suffix);
  if (!match) return undefined;
  const high = Number.parseInt(match[1]!, 16);
  const low = Number.parseInt(match[2]!, 16);
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

function isBlockedAddress(address: string): boolean {
  const mapped = mappedIpv4(address);
  if (mapped) return blockedAddresses.check(mapped, "ipv4");
  const family = isIP(address);
  if (family === 4) return blockedAddresses.check(address, "ipv4");
  if (family === 6) return blockedAddresses.check(address, "ipv6");
  return true;
}

export async function assertSafeRedirectUrl(
  value: string,
  resolveHost: HostResolver = defaultResolveHost,
): Promise<void> {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsafe redirect destination: protocol ${url.protocol} is not allowed`);
  }
  if (url.username || url.password) {
    throw new Error("Unsafe redirect destination: embedded credentials are not allowed");
  }

  const hostname = normalizedHostname(url);
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home.arpa")
  ) {
    throw new Error("Unsafe redirect destination: local hostname is not allowed");
  }

  const literalFamily = isIP(hostname);
  const addresses = literalFamily ? [hostname] : await resolveHost(hostname);
  if (addresses.length === 0 || addresses.some(isBlockedAddress)) {
    throw new Error("Unsafe redirect destination: private or non-routable address is not allowed");
  }
}
