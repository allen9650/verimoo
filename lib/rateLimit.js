// In-process rate limiter for public endpoints
const buckets = new Map();
const WINDOW_MS = 60 * 1000;

export function isRateLimited(key, limit = 180) {
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
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }
  const realIp = req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip");
  if (realIp) return realIp.trim();

  // Fallback to user-agent hash if IP is unavailable
  const ua = req.headers.get("user-agent") || "unknown-agent";
  return `fallback-${ua.slice(0, 32)}`;
}
