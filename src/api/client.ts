import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type ApiBook = {
  id: string;
  title: string;
  authors: string[];
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
  availability: 'metadata_only' | 'provider_file';
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

export function getApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

  // On web:
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${window.location.protocol}//${window.location.hostname}:4000`;
    }
    return configured || 'http://localhost:4000';
  }

  // On native mobile (Expo Go or emulator): automatically connect to dev server host IP
  if (Platform.OS !== 'web') {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      return `http://${host}:4000`;
    }
  }

  return configured || 'http://localhost:4000';
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
  if (!baseUrl) {
    throw new Error('Set EXPO_PUBLIC_API_URL in the app environment to connect the Libery API.');
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(`${baseUrl}/v1${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
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
}

export async function fetchCommunityPosts(limit = 20, accessToken?: string): Promise<ApiCommunityPost[]> {
  const res = await apiRequest<{ posts: ApiCommunityPost[] }>(`/posts?limit=${limit}`, { method: 'GET' }, accessToken);
  return res.posts;
}

export async function createCommunityPost(
  input: { content: string; bookId?: string },
  accessToken: string,
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
