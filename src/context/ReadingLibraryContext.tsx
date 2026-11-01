import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { ApiBook } from '../api/client';
import { toAppBook, type Book } from '../data/books';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'libery.reading-library.v1';
const statuses = ['reading', 'want_to_read', 'finished'] as const;

export type LibraryStatus = typeof statuses[number];

export type LibraryItem = {
  book: Book;
  status: LibraryStatus;
  progress: number;
  isFavorite: boolean;
  updatedAt: string;
};

type ApiLibraryItem = {
  book: ApiBook;
  status: LibraryStatus;
  progress: number;
  isFavorite: boolean;
  updatedAt: string;
};

type ReadingLibraryContextValue = {
  items: LibraryItem[];
  isLoaded: boolean;
  error: string | null;
  getItem: (bookId: string) => LibraryItem | undefined;
  saveItem: (book: Book, updates: Partial<Pick<LibraryItem, 'status' | 'progress' | 'isFavorite'>>) => Promise<void>;
  removeItem: (bookId: string) => Promise<void>;
};

const ReadingLibraryContext = createContext<ReadingLibraryContextValue | null>(null);

function isLibraryStatus(value: unknown): value is LibraryStatus {
  return typeof value === 'string' && statuses.includes(value as LibraryStatus);
}

function isBook(value: unknown): value is Book {
  if (typeof value !== 'object' || value === null) return false;
  const book = value as Partial<Book>;
  return typeof book.id === 'string'
    && typeof book.title === 'string'
    && typeof book.author === 'string'
    && typeof book.category === 'string'
    && Array.isArray(book.coverColors)
    && book.coverColors.length === 2;
}

function isLibraryItem(value: unknown): value is LibraryItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Partial<LibraryItem>;
  return isBook(item.book)
    && isLibraryStatus(item.status)
    && typeof item.progress === 'number'
    && Number.isInteger(item.progress)
    && item.progress >= 0
    && item.progress <= 100
    && typeof item.isFavorite === 'boolean'
    && typeof item.updatedAt === 'string';
}

function mapApiItem(item: ApiLibraryItem): LibraryItem {
  return {
    book: toAppBook(item.book),
    status: item.status,
    progress: item.progress,
    isFavorite: item.isFavorite,
    updatedAt: item.updatedAt,
  };
}

export function ReadingLibraryProvider({ children }: { children: React.ReactNode }) {
  const { user, isReady, request } = useAuth();
  const [cloudItems, setCloudItems] = useState<LibraryItem[]>([]);
  const [localItems, setLocalItems] = useState<LibraryItem[]>([]);
  const [loadedIdentity, setLoadedIdentity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const itemsRef = useRef<LibraryItem[]>([]);
  const identity = user?.id ?? 'guest';

  useEffect(() => {
    itemsRef.current = user ? cloudItems : localItems;
  }, [cloudItems, localItems, user]);

  useEffect(() => {
    if (!isReady) return;
    let active = true;
    void (async () => {
      try {
        if (user) {
          const result = await request<{ items: ApiLibraryItem[] }>('/me/library');
          if (active) {
            const entries = result.items.map(mapApiItem);
            itemsRef.current = entries;
            setCloudItems(entries);
            setError(null);
          }
        } else {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          const parsed: unknown = stored ? JSON.parse(stored) : [];
          const entries = Array.isArray(parsed) ? parsed.filter(isLibraryItem) : [];
          if (active) {
            itemsRef.current = entries;
            setLocalItems(entries);
            setError(null);
          }
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load your library.');
      } finally {
        if (active) setLoadedIdentity(identity);
      }
    })();
    return () => {
      active = false;
    };
  }, [identity, isReady, request, user]);

  const saveItem = useCallback(async (
    book: Book,
    updates: Partial<Pick<LibraryItem, 'status' | 'progress' | 'isFavorite'>>,
  ) => {
    const current = itemsRef.current.find((item) => item.book.id === book.id);
    const next: LibraryItem = {
      book,
      status: updates.status ?? current?.status ?? 'want_to_read',
      progress: updates.progress ?? current?.progress ?? 0,
      isFavorite: updates.isFavorite ?? current?.isFavorite ?? false,
      updatedAt: new Date().toISOString(),
    };

    if (user) {
      const result = await request<{ item: ApiLibraryItem }>(`/me/library/${encodeURIComponent(book.id)}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: next.status,
          progress: next.progress,
          isFavorite: next.isFavorite,
        }),
      });
      const saved = mapApiItem(result.item);
      itemsRef.current = [saved, ...itemsRef.current.filter((item) => item.book.id !== book.id)];
      setCloudItems(itemsRef.current);
      setError(null);
      return;
    }

    const nextItems = [next, ...itemsRef.current.filter((item) => item.book.id !== book.id)];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
    itemsRef.current = nextItems;
    setLocalItems(nextItems);
  }, [request, user]);

  const removeItem = useCallback(async (bookId: string) => {
    if (user) {
      await request<void>(`/me/library/${encodeURIComponent(bookId)}`, { method: 'DELETE' });
      itemsRef.current = itemsRef.current.filter((item) => item.book.id !== bookId);
      setCloudItems(itemsRef.current);
      setError(null);
      return;
    }

    const nextItems = itemsRef.current.filter((item) => item.book.id !== bookId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
    itemsRef.current = nextItems;
    setLocalItems(nextItems);
  }, [request, user]);

  const items = user ? cloudItems : localItems;
  const isLoaded = loadedIdentity === identity;
  const getItem = useCallback((bookId: string) => items.find((item) => item.book.id === bookId), [items]);
  const value = useMemo(() => ({
    items,
    isLoaded,
    error,
    getItem,
    saveItem,
    removeItem,
  }), [items, isLoaded, error, getItem, saveItem, removeItem]);

  return <ReadingLibraryContext.Provider value={value}>{children}</ReadingLibraryContext.Provider>;
}

export function useReadingLibrary() {
  const context = useContext(ReadingLibraryContext);
  if (!context) throw new Error('useReadingLibrary must be used within ReadingLibraryProvider');
  return context;
}
