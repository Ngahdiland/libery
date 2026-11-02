import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../errors.js';
import { apiKeyMatches, verifyAccessToken } from '../security.js';
import type { AppConfig } from '../config.js';
import type { AppStore, UserRecord } from '../types.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserRecord;
    }
  }
}

export function requireAuth(store: AppStore, config: AppConfig) {
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      const authorization = request.header('authorization');
      const match = authorization?.match(/^Bearer ([A-Za-z0-9._-]+)$/);
      if (!match) throw new ApiError(401, 'AUTH_REQUIRED', 'Sign in is required.');

      let userId: string;
      try {
        userId = verifyAccessToken(match[1], config.jwtAccessSecret);
      } catch {
        throw new ApiError(401, 'INVALID_ACCESS_TOKEN', 'The access token is invalid or expired.');
      }

      const user = await store.findUserById(userId);
      if (!user || user.status !== 'active') {
        throw new ApiError(401, 'ACCOUNT_UNAVAILABLE', 'This account is unavailable.');
      }

      request.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function optionalAuth(store: AppStore, config: AppConfig) {
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      const authorization = request.header('authorization');
      const match = authorization?.match(/^Bearer ([A-Za-z0-9._-]+)$/);
      if (!match) {
        next();
        return;
      }

      let userId: string;
      try {
        userId = verifyAccessToken(match[1], config.jwtAccessSecret);
      } catch {
        next();
        return;
      }

      const user = await store.findUserById(userId);
      if (user && user.status === 'active') {
        request.user = user;
      }
      next();
    } catch {
      next();
    }
  };
}

export function requireVerifiedProvider(request: Request, _response: Response, next: NextFunction) {
  if (request.user?.role !== 'provider' || request.user.providerStatus !== 'verified') {
    next(new ApiError(403, 'PROVIDER_VERIFICATION_REQUIRED', 'A verified provider account is required.'));
    return;
  }
  next();
}

export function requireAdminKey(config: AppConfig) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!apiKeyMatches(request.header('x-admin-key'), config.adminApiKey)) {
      next(new ApiError(401, 'ADMIN_AUTH_REQUIRED', 'A valid admin key is required.'));
      return;
    }
    next();
  };
}
