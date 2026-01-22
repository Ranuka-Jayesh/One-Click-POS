/**
 * Plain-text password handling (no encryption).
 * Passwords are stored and compared as-is.
 */

/**
 * No-op: returns password unchanged. Kept for API compatibility.
 */
export function hashPassword(password: string): Promise<string> {
  return Promise.resolve(password);
}

/**
 * Compare plain text password with stored password.
 * Both are trimmed and compared as-is (case-sensitive).
 */
export function comparePassword(password: string, storedPassword: string): Promise<boolean> {
  if (!password || typeof password !== 'string' || !storedPassword || typeof storedPassword !== 'string') {
    return Promise.resolve(false);
  }
  // Trim both for comparison (passwords should already be trimmed before calling, but be safe)
  const trimmedInput = password.trim();
  const trimmedStored = storedPassword.trim();
  return Promise.resolve(trimmedInput === trimmedStored);
}
