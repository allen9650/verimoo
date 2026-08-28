// A minimal in-process cache (no Redis dependency for this starter). Keys
// include the participant's and project's `updatedAt` timestamps, so any edit
// to either automatically invalidates old entries without needing an explicit
// invalidation call — a certificate is only ever cached as long as nothing
// about it or its template has changed since.
//
// This exists specifically to address slow/hanging certificate views: without
// it, every single view/download re-fetches the full Project document
// (including any embedded base64 template image) and re-renders the SVG from
// scratch, every time — even for the same certificate viewed twice in a row.
const store = new Map();
const MAX_ENTRIES = 500;
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function cacheSet(key, value) {
  if (store.size >= MAX_ENTRIES) {
    // Evict the oldest entry (Map preserves insertion order).
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) store.delete(oldestKey);
  }
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}
