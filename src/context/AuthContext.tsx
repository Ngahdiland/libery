import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { apiRequest, ApiRequestError, type ApiUser, type SessionResponse } from '../api/client';

const REFRESH_TOKEN_KEY = 'libery.auth.refresh-token.v1';
let webRefreshToken: string | null = null;

type RegistrationInput = {
  email: string;
  username: string;
  displayName: string;
  password: string;
  ageGroup: ApiUser['ageGroup'];
  focusAreas: string[];
  languages: string[];
  accountType?: 'reader' | 'provider';
  providerName?: string;
};

export type ProfileUpdates = {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  ageGroup?: ApiUser['ageGroup'];
  focusAreas?: string[];
  languages?: string[];
};

type AuthContextValue = {
  accessToken: string | null;
  user: ApiUser | null;
  isReady: boolean;
  error: string | null;
  clearError: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: RegistrationInput) => Promise<void>;
  signOut: () => Promise<void>;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  setUser: (user: ApiUser) => void;
  updateProfile: (updates: ProfileUpdates) => Promise<ApiUser>;
  uploadAvatar: (uri: string, mimeType?: string, fileName?: string) => Promise<{ avatarUrl: string; user: ApiUser }>;
  removeAvatar: () => Promise<ApiUser>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function getRefreshToken() {
  return Platform.OS === 'web' ? webRefreshToken : SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

async function saveRefreshToken(token: string) {
  if (Platform.OS === 'web') {
    webRefreshToken = token;
    return;
  }
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

async function deleteRefreshToken() {
  if (Platform.OS === 'web') {
    webRefreshToken = null;
    return;
  }
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const refreshPromise = useRef<Promise<SessionResponse> | null>(null);

  const acceptSession = useCallback(async (session: SessionResponse) => {
    await saveRefreshToken(session.refreshToken);
    accessTokenRef.current = session.accessToken;
    setAccessToken(session.accessToken);
    setUser(session.user);
    setError(null);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const refreshToken = await getRefreshToken();
        if (refreshToken) {
          const session = await apiRequest<SessionResponse>('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          });
          if (active) {
            await saveRefreshToken(session.refreshToken);
            accessTokenRef.current = session.accessToken;
            setAccessToken(session.accessToken);
            setUser(session.user);
          }
        }
      } catch (restoreError) {
        if (restoreError instanceof ApiRequestError && restoreError.status === 401) {
          await deleteRefreshToken();
        }
        setError(restoreError instanceof Error ? restoreError.message : 'Could not restore the cloud session.');
      } finally {
        if (active) setIsReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await apiRequest<SessionResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await acceptSession(session);
  }, [acceptSession]);

  const register = useCallback(async (input: RegistrationInput) => {
    const session = await apiRequest<SessionResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...input, accountType: input.accountType ?? 'reader' }),
    });
    await acceptSession(session);
  }, [acceptSession]);

  const signOut = useCallback(async () => {
    const refreshToken = await getRefreshToken();
    try {
      if (refreshToken && accessToken) {
        await apiRequest<void>('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        }, accessToken);
      }
      setError(null);
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'The server could not revoke this session.');
    } finally {
      await deleteRefreshToken();
      accessTokenRef.current = null;
      setAccessToken(null);
      setUser(null);
    }
  }, [accessToken]);

  const request = useCallback(async <T,>(path: string, options?: RequestInit): Promise<T> => {
    const currentToken = accessTokenRef.current;
    if (!currentToken) throw new Error('Sign in to load the cloud library.');

    try {
      return await apiRequest<T>(path, options, currentToken);
    } catch (requestError) {
      if (!(requestError instanceof ApiRequestError)
        || requestError.status !== 401
        || requestError.code !== 'INVALID_ACCESS_TOKEN') {
        throw requestError;
      }

      const latestToken = accessTokenRef.current;
      if (latestToken && latestToken !== currentToken) {
        return apiRequest<T>(path, options, latestToken);
      }

      let sessionPromise = refreshPromise.current;
      if (!sessionPromise) {
        sessionPromise = (async () => {
          const refreshToken = await getRefreshToken();
          if (!refreshToken) throw new Error('Your session expired. Sign in again to continue.');
          const session = await apiRequest<SessionResponse>('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          });
          await acceptSession(session);
          return session;
        })();
        refreshPromise.current = sessionPromise;
      }

      try {
        const session = await sessionPromise;
        return await apiRequest<T>(path, options, session.accessToken);
      } catch (refreshError) {
        if (refreshError instanceof ApiRequestError && refreshError.status === 401) {
          await deleteRefreshToken();
          accessTokenRef.current = null;
          setAccessToken(null);
          setUser(null);
          setError('Your session expired. Sign in again to continue.');
        }
        throw refreshError;
      } finally {
        if (refreshPromise.current === sessionPromise) refreshPromise.current = null;
      }
    }
  }, [acceptSession]);

  const clearError = useCallback(() => setError(null), []);

  const updateProfile = useCallback(async (updates: ProfileUpdates): Promise<ApiUser> => {
    const response = await request<{ user: ApiUser }>('/me/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    setUser(response.user);
    return response.user;
  }, [request]);

  const uploadAvatar = useCallback(async (uri: string, mimeType = 'image/jpeg', fileName = 'avatar.jpg'): Promise<{ avatarUrl: string; user: ApiUser }> => {
    const formData = new FormData();
    if (Platform.OS === 'web') {
      const res = await fetch(uri);
      const blob = await res.blob();
      formData.append('avatar', blob, fileName);
    } else {
      formData.append('avatar', {
        uri,
        name: fileName,
        type: mimeType,
      } as unknown as Blob);
    }

    const response = await request<{ user: ApiUser; avatarUrl: string }>('/me/avatar', {
      method: 'POST',
      body: formData,
    });
    setUser(response.user);
    return response;
  }, [request]);

  const removeAvatar = useCallback(async (): Promise<ApiUser> => {
    const response = await request<{ user: ApiUser }>('/me/avatar', {
      method: 'DELETE',
    });
    setUser(response.user);
    return response.user;
  }, [request]);

  const value = useMemo(() => ({
    accessToken,
    user,
    isReady,
    error,
    clearError,
    signIn,
    register,
    signOut,
    request,
    setUser,
    updateProfile,
    uploadAvatar,
    removeAvatar,
  }), [accessToken, user, isReady, error, clearError, signIn, register, signOut, request, updateProfile, uploadAvatar, removeAvatar]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
