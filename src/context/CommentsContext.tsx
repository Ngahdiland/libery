import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { Book } from '../data/books';
import { useAuth } from './AuthContext';

export type BookComment = {
  id: string;
  bookId: string;
  authorName: string;
  text: string;
  createdAt: string;
  isCurrentUser?: boolean;
};

type CommentsContextValue = {
  getComments: (bookId: string) => BookComment[];
  getCommentCount: (bookId: string) => number;
  addComment: (bookId: string, text: string) => Promise<void>;
  activeCommentBook: Book | null;
  openComments: (book: Book) => void;
  closeComments: () => void;
};

const CommentsContext = createContext<CommentsContextValue | null>(null);

const STORAGE_KEY = '@libery_book_comments_v1';

const defaultSeedComments: Record<string, BookComment[]> = {
  default: [
    {
      id: 'seed-1',
      bookId: 'default',
      authorName: 'Clara M.',
      text: 'One of the most transformative reads on my shelf. The prose still echoes days after finishing.',
      createdAt: '2 days ago',
    },
    {
      id: 'seed-2',
      bookId: 'default',
      authorName: 'Alexandre B.',
      text: 'The themes of freedom and quiet courage feel strikingly contemporary. Highly recommended.',
      createdAt: '1 week ago',
    },
    {
      id: 'seed-3',
      bookId: 'default',
      authorName: 'Elena Rostova',
      text: 'A profound exploration of the human condition. Every chapter invites reflection.',
      createdAt: '2 weeks ago',
    },
  ],
};

export function CommentsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [commentsMap, setCommentsMap] = useState<Record<string, BookComment[]>>({});
  const [activeCommentBook, setActiveCommentBook] = useState<Book | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && active) {
          setCommentsMap(JSON.parse(stored) as Record<string, BookComment[]>);
        }
      } catch (e) {
        console.warn('Could not load stored comments', e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const getComments = useCallback((bookId: string): BookComment[] => {
    return commentsMap[bookId] ?? defaultSeedComments[bookId] ?? defaultSeedComments.default;
  }, [commentsMap]);

  const getCommentCount = useCallback((bookId: string): number => {
    const list = getComments(bookId);
    return list.length;
  }, [getComments]);

  const addComment = useCallback(async (bookId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const newComment: BookComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      bookId,
      authorName: user?.displayName ?? 'Reader',
      text: trimmed,
      createdAt: 'Just now',
      isCurrentUser: true,
    };

    setCommentsMap((current) => {
      const existing = current[bookId] ?? defaultSeedComments[bookId] ?? defaultSeedComments.default;
      const updated = {
        ...current,
        [bookId]: [newComment, ...existing],
      };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, [user?.displayName]);

  const openComments = useCallback((book: Book) => {
    setActiveCommentBook(book);
  }, []);

  const closeComments = useCallback(() => {
    setActiveCommentBook(null);
  }, []);

  const value = useMemo(() => ({
    getComments,
    getCommentCount,
    addComment,
    activeCommentBook,
    openComments,
    closeComments,
  }), [activeCommentBook, addComment, closeComments, getCommentCount, getComments, openComments]);

  return <CommentsContext.Provider value={value}>{children}</CommentsContext.Provider>;
}

export function useComments() {
  const context = useContext(CommentsContext);
  if (!context) {
    throw new Error('useComments must be used within CommentsProvider');
  }
  return context;
}
