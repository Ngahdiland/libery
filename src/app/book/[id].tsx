import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReaderPreferences, isBookAllowedForAge } from '../../context/ReaderPreferences';
import { BookCover } from '../../components/BookCover';
import { useCatalog } from '../../context/CatalogContext';
import { useReadingLibrary } from '../../context/ReadingLibraryContext';
import { useAuth } from '../../context/AuthContext';
import { toAppBook, type Book } from '../../data/books';
import type { ApiBook } from '../../api/client';
import { palette, radii, spacing } from '../../theme';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { preferences } = useReaderPreferences();
  const { books } = useCatalog();
  const { accessToken, isReady, request } = useAuth();
  const { getItem, isLoaded: isLibraryLoaded, saveItem, removeItem } = useReadingLibrary();
  const [fetchedBook, setFetchedBook] = useState<Book | null>(null);
  const [fetchFailure, setFetchFailure] = useState<{ id: string; error: string } | null>(null);
  const [fetchAttempt, setFetchAttempt] = useState(0);
  const book = books.find((item) => item.id === id)
    ?? (fetchedBook?.id === id ? fetchedBook : undefined);
  const fetchError = fetchFailure?.id === id ? fetchFailure.error : null;
  const isFetchingBook = Boolean(!book && isReady && accessToken && !fetchError);
  const libraryItem = book ? getItem(book.id) : undefined;
  const [actionError, setActionError] = useState<string | null>(null);
  const canRead = book ? isBookAllowedForAge(book.ageRating, preferences.ageGroup) : false;

  useEffect(() => {
    if (!id || book || !isReady || !accessToken) return;
    let active = true;
    void request<{ book: ApiBook }>(`/books/${encodeURIComponent(id)}`)
      .then(({ book: result }) => {
        if (active) setFetchedBook(toAppBook(result));
      })
      .catch((error: unknown) => {
        if (active) {
          setFetchFailure({
            id,
            error: error instanceof Error ? error.message : 'Could not load this book.',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [accessToken, book, fetchAttempt, id, isReady, request]);

  if (!book) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
        <View style={styles.restrictedState}>
          <Text style={styles.title}>{isFetchingBook || !isReady ? 'Loading book…' : fetchError ? 'Could not load book' : 'Book not found'}</Text>
          {fetchError && <Text accessibilityRole="alert" style={styles.meta}>{fetchError}</Text>}
          {!isFetchingBook && !accessToken && isReady && (
            <>
              <Text style={styles.meta}>Sign in to load this book from the catalog.</Text>
              <Link href="/sign-in" style={styles.backLink}>Sign in to Libery</Link>
            </>
          )}
          {fetchError && accessToken && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setFetchFailure(null);
                setFetchAttempt((attempt) => attempt + 1);
              }}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          )}
          <Link href="/" style={styles.backLink}>Return to home</Link>
        </View>
      </SafeAreaView>
    );
  }

  if (!canRead) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
        <View style={styles.restrictedState}>
          <Text style={styles.title}>This book isn’t available for your age group</Text>
          <Text style={styles.meta}>Your age preference keeps this title out of your library.</Text>
          <Link href="/" style={styles.backLink}>Return to the library</Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Link href="/" style={styles.backLink}>Back to home</Link>

        <BookCover book={book} large />

        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.meta}>{book.author} · {book.provider}</Text>

        <View style={styles.primaryActions}>
          {book.availability === 'metadata_only' && book.sourceUrl ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL(book.sourceUrl!)}
              style={styles.readButton}
            >
              <Text style={styles.readButtonText}>Read at source</Text>
            </Pressable>
          ) : (
            <Link href={`/read/${book.id}`} asChild>
              <Pressable accessibilityRole="button" style={styles.readButton}>
                <Text style={styles.readButtonText}>Read sample</Text>
              </Pressable>
            </Link>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={!isLibraryLoaded}
            accessibilityState={{ selected: Boolean(libraryItem) }}
            onPress={() => {
              if (!book) return;
              setActionError(null);
              void (libraryItem
                ? removeItem(book.id)
                : saveItem(book, { status: 'want_to_read' }))
                .catch((error: unknown) => setActionError(error instanceof Error ? error.message : 'Could not update your library.'));
            }}
            style={[styles.saveButton, libraryItem && styles.savedButton]}
          >
            <Text style={styles.saveButtonText}>
              {libraryItem ? 'Remove from library' : 'Want to read'}
            </Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={!isLibraryLoaded}
          accessibilityLabel={libraryItem?.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          accessibilityState={{ selected: Boolean(libraryItem?.isFavorite) }}
          onPress={() => {
            if (!book) return;
            setActionError(null);
            void saveItem(book, { isFavorite: !libraryItem?.isFavorite })
              .catch((error: unknown) => setActionError(error instanceof Error ? error.message : 'Could not update favorites.'));
          }}
          style={styles.favoriteButton}
        >
          <Text style={styles.favoriteText}>{libraryItem?.isFavorite ? '★ In favorites' : '☆ Add to favorites'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!isLibraryLoaded || libraryItem?.status === 'finished'}
          accessibilityState={{ selected: libraryItem?.status === 'finished', disabled: !isLibraryLoaded || libraryItem?.status === 'finished' }}
          onPress={() => {
            setActionError(null);
            void saveItem(book, { status: 'finished', progress: 100 })
              .catch((error: unknown) => setActionError(error instanceof Error ? error.message : 'Could not update your reading status.'));
          }}
          style={[styles.finishedButton, libraryItem?.status === 'finished' && styles.finishedButtonDone]}
        >
          <Text style={styles.finishedButtonText}>
            {libraryItem?.status === 'finished' ? 'Finished' : 'Mark as finished'}
          </Text>
        </Pressable>
        {actionError && <Text accessibilityRole="alert" style={styles.actionError}>{actionError}</Text>}

        <View style={styles.actionsRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{book.category}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{book.language}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{book.ageRating}</Text>
          </View>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summary}>{book.description}</Text>
        </View>

        {book.pages > 0 && <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Pages</Text>
          <Text style={styles.infoValue}>{book.pages}</Text>
        </View>}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Rating</Text>
          <Text style={styles.infoValue}>{book.reviews > 0 ? `${book.rating.toFixed(1)} / 5` : 'Not rated yet'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Reviews</Text>
          <Text style={styles.infoValue}>{book.reviews}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.surfaceLight,
  },
  container: {
    flex: 1,
    backgroundColor: palette.surfaceLight,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 40,
  },
  restrictedState: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  backLink: {
    color: palette.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  title: {
    color: palette.textLight,
    fontSize: 28,
    fontWeight: '800',
  },
  meta: {
    fontSize: 14,
    color: palette.muted,
    marginTop: 6,
  },
  primaryActions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  readButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: palette.primary,
    marginRight: 10,
  },
  readButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  saveButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.primary,
    backgroundColor: '#fff',
  },
  savedButton: {
    backgroundColor: '#EAF3EE',
  },
  saveButtonText: {
    color: palette.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
  favoriteButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  favoriteText: {
    color: palette.primary,
    fontWeight: '700',
  },
  finishedButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.primary,
    backgroundColor: '#fff',
    marginBottom: spacing.md,
  },
  finishedButtonDone: {
    borderColor: '#B9D8C4',
    backgroundColor: '#EAF3EE',
  },
  finishedButtonText: {
    color: palette.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
  retryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: palette.primary,
    marginTop: spacing.md,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  actionError: {
    color: '#A9342B',
    marginBottom: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  pill: {
    backgroundColor: '#EAF3EE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  pillText: {
    color: palette.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },
  summaryBox: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  summary: {
    color: palette.textLight,
    fontSize: 15,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EFEA',
    marginBottom: 12,
  },
  infoLabel: {
    color: palette.muted,
    fontWeight: '600',
  },
  infoValue: {
    color: palette.textLight,
    fontWeight: '700',
  },
});
