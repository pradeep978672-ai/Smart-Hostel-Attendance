/**
 * Password hashing and verification utilities.
 * Uses standard SHA-256 cryptographic hashing (Web Crypto API / Node.js crypto).
 */

/**
 * Computes a SHA-256 hash of a string.
 * Returns a 64-character lowercase hex string.
 */
export async function hashPassword(password: string): Promise<string> {
  const trimmed = (password || '').trim();

  // 1. Browser environment with window.crypto.subtle
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(trimmed);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // 2. Global crypto environment (Node 18+, Edge runtime, modern workers)
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(trimmed);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // 3. Node.js environment fallback
  try {
    const { createHash } = await import('crypto');
    return createHash('sha256').update(trimmed).digest('hex');
  } catch {
    throw new Error('Cryptographic environment not available for hashing.');
  }
}

/**
 * Checks whether a given string is a valid 64-character hex SHA-256 hash.
 */
export function isSha256Hash(str?: string | null): boolean {
  if (!str) return false;
  return /^[a-f0-9]{64}$/i.test(str.trim());
}

/**
 * Verifies an entered plain-text password against a stored password_hash.
 *
 * Security rules:
 * 1. Hashes the entered password using SHA-256.
 * 2. Compares computed hash with stored hash (never plain-text with hash).
 * 3. Backward-compatible with legacy plain-text entries in the database.
 */
export async function verifyPassword(
  enteredPassword: string,
  storedPasswordHash?: string | null
): Promise<boolean> {
  if (!enteredPassword || !storedPasswordHash) return false;

  const enteredTrimmed = enteredPassword.trim();
  const storedTrimmed = storedPasswordHash.trim();

  // If stored value is a 64-char SHA-256 hash:
  const computedHash = await hashPassword(enteredTrimmed);
  if (computedHash.toLowerCase() === storedTrimmed.toLowerCase()) {
    return true;
  }

  // Backward-compatibility: If stored value is NOT a SHA-256 hash (legacy plain-text record):
  if (!isSha256Hash(storedTrimmed)) {
    if (enteredTrimmed === storedTrimmed) {
      return true;
    }
  }

  return false;
}
