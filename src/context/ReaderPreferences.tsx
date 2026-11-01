import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from './AuthContext';
import type { ApiUser } from '../api/client';

export type AgeGroup = 'kids' | 'teens' | 'adults';

export type ReaderPreferences = {
  ageGroup: AgeGroup;
  focusAreas: string[];
  languages: string[];
};

const STORAGE_KEY = 'libery.reader-preferences.v1';

const defaultPreferences: ReaderPreferences = {
  ageGroup: 'adults',
  focusAreas: ['Fiction', 'Business'],
  languages: ['English', 'French'],
};

type PreferencesContextValue = {
  preferences: ReaderPreferences;
  isLoaded: boolean;
  updatePreferences: (updates: Partial<ReaderPreferences>) => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function ReaderPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user, request, setUser } = useAuth();
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((storedValue) => {
        if (!active || !storedValue) return;

        const parsed = JSON.parse(storedValue) as Partial<ReaderPreferences>;
        setPreferences({
          ageGroup: parsed.ageGroup === 'kids' || parsed.ageGroup === 'teens' ? parsed.ageGroup : 'adults',
          focusAreas: Array.isArray(parsed.focusAreas) ? parsed.focusAreas.filter((item): item is string => typeof item === 'string') : defaultPreferences.focusAreas,
          languages: Array.isArray(parsed.languages) ? parsed.languages.filter((item): item is string => typeof item === 'string') : defaultPreferences.languages,
        });
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const updatePreferences = useCallback(async (updates: Partial<ReaderPreferences>) => {
    const currentPreferences = user ? {
      ageGroup: user.ageGroup,
      focusAreas: user.focusAreas,
      languages: user.languages,
    } : preferences;
    const updatedPreferences = { ...currentPreferences, ...updates };

    if (user) {
      const result = await request<{ user: ApiUser }>('/me/preferences', {
        method: 'PUT',
        body: JSON.stringify(updatedPreferences),
      });
      setUser(result.user);
    }

    setPreferences(updatedPreferences);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPreferences));
    } catch {
      // Keep the current selection for this session if local storage is unavailable.
    }
  }, [preferences, request, setUser, user]);

  const effectivePreferences = useMemo(() => user ? {
    ageGroup: user.ageGroup,
    focusAreas: user.focusAreas,
    languages: user.languages,
  } : preferences, [preferences, user]);

  const value = useMemo(
    () => ({ preferences: effectivePreferences, isLoaded, updatePreferences }),
    [effectivePreferences, isLoaded, updatePreferences],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useReaderPreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('useReaderPreferences must be used within ReaderPreferencesProvider');
  return context;
}

export function isBookAllowedForAge(bookAge: string, ageGroup: AgeGroup) {
  if (ageGroup === 'kids') return bookAge === 'Kids';
  if (ageGroup === 'teens') return bookAge === 'Kids' || bookAge === 'Teen';
  return true;
}
