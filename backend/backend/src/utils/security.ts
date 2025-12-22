/**
 * Security utilities for logging, validation, and sanitization.
 * DO NOT log secrets, tokens, or environment variables.
 */

import crypto from 'crypto';

// ============================================================================
// SECURITY LOGGING
// ============================================================================

type SecurityEventType =
  | 'AUTH_FAILURE'
  | 'AUTH_SUCCESS'
  | 'SESSION_EXPIRED'
  | 'TOKEN_INVALID'
  | 'TOKEN_USER_MISMATCH'
  | 'PERMISSION_DENIED'
  | 'ADMIN_ACCESS_DENIED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SUSPICIOUS_INPUT'
  | 'ADMIN_RESET_ATTEMPT'
  | 'VERIFICATION_FAILED'
  | 'IMMUNE_BYPASS';

interface SecurityEvent {
  type: SecurityEventType;
  ip?: string;
  userId?: number;
  discordId?: string;
  path?: string;
  method?: string;
  details?: string;
  userAgent?: string;
}

/**
 * Log a security event without exposing sensitive data.
 * Intentionally does NOT log tokens, secrets, or full request bodies.
 */
export function logSecurityEvent(event: SecurityEvent): void {
  const timestamp = new Date().toISOString();
  const safeDetails = event.details ? event.details.slice(0, 200) : undefined;
  
  const logEntry = {
    timestamp,
    type: event.type,
    ip: maskIp(event.ip),
    userId: event.userId,
    discordId: event.discordId ? maskId(event.discordId) : undefined,
    path: event.path,
    method: event.method,
    details: safeDetails,
    userAgent: event.userAgent ? event.userAgent.slice(0, 100) : undefined,
  };

  // Use separate logging for different severity levels
  const severeEvents: SecurityEventType[] = [
    'TOKEN_USER_MISMATCH',
    'ADMIN_RESET_ATTEMPT',
    'SUSPICIOUS_INPUT',
  ];

  if (severeEvents.includes(event.type)) {
    console.error('[SECURITY ALERT]', JSON.stringify(logEntry));
  } else {
    console.log('[SECURITY]', JSON.stringify(logEntry));
  }
}

/**
 * Mask IP address for privacy (show only first two octets for IPv4)
 */
function maskIp(ip?: string): string | undefined {
  if (!ip) return undefined;
  
  // Handle IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.x.x`;
    }
  }
  
  // Handle IPv6 or forwarded headers - just show prefix
  if (ip.includes(':')) {
    return ip.split(':').slice(0, 3).join(':') + ':x:x:x:x:x';
  }
  
  return ip.slice(0, 10) + '...';
}

/**
 * Mask Discord ID for logging (show first 4 and last 2 chars)
 */
function maskId(id: string): string {
  if (id.length <= 6) return '****';
  return id.slice(0, 4) + '****' + id.slice(-2);
}

// ============================================================================
// INPUT VALIDATION & SANITIZATION
// ============================================================================

/**
 * Sanitize string input to prevent XSS.
 * Escapes HTML special characters.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and parse a positive integer from string.
 * Returns null if invalid.
 */
export function parsePositiveInt(value: unknown): number | null {
  if (typeof value === 'number') {
    if (Number.isInteger(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER) {
      return value;
    }
    return null;
  }
  
  if (typeof value !== 'string') return null;
  
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n <= 0 || n > Number.MAX_SAFE_INTEGER) return null;
  
  return n;
}

/**
 * Validate Discord ID format (numeric string, 17-20 digits)
 */
export function isValidDiscordId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  return /^\d{17,20}$/.test(id);
}

/**
 * Validate Roblox username format (3-20 chars, alphanumeric + underscore)
 */
export function isValidRobloxUsername(username: unknown): username is string {
  if (typeof username !== 'string') return false;
  return /^[A-Za-z0-9_]{3,20}$/.test(username);
}

/**
 * Validate date string format (YYYY-MM-DD)
 */
export function isValidDateString(date: unknown): date is string {
  if (typeof date !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

/**
 * Validate string length within bounds
 */
export function isValidStringLength(
  str: unknown,
  minLength: number,
  maxLength: number
): str is string {
  if (typeof str !== 'string') return false;
  return str.length >= minLength && str.length <= maxLength;
}

/**
 * Check for potentially malicious patterns in input
 */
export function hasSuspiciousPattern(input: string): boolean {
  if (typeof input !== 'string') return false;
  
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /data:/i,
    /vbscript:/i,
    /\x00/, // null bytes
    /[\x01-\x08\x0B\x0C\x0E-\x1F]/, // control characters
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Detect common SQL injection patterns in a string input.
 */
export function hasSqlInjectionRisk(input: unknown): boolean {
  if (typeof input !== 'string') return false;
  const value = input.trim();
  if (!value) return false;

  const sqlInjectionPatterns = [
    /;\s*--/,
    /--\s/,
    /\/\*/,
    /\bunion\b\s+select\b/i,
    /\bdrop\b\s+table\b/i,
    /\bdelete\b\s+from\b/i,
    /\binsert\b\s+into\b/i,
    /\bupdate\b\s+\w+\s+set\b/i,
    /['"`]\s*or\s+['"`]?\d+\s*=\s*\d+/i,
    /\bor\b\s+1\s*=\s*1/i,
    /\bexec\b/i,
  ];

  return sqlInjectionPatterns.some(pattern => pattern.test(value));
}

// ============================================================================
// TIMING-SAFE COMPARISON
// ============================================================================

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  
  if (aBuf.length !== bBuf.length) return false;
  
  return crypto.timingSafeEqual(aBuf, bBuf);
}

// ============================================================================
// REQUEST HELPERS
// ============================================================================

/**
 * Get client IP from request, handling proxies safely.
 */
export function getClientIp(req: { ip?: string; headers?: Record<string, string | string[] | undefined> }): string {
  // Express populates req.ip based on trust proxy setting
  if (req.ip) return req.ip;
  
  // Fallback to x-forwarded-for if available (first IP in chain)
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return first?.trim() || 'unknown';
  }
  
  return 'unknown';
}

/**
 * Get user agent from request
 */
export function getUserAgent(req: { headers?: Record<string, string | string[] | undefined> }): string {
  const ua = req.headers?.['user-agent'];
  if (Array.isArray(ua)) return ua[0] || 'unknown';
  return ua || 'unknown';
}
