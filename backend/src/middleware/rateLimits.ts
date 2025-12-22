/**
 * Stricter rate limiting for sensitive endpoints.
 * These limits supplement the global rate limit in server.ts.
 */

import rateLimit from 'express-rate-limit';
import { logSecurityEvent, getClientIp, getUserAgent } from '../utils/security';
import { Request, Response } from 'express';

/**
 * Rate limit for authentication endpoints (login, OAuth callbacks)
 * More restrictive to prevent brute force attacks.
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // 20 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
  handler: (req: Request, res: Response) => {
    logSecurityEvent({
      type: 'RATE_LIMIT_EXCEEDED',
      ip: getClientIp(req),
      path: req.path,
      method: req.method,
      userAgent: getUserAgent(req),
      details: 'Auth rate limit exceeded',
    });
    res.status(429).json({ error: 'Too many authentication attempts. Please try again later.' });
  },
});

/**
 * Rate limit for verification endpoints (Roblox verification)
 * Prevents verification code abuse.
 */
export const verificationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 10, // 10 requests per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification attempts. Please wait before trying again.' },
  handler: (req: Request, res: Response) => {
    logSecurityEvent({
      type: 'RATE_LIMIT_EXCEEDED',
      ip: getClientIp(req),
      path: req.path,
      method: req.method,
      userAgent: getUserAgent(req),
      details: 'Verification rate limit exceeded',
    });
    res.status(429).json({ error: 'Too many verification attempts. Please wait before trying again.' });
  },
});

/**
 * Rate limit for admin operations.
 * Protects sensitive admin endpoints.
 */
export const adminRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
  handler: (req: Request, res: Response) => {
    logSecurityEvent({
      type: 'RATE_LIMIT_EXCEEDED',
      ip: getClientIp(req),
      path: req.path,
      method: req.method,
      userAgent: getUserAgent(req),
      details: 'Admin rate limit exceeded',
    });
    res.status(429).json({ error: 'Too many requests. Please slow down.' });
  },
});

/**
 * Strict rate limit for dangerous admin operations (reset, etc.)
 */
export const strictAdminRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5, // 5 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many administrative operations. Please wait.' },
  handler: (req: Request, res: Response) => {
    logSecurityEvent({
      type: 'RATE_LIMIT_EXCEEDED',
      ip: getClientIp(req),
      path: req.path,
      method: req.method,
      userAgent: getUserAgent(req),
      details: 'Strict admin rate limit exceeded',
    });
    res.status(429).json({ error: 'Too many administrative operations. Please wait.' });
  },
});

/**
 * Rate limit for bot API endpoints.
 * Allows higher throughput for legitimate bot operations.
 */
export const botRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 200, // 200 requests per minute (batch processing needs higher limit)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded for bot operations.' },
  handler: (req: Request, res: Response) => {
    logSecurityEvent({
      type: 'RATE_LIMIT_EXCEEDED',
      ip: getClientIp(req),
      path: req.path,
      method: req.method,
      details: 'Bot rate limit exceeded',
    });
    res.status(429).json({ error: 'Rate limit exceeded for bot operations.' });
  },
});

/**
 * Rate limit for LOA requests (prevent spam)
 */
export const loaRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5, // 5 LOA requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many LOA requests. Please wait before submitting another.' },
});

/**
 * Rate limit for infraction issuance (prevent abuse)
 */
export const infractionRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 20, // 20 infractions per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many infraction operations. Please slow down.' },
});
