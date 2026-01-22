/**
 * Plain-text password handling (no encryption).
 * Passwords are stored and compared as-is.
 */
/**
 * No-op: returns password unchanged. Kept for API compatibility.
 */
export declare function hashPassword(password: string): Promise<string>;
/**
 * Compare plain text password with stored password.
 * Both are trimmed and compared as-is (case-sensitive).
 */
export declare function comparePassword(password: string, storedPassword: string): Promise<boolean>;
//# sourceMappingURL=password.d.ts.map