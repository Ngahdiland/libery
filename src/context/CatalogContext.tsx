import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { ApiBook } from '../api/client';
import { books as sampleBooks, toAppBook, type Book } from '../data/books';
import { useAuth } from './AuthContext';

type CatalogResponse = {
  items: ApiBook[];
  total: number;
  nextCursor: string | null;
};

type CatalogContextValue = {
  books: Book[];
  total: number;
  isCloudCatalog: boolean;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  search: (query: string, category?: string) => Promise<void>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);
const PAGE_SIZE = 50;

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, isReady, request, user } = useAuth();
  const [cloudBooks, setCloudBooks] = useState<Book[]>([]);
  const [activeSearch, setActiveSearch] = useState({ query: '', category: '' });
  const [loadedToken, setLoadedToken] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorToken, setErrorToken] = useState<string | null>(null);
  const requestId = useRef(0);
  const activeToken = useRef(accessToken);
  const activeSearchRef = useRef(activeSearch);

  const fetchPage = useCallback(async (
    cursor?: string,
    search = { query: '', category: '' },
  ) => {
    if (!accessToken) return;
    const token = accessToken;
    const currentRequestId = ++requestId.current;
    setIsLoading(true);
    setError(null);
    setErrorToken(token);
    try {
      const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (cursor) query.set('cursor', cursor);
      if (search.query) query.set('q', search.query);
      if (search.category) query.set('category', search.category);
      const result = await request<CatalogResponse>(`/books?${query.toString()}`, {});
      if (currentRequestId !== requestId.current || token !== activeToken.current) return;
      const mapped = result.items.map(toAppBook);
      setCloudBooks((current) => cursor ? [...current, ...mapped] : mapped);
      setNextCursor(result.nextCursor);
      setTotal(result.total);
      setLoadedToken(token);
      setError(null);
    } catch (requestError) {
      if (currentRequestId !== requestId.current || token !== activeToken.current) return;
      setErrorToken(token);
      setError(requestError instanceof Error ? requestError.message : 'Could not load the cloud catalog.');
    } finally {
      if (currentRequestId === requestId.current) setIsLoading(false);
    }
  }, [accessToken, request]);

  useEffect(() => {
    activeToken.current = accessToken;
    requestId.current += 1;
    if (!isReady) return;
    if (!accessToken) return;
    void Promise.resolve().then(() => fetchPage(undefined, activeSearchRef.current));
  }, [accessToken, fetchPage, isReady, user?.ageGroup, user?.languages]);

  const loadMore = useCallback(async () => {
    if (nextCursor && !isLoading) {
      await fetchPage(nextCursor, activeSearch);
    }
  }, [activeSearch, fetchPage, isLoading, nextCursor]);

  const search = useCallback(async (query: string, category = '') => {
    const filters = { query: query.trim(), category: category === 'All' ? '' : category };
    activeSearchRef.current = filters;
    setActiveSearch(filters);
    await fetchPage(undefined, filters);
  }, [fetchPage]);

  const refresh = useCallback(async () => {
    await fetchPage(undefined, activeSearch);
  }, [activeSearch, fetchPage]);

  const activeError = accessToken === errorToken ? error : null;
  const hasLoadedCurrentCatalog = Boolean(accessToken && accessToken === loadedToken);
  const isInitialLoading = Boolean(accessToken && isReady && !hasLoadedCurrentCatalog && !activeError);
  const value = useMemo(() => ({
    books: hasLoadedCurrentCatalog && !activeError ? cloudBooks : sampleBooks,
    total: hasLoadedCurrentCatalog && !activeError ? total : sampleBooks.length,
    isCloudCatalog: hasLoadedCurrentCatalog && !activeError,
    isLoading: isLoading || isInitialLoading,
    error: activeError,
    hasMore: Boolean(hasLoadedCurrentCatalog && !activeError && nextCursor && cloudBooks.length < total),
    loadMore,
    refresh,
    search,
  }), [activeError, cloudBooks, hasLoadedCurrentCatalog, isInitialLoading, isLoading, loadMore, nextCursor, refresh, search, total]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog must be used within CatalogProvider');
  return context;
}
