/**
 * Simple in-memory rate limiter for serverless functions.
 * Resets on cold starts — adequate for burst protection.
 */
const requests = new Map<string, { count: number; resetAt: number }>();

// Cleanup old entries periodically to prevent memory leaks
function cleanup() {
  const now = Date.now();
  for (const [key, record] of requests) {
    if (now > record.resetAt) {
      requests.delete(key);
    }
  }
}

/**
 * Check if a request is allowed under the rate limit.
 * @param key - Unique identifier (e.g., "register:{ip}")
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if allowed, false if rate-limited
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const record = requests.get(key);

  // Cleanup every 100 checks
  if (requests.size > 100) cleanup();

  if (!record || now > record.resetAt) {
    requests.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}
