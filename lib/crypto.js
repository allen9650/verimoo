import crypto from "crypto";

// Encrypts sensitive per-project secrets (currently: the Gmail app password
// used for sending certificate emails) before they're stored in MongoDB, so a
// database dump/leak doesn't hand over usable credentials directly.
//
// Requires ENCRYPTION_KEY in the environment — any 32+ character random
// string (e.g. `openssl rand -hex 32`). Falls back to NEXTAUTH_SECRET if
// ENCRYPTION_KEY isn't set, purely so this doesn't hard-fail in a starter
// project someone hasn't fully configured yet; set a dedicated
// ENCRYPTION_KEY for real deployments so rotating one secret doesn't affect
// the other.
function getKey() {
  const secret = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("ENCRYPTION_KEY (or NEXTAUTH_SECRET) must be set to store encrypted project secrets.");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(plainText) {
  if (!plainText) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(encoded) {
  if (!encoded) return "";
  const raw = Buffer.from(encoded, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
