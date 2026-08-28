import dns from "dns/promises";
import net from "net";

// Fetching a font from an admin-supplied URL means the *server* makes an
// outbound request to wherever that URL points — without guardrails, this is
// a classic SSRF (server-side request forgery) vector: a malicious or
// compromised admin account could point it at an internal service or a
// cloud metadata endpoint (e.g. 169.254.169.254, used by AWS/GCP/Azure to
// serve instance credentials) and use the server as a proxy to reach
// network locations it has no business reaching. Every check below exists
// to close one specific version of that hole.

const MAX_BYTES = 3 * 1024 * 1024; // 3MB — generous for a single font file
const FETCH_TIMEOUT_MS = 8000;

function isPrivateOrReservedIp(ip) {
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    return (
      lower === "::1" || // loopback
      lower.startsWith("fe80:") || // link-local
      lower.startsWith("fc") ||
      lower.startsWith("fd") || // unique local
      lower.startsWith("::ffff:127.") || // IPv4-mapped loopback
      lower.startsWith("::ffff:169.254.") ||
      lower.startsWith("::ffff:10.") ||
      lower.startsWith("::ffff:192.168.")
    );
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true; // malformed -> reject
  const [a, b] = parts;
  return (
    a === 127 || // loopback
    a === 10 || // private
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) || // private
    (a === 169 && b === 254) || // link-local, includes cloud metadata (169.254.169.254)
    a === 0 ||
    a >= 224 // multicast/reserved
  );
}

async function assertPublicHost(hostname) {
  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new Error("Could not resolve that hostname.");
  }
  if (addresses.length === 0) throw new Error("Could not resolve that hostname.");
  // Check every resolved address (a hostname can resolve to multiple IPs,
  // and DNS rebinding attacks rely on checking only one) — reject if *any*
  // of them is private/reserved.
  for (const { address } of addresses) {
    if (isPrivateOrReservedIp(address)) {
      throw new Error("That URL points to a private or reserved network address, which isn't allowed.");
    }
  }
}

// Fetches a URL with SSRF guards (public-IP-only, size cap, timeout) and
// returns { buffer, contentType }. Throws a user-safe error message on any
// rejection.
export async function safeFetch(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http:// and https:// URLs are allowed.");
  }
  await assertPublicHost(parsed.hostname);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,text/css,application/xhtml+xml,application/xml;q=0.9,font/woff2,font/woff,*/*;q=0.8",
      },
    });
  } catch {
    throw new Error("Couldn't reach that URL (timed out or connection failed).");
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw new Error(`That URL returned an error (${res.status}).`);

  // Re-check the *final* URL after redirects — a public URL could redirect
  // to a private one.
  const finalUrl = new URL(res.url || parsed.toString());
  if (finalUrl.hostname !== parsed.hostname) {
    await assertPublicHost(finalUrl.hostname);
  }

  const contentLength = Number(res.headers.get("content-length") || 0);
  if (contentLength > MAX_BYTES) {
    throw new Error("That file is too large (max 3MB).");
  }

  const reader = res.body?.getReader();
  const chunks = [];
  let total = 0;
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) throw new Error("That file is too large (max 3MB).");
      chunks.push(value);
    }
  }
  const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  const contentType = res.headers.get("content-type") || "";
  return { buffer, contentType };
}
