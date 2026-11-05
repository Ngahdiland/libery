import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type ApiBook = {
  id: string;
  title: string;
  authors: string[];
  author?: string;
  provider: string;
  description: string;
  categories: string[];
  language: string;
  ageRating: string;
  pages?: number;
  ratingAvg: number;
  ratingCount: number;
  coverImageUrl?: string;
  sourceName?: string;
  sourceUrl?: string;
  license?: string;
  downloadUrl?: string;
  totalChapters?: number;
  availability: 'metadata_only' | 'provider_file' | 'in_app_text';
};

export type ApiChapter = {
  id: string;
  bookId: string;
  chapterNumber: number;
  title: string;
  text: string;
  wordCount: number;
  audioUrl?: string;
};

export type ApiChapterSummary = Omit<ApiChapter, 'text'>;

export type ApiReadingProgress = {
  userId: string;
  bookId: string;
  chapterNumber: number;
  textPosition: number;
  audioPositionSeconds: number;
  updatedAt: string;
};

export type ApiCommunityPost = {
  id: string;
  userId: string;
  author: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  content: string;
  bookId?: string;
  book?: ApiBook;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
};

export type ApiUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  ageGroup: 'kids' | 'teens' | 'adults';
  focusAreas: string[];
  languages: string[];
  role: 'reader' | 'provider' | 'admin';
  providerStatus?: 'pending' | 'verified' | 'rejected';
};

export type SessionResponse = {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  if (configured) {
    return configured;
  }
  return 'https://librahubserver.onrender.com';
}

export function getApiErrorMessage(payload: unknown, fallback: string) {
  if (
    typeof payload === 'object'
    && payload !== null
    && 'error' in payload
    && typeof payload.error === 'object'
    && payload.error !== null
    && 'message' in payload.error
    && typeof payload.error.message === 'string'
  ) {
    return payload.error.message;
  }
  return fallback;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const baseUrl = getApiBaseUrl();

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  // Render free tier can take up to 60s on cold start
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 65000);

  try {
    const response = await fetch(`${baseUrl}/v1${path}`, {
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);

    const payload: unknown = response.status === 204 ? undefined : await response.json().catch(() => undefined);
    if (!response.ok) {
      const code = typeof payload === 'object' && payload !== null
        && 'error' in payload && typeof payload.error === 'object' && payload.error !== null
        && 'code' in payload.error && typeof payload.error.code === 'string'
        ? payload.error.code
        : undefined;
      throw new ApiRequestError(
        getApiErrorMessage(payload, `The API request failed (${response.status}).`),
        response.status,
        code,
      );
    }
    return payload as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof ApiRequestError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiRequestError(
        'The server is waking up from standby (Render free tier). Please retry in a few moments.',
        504,
        'SERVER_WAKING_UP',
      );
    }
    throw err;
  }
}

export async function fetchCommunityPosts(limit = 20, accessToken?: string): Promise<ApiCommunityPost[]> {
  const res = await apiRequest<{ posts: ApiCommunityPost[] }>(`/posts?limit=${limit}`, { method: 'GET' }, accessToken);
  return res.posts;
}

export async function createCommunityPost(
  input: { content: string; bookId?: string },
  accessToken?: string,
): Promise<ApiCommunityPost> {
  const res = await apiRequest<{ post: ApiCommunityPost }>('/posts', {
    method: 'POST',
    body: JSON.stringify(input),
  }, accessToken);
  return res.post;
}

export async function likeCommunityPost(postId: string, accessToken?: string): Promise<number> {
  const res = await apiRequest<{ likesCount: number }>(`/posts/${postId}/like`, {
    method: 'POST',
  }, accessToken);
  return res.likesCount;
}

export async function fetchBookChapters(bookId: string, accessToken?: string): Promise<{ chapters: ApiChapterSummary[]; totalChapters: number }> {
  return apiRequest<{ chapters: ApiChapterSummary[]; totalChapters: number }>(`/books/${encodeURIComponent(bookId)}/chapters`, { method: 'GET' }, accessToken);
}

export async function fetchChapter(bookId: string, chapterNumber: number, accessToken?: string): Promise<ApiChapter> {
  const res = await apiRequest<{ chapter: ApiChapter }>(`/books/${encodeURIComponent(bookId)}/chapters/${chapterNumber}`, { method: 'GET' }, accessToken);
  return res.chapter;
}

export async function fetchReadingProgress(bookId: string, accessToken: string): Promise<ApiReadingProgress | null> {
  const res = await apiRequest<{ progress: ApiReadingProgress | null }>(`/me/progress/${encodeURIComponent(bookId)}`, { method: 'GET' }, accessToken);
  return res.progress;
}

export async function saveReadingProgress(
  bookId: string,
  progress: { chapterNumber: number; textPosition: number; audioPositionSeconds: number },
  accessToken?: string,
): Promise<ApiReadingProgress> {
  const res = await apiRequest<{ progress: ApiReadingProgress }>(`/me/progress/${encodeURIComponent(bookId)}`, {
    method: 'PUT',
    body: JSON.stringify(progress),
  }, accessToken);
  return res.progress;
}
