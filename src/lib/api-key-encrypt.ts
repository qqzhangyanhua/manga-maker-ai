import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET || process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("缺少 AUTH_SECRET / JWT_SECRET / ENCRYPTION_KEY，用于 API Key 加密");
  }
  return crypto.scryptSync(secret, "user-api-key-salt", KEY_LENGTH);
}

/**
 * 使用 AES-256-GCM 加密 API Key
 */
export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * 使用 AES-256-GCM 解密 API Key
 */
export function decryptApiKey(ciphertext: string): string {
  const key = getEncryptionKey();
  const buffer = Buffer.from(ciphertext, "base64");
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

/**
 * 将 API Key 脱敏显示，如 sk-***xyz
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "***";
  }
  return `${apiKey.slice(0, 4)}***${apiKey.slice(-4)}`;
}
