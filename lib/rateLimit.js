// A minimal in-process rate limiter (per Node instance — fine for a single
// server/starter; swap for a Redis-backed limiter behind a load balancer).
// Protects public, unauthenticated endpoints (serial lookup, certificate
// download) from being used to brute-force/enumerate serial numbers or to
// exhaust server resources with rapid repeated requests.
const buckets = new Map();
const WINDOW_MS = 60 * 1000;

export function isRateLimited(key, limit = 30) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { windowStart: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

export function getClientKey(req) {
  // x-forwarded-for is set by most reverse proxies/hosts; falls back to a
  // shared bucket if genuinely unavailable (e.g. local dev without a proxy).
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
