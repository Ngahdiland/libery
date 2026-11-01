import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

import type { AppConfig } from './config.js';
import { ApiError } from './errors.js';
import { createApiRouter } from './routes/api.js';
import type { AppStore } from './types.js';

export function createApp(store: AppStore, config: AppConfig) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxyHops);
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'This origin is not allowed.'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Admin-Key'],
    maxAge: 600,
  }));
  app.use(express.json({ limit: '64kb', strict: true }));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/v1/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'AUTH_RATE_LIMITED', message: 'Too many authentication attempts. Try again later.' } },
  }));
  app.use('/v1', rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' } },
  }));
  app.use('/v1', createApiRouter(store, config));

  app.use((_request, _response, next) => {
    next(new ApiError(404, 'NOT_FOUND', 'The requested endpoint was not found.'));
  });

  const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    if (response.headersSent) return;

    if (error instanceof ApiError) {
      response.status(error.status).json({ error: { code: error.code, message: error.message } });
      return;
    }

    if (error instanceof SyntaxError && 'body' in error) {
      response.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } });
      return;
    }

    if (config.nodeEnv !== 'test') {
      console.error('Unhandled API error', error instanceof Error ? error.message : 'unknown error');
    }
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
  };
  app.use(errorHandler);

  return app;
}
