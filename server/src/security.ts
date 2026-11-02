import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';

import type { User } from './types.js';

const ISSUER = 'libery-api';
const AUDIENCE = 'libery-app';
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function createAccessToken(user: Pick<User, 'id'>, secret: string) {
  return jwt.sign({ sub: user.id }, secret, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function verifyAccessToken(token: string, secret: string): string {
  const payload = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new Error('Invalid access token subject.');
  }
  return payload.sub;
}

export function createRefreshToken() {
  return randomBytes(32).toString('base64url');
}

export function hashRefreshToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function apiKeyMatches(provided: string | undefined, expected: string | undefined) {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

export const accessTokenExpiresIn = ACCESS_TOKEN_TTL_SECONDS;
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function createResetToken() {
  return randomBytes(32).toString('base64url');
}

export function hashResetToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
