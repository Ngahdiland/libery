import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
// express types

import { ApiError } from '../errors.js';
import { optionalAuth, requireAdminKey, requireAuth, requireVerifiedProvider } from '../middleware/auth.js';
import {
  accessTokenExpiresIn,
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_MS,
} from '../security.js';
import type { AppConfig } from '../config.js';
import type { AppStore, Book, Chapter, ReadingProgress, UserRecord } from '../types.js';

const emailSchema = z.string().email().max(254).transform((value) => value.trim().toLowerCase());
const passwordSchema = z.string().min(12).max(128);
const dummyPasswordHash = bcrypt.hashSync(randomBytes(32).toString('hex'), 12);
const accountSchema = z.object({
  email: emailSchema,
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().trim().min(1).max(80),
  password: passwordSchema,
  ageGroup: z.enum(['kids', 'teens', 'adults']),
  focusAreas: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  languages: z.array(z.enum(['English', 'French'])).min(1).max(2).default(['English']),
  accountType: z.enum(['reader', 'provider']).default('reader'),
  providerName: z.string().trim().min(2).max(120).optional(),
}).strict();

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
}).strict();

const refreshSchema = z.object({ refreshToken: z.string().min(40).max(128) }).strict();
const coverImageUrlSchema = z.string().url().max(2048).refine((value) => {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  return url.protocol === 'https:'
    && !url.username
    && !url.password
    && host !== 'localhost'
    && !host.endsWith('.local')
    && !/^(?:127\.|10\.|192\.168\.|169\.254\.)/.test(host)
    && !/^172\.(?:1[6-9]|2\d|3[01])\./.test(host);
}, 'Cover images must use a public HTTPS URL.');
const preferencesSchema = z.object({
  ageGroup: z.enum(['kids', 'teens', 'adults']),
  focusAreas: z.array(z.string().trim().min(1).max(40)).max(20),
  languages: z.array(z.enum(['English', 'French'])).min(1).max(2),
}).strict();
const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(300).optional(),
  avatarUrl: z.string().max(2_000_000).optional(),
  ageGroup: z.enum(['kids', 'teens', 'adults']).optional(),
  focusAreas: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  languages: z.array(z.enum(['English', 'French'])).min(1).max(2).optional(),
}).strict();
const createPostSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  bookId: z.string().regex(/^[a-fA-F0-9]{24}$/).optional(),
}).strict();

const libraryItemSchema = z.object({
  status: z.enum(['reading', 'want_to_read', 'finished']),
  progress: z.number().int().min(0).max(100),
  isFavorite: z.boolean(),
}).strict();
const allowedCoverTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_request, file, callback) {
    if (!allowedCoverTypes.has(file.mimetype)) {
      callback(new ApiError(400, 'UNSUPPORTED_COVER_FORMAT', 'Cover must be a JPEG, PNG, or WebP image.'));
      return;
    }
    callback(null, true);
  },
}).single('cover');
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_request, file, callback) {
    if (!allowedCoverTypes.has(file.mimetype)) {
      callback(new ApiError(400, 'UNSUPPORTED_AVATAR_FORMAT', 'Avatar must be a JPEG, PNG, or WebP image.'));
      return;
    }
    callback(null, true);
  },
}).single('avatar');

const bookInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  authors: z.array(z.string().trim().min(1).max(120)).min(1).max(10),
  description: z.string().trim().min(1).max(5000),
  categories: z.array(z.string().trim().min(1).max(60)).min(1).max(10),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  language: z.enum(['English', 'French']),
  ageRating: z.enum(['Kids', 'Teen', 'Adult']),
  pages: z.number().int().min(1).max(10000),
  coverImageUrl: coverImageUrlSchema.optional(),
  access: z.enum(['free', 'paid', 'subscription']).default('free'),
  priceMinor: z.number().int().positive().max(100_000_000).optional(),
  currency: z.enum(['USD', 'EUR', 'XAF']).optional(),
  rightsConfirmed: z.literal(true),
}).strict().superRefine((value, context) => {
  if (value.access === 'paid' && (!value.priceMinor || !value.currency)) {
    context.addIssue({
      code: 'custom',
      message: 'Paid books require a positive price and supported currency.',
      path: ['priceMinor'],
    });
  }
});

const bookQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  language: z.enum(['English', 'French']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().regex(/^[a-fA-F0-9]{24}$/).optional(),
}).strict();

function publicUser(user: UserRecord) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function routeError(error: unknown, response: Response, next: NextFunction) {
  if (error instanceof z.ZodError) {
    response.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Request data is invalid.', details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })) },
    });
    return;
  }
  next(error);
}

function asyncRoute(handler: (request: Request, response: Response) => Promise<void>) {
  return (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response).catch((error: unknown) => routeError(error, response, next));
  };
}

function createSessionPayload(user: UserRecord, accessToken: string, refreshToken: string) {
  return {
    user: publicUser(user),
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: accessTokenExpiresIn,
  };
}

async function auditAdminAction(
  store: AppStore,
  action: 'provider_verified' | 'provider_rejected' | 'book_published' | 'book_removed',
  targetId: string,
) {
  try {
    await store.recordAdminAuditEvent({ action, targetId, createdAt: new Date() });
  } catch {
    console.error('Admin action audit record could not be persisted.');
  }
}

async function issueRefreshSession(store: AppStore, user: UserRecord) {
  const refreshToken = createRefreshToken();
  await store.saveRefreshSession({
    tokenHash: hashRefreshToken(refreshToken),
    userId: user.id,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  return refreshToken;
}

export function createApiRouter(store: AppStore, config: AppConfig) {
  const router = Router();
  const auth = requireAuth(store, config);
  const maybeAuth = optionalAuth(store, config);
  const admin = requireAdminKey(config);
  if (config.cloudinary) {
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
      secure: true,
    });
  }
  const requireCloudinary: RequestHandler = (_request, _response, next) => {
    if (!config.cloudinary) {
      next(new ApiError(503, 'COVER_UPLOAD_UNAVAILABLE', 'Cover uploads are not configured on this server.'));
      return;
    }
    next();
  };
  const receiveCover: RequestHandler = (request, response, next) => {
    coverUpload(request, response, (error: unknown) => {
      if (error instanceof multer.MulterError) {
        const tooLarge = error.code === 'LIMIT_FILE_SIZE';
        next(new ApiError(
          tooLarge ? 413 : 400,
          tooLarge ? 'COVER_TOO_LARGE' : 'INVALID_COVER_UPLOAD',
          tooLarge ? 'Cover images must be 5 MB or smaller.' : 'The cover upload is invalid.',
        ));
        return;
      }
      next(error);
    });
  };

  const receiveAvatar: RequestHandler = (request, response, next) => {
    avatarUpload(request, response, (error: unknown) => {
      if (error instanceof multer.MulterError) {
        const tooLarge = error.code === 'LIMIT_FILE_SIZE';
        next(new ApiError(
          tooLarge ? 413 : 400,
          tooLarge ? 'AVATAR_TOO_LARGE' : 'INVALID_AVATAR_UPLOAD',
          tooLarge ? 'Avatar images must be 5 MB or smaller.' : 'The avatar upload is invalid.',
        ));
        return;
      }
      next(error);
    });
  };

  router.get('/health', (_request, response) => response.json({ status: 'ok' }));

  router.post('/auth/register', asyncRoute(async (request, response) => {
    const input = accountSchema.parse(request.body);
    if (input.ageGroup === 'kids') {
      throw new ApiError(403, 'GUARDIAN_CONSENT_REQUIRED', 'Child accounts require a verified guardian consent flow, which is not enabled yet.');
    }
    if (input.accountType === 'provider' && input.ageGroup !== 'adults') {
      throw new ApiError(400, 'PROVIDER_MUST_BE_ADULT', 'Provider accounts are limited to adults.');
    }
    if (input.accountType === 'provider' && !input.providerName) {
      throw new ApiError(400, 'PROVIDER_NAME_REQUIRED', 'A provider organization or display name is required.');
    }

    const [existingEmail, existingUsername] = await Promise.all([
      store.findUserByEmail(input.email),
      store.findUserByUsername(input.username.toLowerCase()),
    ]);
    if (existingEmail || existingUsername) {
      throw new ApiError(409, 'ACCOUNT_ALREADY_EXISTS', 'An account already uses that email or username.');
    }

    let user: UserRecord;
    try {
      user = await store.createUser({
        email: input.email,
        username: input.username.toLowerCase(),
        displayName: input.displayName,
        passwordHash: await bcrypt.hash(input.password, 12),
        ageGroup: input.ageGroup,
        focusAreas: input.focusAreas,
        languages: input.languages,
        role: input.accountType,
        ...(input.accountType === 'provider' ? { providerName: input.providerName, providerStatus: 'pending' as const } : {}),
        status: 'active',
        createdAt: new Date(),
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        throw new ApiError(409, 'ACCOUNT_ALREADY_EXISTS', 'An account already uses that email or username.');
      }
      throw error;
    }

    const refreshToken = await issueRefreshSession(store, user);
    response.status(201).json(createSessionPayload(user, createAccessToken(user, config.jwtAccessSecret), refreshToken));
  }));

  router.post('/auth/login', asyncRoute(async (request, response) => {
    const input = loginSchema.parse(request.body);
    const user = await store.findUserByEmail(input.email);
    const passwordMatches = await bcrypt.compare(input.password, user?.passwordHash ?? dummyPasswordHash);
    if (!user || !passwordMatches || user.status !== 'active') {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }

    const refreshToken = await issueRefreshSession(store, user);
    response.json(createSessionPayload(user, createAccessToken(user, config.jwtAccessSecret), refreshToken));
  }));

  router.post('/auth/refresh', asyncRoute(async (request, response) => {
    const { refreshToken } = refreshSchema.parse(request.body);
    const session = await store.consumeRefreshSession(hashRefreshToken(refreshToken));
    if (!session) throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'The refresh token is invalid or expired.');
    const user = await store.findUserById(session.userId);
    if (!user || user.status !== 'active') {
      throw new ApiError(401, 'ACCOUNT_UNAVAILABLE', 'This account is unavailable.');
    }

    const replacementToken = await issueRefreshSession(store, user);
    response.json(createSessionPayload(user, createAccessToken(user, config.jwtAccessSecret), replacementToken));
  }));

  router.post('/auth/logout', asyncRoute(async (request, response) => {
    const { refreshToken } = refreshSchema.parse(request.body);
    await store.revokeRefreshSession(hashRefreshToken(refreshToken));
    response.status(204).end();
  }));

  router.get('/me', auth, (request, response) => {
    response.json({ user: publicUser(request.user!) });
  });

  router.put('/me/profile', auth, asyncRoute(async (request, response) => {
    const updates = profileUpdateSchema.parse(request.body);
    if (updates.ageGroup) {
      const ageRank = { kids: 0, teens: 1, adults: 2 } as const;
      if (ageRank[updates.ageGroup] > ageRank[request.user!.ageGroup]) {
        throw new ApiError(403, 'AGE_GROUP_UPGRADE_BLOCKED', 'Age group can only be changed to a more restrictive setting.');
      }
    }
    const user = await store.updateUserProfile(request.user!.id, updates);
    if (!user) throw new ApiError(404, 'ACCOUNT_NOT_FOUND', 'Account was not found.');
    response.json({ user: publicUser(user) });
  }));

  router.post('/me/avatar', auth, receiveAvatar, asyncRoute(async (request, response) => {
    const file = request.file;
    if (!file) throw new ApiError(400, 'AVATAR_REQUIRED', 'Choose an image file to upload.');

    const detectedType = await fileTypeFromBuffer(file.buffer);
    if (!detectedType || detectedType.mime !== file.mimetype
      || !['jpg', 'png', 'webp'].includes(detectedType.ext)) {
      throw new ApiError(400, 'INVALID_AVATAR_CONTENT', 'The uploaded file is not a supported image.');
    }

    let avatarUrl: string;

    if (config.cloudinary) {
      try {
        const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({
            folder: `libery/avatars/${request.user!.id}`,
            resource_type: 'image',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            overwrite: true,
            unique_filename: true,
            use_filename: false,
          }, (error, result) => {
            if (error || !result) {
              console.error('Cloudinary avatar upload failed, falling back to embedded storage.');
              reject(error);
              return;
            }
            resolve(result);
          });
          stream.end(file.buffer);
        });

        avatarUrl = cloudinary.url(uploaded.public_id, {
          secure: true,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        });
      } catch {
        avatarUrl = `data:${detectedType.mime};base64,${file.buffer.toString('base64')}`;
      }
    } else {
      avatarUrl = `data:${detectedType.mime};base64,${file.buffer.toString('base64')}`;
    }

    const user = await store.updateUserProfile(request.user!.id, { avatarUrl });
    if (!user) throw new ApiError(404, 'ACCOUNT_NOT_FOUND', 'Account was not found.');
    response.status(200).json({ user: publicUser(user), avatarUrl });
  }));

  router.delete('/me/avatar', auth, asyncRoute(async (request, response) => {
    const user = await store.updateUserProfile(request.user!.id, { avatarUrl: '' });
    if (!user) throw new ApiError(404, 'ACCOUNT_NOT_FOUND', 'Account was not found.');
    response.json({ user: publicUser(user) });
  }));

  router.put('/me/preferences', auth, asyncRoute(async (request, response) => {
    const preferences = preferencesSchema.parse(request.body);
    const ageRank = { kids: 0, teens: 1, adults: 2 } as const;
    if (ageRank[preferences.ageGroup] > ageRank[request.user!.ageGroup]) {
      throw new ApiError(403, 'AGE_GROUP_UPGRADE_BLOCKED', 'Age group can only be changed to a more restrictive setting.');
    }
    const user = await store.updateUserPreferences(request.user!.id, preferences);
    if (!user) throw new ApiError(404, 'ACCOUNT_NOT_FOUND', 'Account was not found.');
    response.json({ user: publicUser(user) });
  }));

  router.get('/me/library', auth, asyncRoute(async (request, response) => {
    response.json({
      items: await store.listLibrary(request.user!.id, request.user!.ageGroup, request.user!.languages),
    });
  }));

  router.put('/me/library/:bookId', auth, asyncRoute(async (request, response) => {
    const bookId = z.string().regex(/^[a-fA-F0-9]{24}$/).parse(request.params.bookId);
    const item = libraryItemSchema.parse(request.body);
    const updated = await store.updateLibraryItem(
      request.user!.id,
      bookId,
      request.user!.ageGroup,
      request.user!.languages,
      item,
    );
    if (!updated) throw new ApiError(404, 'BOOK_NOT_FOUND', 'Book was not found.');
    response.json({ item: updated });
  }));

  router.delete('/me/library/:bookId', auth, asyncRoute(async (request, response) => {
    const bookId = z.string().regex(/^[a-fA-F0-9]{24}$/).parse(request.params.bookId);
    await store.removeLibraryItem(request.user!.id, bookId);
    response.status(204).end();
  }));

  router.get('/books', maybeAuth, asyncRoute(async (request, response) => {
    const query = bookQuerySchema.parse(request.query);
    const user = request.user;
    const ageGroup = user?.ageGroup ?? 'adults';
    const defaultLanguages: ('English' | 'French')[] = ['English', 'French'];
    const userLanguages = user?.languages ?? defaultLanguages;
    const languages = query.language
      ? userLanguages.filter((language) => language === query.language)
      : userLanguages;
    const filter = {
      ageGroup,
      languages: languages.length > 0 ? languages : defaultLanguages,
      ...(query.category ? { category: query.category } : {}),
      ...(query.language ? { language: query.language } : {}),
      ...(query.q ? { query: query.q } : {}),
    };
    const [items, total] = await Promise.all([
      store.listBooks({ ...filter, limit: query.limit, ...(query.cursor ? { beforeId: query.cursor } : {}) }),
      store.countBooks(filter),
    ]);
    response.json({
      items,
      total,
      nextCursor: items.length === query.limit ? items[items.length - 1].id : null,
    });
  }));

  router.get('/books/:id', maybeAuth, asyncRoute(async (request, response) => {
    const id = z.string().regex(/^[a-fA-F0-9]{24}$/).parse(request.params.id);
    const ageGroup = request.user?.ageGroup ?? 'adults';
    const languages = request.user?.languages ?? ['English', 'French'];
    const book = await store.findPublishedBook(id, ageGroup, languages);
    if (!book) throw new ApiError(404, 'BOOK_NOT_FOUND', 'Book was not found.');
    response.json({ book });
  }));

  router.get('/posts', maybeAuth, asyncRoute(async (request, response) => {
    const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 50);
    const posts = await store.listCommunityPosts(limit);
    response.json({ posts });
  }));

  router.post('/posts', maybeAuth, asyncRoute(async (request, response) => {
    const body = createPostSchema.parse(request.body);
    const post = await store.createCommunityPost({
      userId: request.user?.id ?? 'guest_reader',
      author: {
        username: request.user?.username ?? 'curious_reader',
        displayName: request.user?.displayName ?? 'Curious Reader',
        avatarUrl: request.user?.avatarUrl,
      },
      content: body.content,
      bookId: body.bookId,
    });
    response.status(201).json({ post });
  }));

  router.post('/posts/:id/like', auth, asyncRoute(async (request, response) => {
    const postId = z.string().min(1).parse(request.params.id);
    const likesCount = await store.likeCommunityPost(postId);
    if (likesCount === null) throw new ApiError(404, 'POST_NOT_FOUND', 'Post was not found.');
    response.json({ likesCount });
  }));

  router.get('/provider/me', auth, requireVerifiedProvider, (request, response) => {
    response.json({ provider: publicUser(request.user!) });
  });

  router.get('/provider/books', auth, requireVerifiedProvider, asyncRoute(async (request, response) => {
    response.json({ items: await store.listProviderBooks(request.user!.id) });
  }));

  router.post('/provider/covers', auth, requireVerifiedProvider, requireCloudinary, receiveCover, asyncRoute(async (request, response) => {
    const file = request.file;
    if (!file) throw new ApiError(400, 'COVER_REQUIRED', 'Choose a cover image to upload.');

    const detectedType = await fileTypeFromBuffer(file.buffer);
    if (!detectedType || detectedType.mime !== file.mimetype
      || !['jpg', 'png', 'webp'].includes(detectedType.ext)) {
      throw new ApiError(400, 'INVALID_COVER_CONTENT', 'The uploaded file is not a supported image.');
    }

    const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        folder: `libery/covers/${request.user!.id}`,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        overwrite: false,
        unique_filename: true,
        use_filename: false,
      }, (error, result) => {
        if (error || !result) {
          console.error('Cloudinary cover upload failed.');
          reject(new ApiError(502, 'COVER_UPLOAD_FAILED', 'Could not upload this cover right now.'));
          return;
        }
        resolve(result);
      });
      stream.end(file.buffer);
    });
    const coverImageUrl = cloudinary.url(uploaded.public_id, {
      secure: true,
      transformation: [
        { width: 1200, height: 1800, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });
    response.status(201).json({
      coverImageUrl,
      width: uploaded.width,
      height: uploaded.height,
      format: uploaded.format,
    });
  }));

  router.post('/provider/books', auth, requireVerifiedProvider, asyncRoute(async (request, response) => {
    const input = bookInputSchema.parse(request.body);
    const book: Omit<Book, 'id'> = {
      ...input,
      providerId: request.user!.id,
      provider: request.user!.providerName ?? request.user!.displayName,
      ratingAvg: 0,
      ratingCount: 0,
      availability: 'metadata_only',
      status: 'draft',
    };
    response.status(201).json({ book: await store.createBook(book) });
  }));

  router.post('/provider/books/:id/submit', auth, requireVerifiedProvider, asyncRoute(async (request, response) => {
    const id = z.string().regex(/^[a-fA-F0-9]{24}$/).parse(request.params.id);
    const updated = await store.updateBookStatus(id, 'pending_review', request.user!.id, 'draft');
    if (!updated) throw new ApiError(404, 'DRAFT_NOT_FOUND', 'The provider draft was not found.');
    response.status(202).json({ status: 'pending_review' });
  }));

  router.get('/admin/providers/pending', admin, asyncRoute(async (_request, response) => {
    const providers = await store.listPendingProviders();
    response.json({ items: providers.map(publicUser) });
  }));

  router.patch('/admin/providers/:id/:decision', admin, asyncRoute(async (request, response) => {
    const id = z.string().regex(/^[a-fA-F0-9]{24}$/).parse(request.params.id);
    const decision = z.enum(['verify', 'reject']).parse(request.params.decision);
    const provider = await store.updateProviderStatus(id, decision === 'verify' ? 'verified' : 'rejected');
    if (!provider) throw new ApiError(404, 'PROVIDER_NOT_FOUND', 'Pending provider was not found.');
    await auditAdminAction(store, decision === 'verify' ? 'provider_verified' : 'provider_rejected', id);
    response.json({ provider: publicUser(provider) });
  }));

  router.get('/admin/books/pending', admin, asyncRoute(async (_request, response) => {
    response.json({ items: await store.listPendingBooks() });
  }));

  router.patch('/admin/books/:id/:decision', admin, asyncRoute(async (request, response) => {
    const id = z.string().regex(/^[a-fA-F0-9]{24}$/).parse(request.params.id);
    const decision = z.enum(['publish', 'remove']).parse(request.params.decision);
    const updated = await store.updateBookStatus(
      id,
      decision === 'publish' ? 'published' : 'removed',
      undefined,
      decision === 'publish' ? 'pending_review' : undefined,
    );
    if (!updated) throw new ApiError(404, 'BOOK_NOT_FOUND', 'Book was not found.');
    await auditAdminAction(store, decision === 'publish' ? 'book_published' : 'book_removed', id);
    response.json({ status: decision === 'publish' ? 'published' : 'removed' });
  }));

  // -- Reading progress ------------------------------------------------------

  // GET /me/progress/:bookId � fetch saved chapter position for a book
  router.get('/me/progress/:bookId', auth, asyncRoute(async (request, response) => {
    const bookId = z.string().regex(/^[a-fA-F0-9]{24}$/).parse(request.params.bookId);
    const progress = await store.getReadingProgress(request.user!.id, bookId);
    response.json({ progress });
  }));

  // PUT /me/progress/:bookId � upsert chapter position for a book
  const progressSchema = z.object({
    chapterNumber: z.number().int().min(1),
    textPosition: z.number().int().min(0),
    audioPositionSeconds: z.number().min(0),
  }).strict();

  router.put('/me/progress/:bookId', auth, asyncRoute(async (request, response) => {
    const bookId = z.string().regex(/^[a-fA-F0-9]{24}$/).parse(request.params.bookId);
    const body = progressSchema.parse(request.body);
    const progress = await store.saveReadingProgress({ userId: request.user!.id, bookId, ...body });
    response.json({ progress });
  }));

  // -- Chapters --------------------------------------------------------------

  // GET /books/:id/chapters � chapter index (no text) for chapter picker UI
  router.get('/books/:id/chapters', maybeAuth, asyncRoute(async (request, response) => {
    const bookId = z.string().regex(/^[a-fA-F0-9]{24}$/).parse(request.params.id);
    const ageGroup = request.user?.ageGroup ?? 'adults';
    const languages = request.user?.languages ?? ['English', 'French'];
    const book = await store.findPublishedBook(bookId, ageGroup, languages);
    if (!book) throw new ApiError(404, 'BOOK_NOT_FOUND', 'Book was not found.');
    const chapters = await store.listChapters(bookId);
    response.json({ chapters, totalChapters: chapters.length });
  }));

  // GET /books/:id/chapters/:n � one chapter with full text
  router.get('/books/:id/chapters/:n', maybeAuth, asyncRoute(async (request, response) => {
    const bookId = z.string().regex(/^[a-fA-F0-9]{24}$/).parse(request.params.id);
    const chapterNumber = z.coerce.number().int().min(1).max(9999).parse(request.params.n);
    const ageGroup = request.user?.ageGroup ?? 'adults';
    const languages = request.user?.languages ?? ['English', 'French'];
    const book = await store.findPublishedBook(bookId, ageGroup, languages);
    if (!book) throw new ApiError(404, 'BOOK_NOT_FOUND', 'Book was not found.');
    const chapter = await store.getChapter(bookId, chapterNumber);
    if (!chapter) throw new ApiError(404, 'CHAPTER_NOT_FOUND', 'Chapter was not found.');
    response.json({ chapter });
  }));

  return router;
}