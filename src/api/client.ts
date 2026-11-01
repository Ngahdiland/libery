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

export type ApiUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
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
  return process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '') ?? '';
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

  const response = await fetch(`${baseUrl}/v1${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
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
