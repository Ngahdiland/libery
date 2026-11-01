import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReaderPreferences, isBookAllowedForAge } from '../../context/ReaderPreferences';
import { useReadingLibrary } from '../../context/ReadingLibraryContext';
import { useCatalog } from '../../context/CatalogContext';
import { useAuth } from '../../context/AuthContext';
import { toAppBook, type Book } from '../../data/books';
import type { ApiBook } from '../../api/client';
import { palette, radii, spacing } from '../../theme';

const samplePassages = [
  'Every story begins somewhere unexpected. A door left open, a familiar street seen in a new light, or a question that has waited patiently for an answer.',
  'By morning, the garden had changed. Rain shone on every leaf, and the path ahead seemed less like a map and more like an invitation.',
  'We learn the shape of home from the people who make room for us. Sometimes that room is a whole house; sometimes it is only a chair beside the window.',
  'The quiet work of beginning again rarely looks dramatic. It is a small promise kept, a page turned, a kind word offered when it would be easier to stay silent.',
  'And so the next chapter opened—not because everything was certain, but because there was enough hope to take one more step.',
];

export default function SampleReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { preferences } = useReaderPreferences();
  const { books } = useCatalog();
  const { accessToken, isReady, request } = useAuth();
  const { getItem, isLoaded: isLibraryLoaded, saveItem } = useReadingLibrary();
  const [fetchedBook, setFetchedBook] = useState<Book | null>(null);
  const [fetchFailure, setFetchFailure] = useState<{ id: string; error: string } | null>(null);
  const [fetchAttempt, setFetchAttempt] = useState(0);
  const book = books.find((item) => item.id === id)
    ?? (fetchedBook?.id === id ? fetchedBook : undefined);
  const fetchError = fetchFailure?.id === id ? fetchFailure.error : null;
  const isFetchingBook = Boolean(!book && isReady && accessToken && !fetchError);
  const libraryItem = book ? getItem(book.id) : undefined;
  const [selectedPage, setSelectedPage] = useState<{ id: string; page: number } | null>(null);
  const storedPage = Math.max(1, Math.ceil((libraryItem?.progress ?? 0) / 20));
  const page = selectedPage?.id === id ? selectedPage.page : isLibraryLoaded ? storedPage : 1;
  const [fontSize, setFontSize] = useState(20);
  const [libraryError, setLibraryError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isLibraryLoaded || !book || book.availability === 'metadata_only'
      || !isBookAllowedForAge(book.ageRating, preferences.ageGroup)) return;
    const isFinished = libraryItem?.status === 'finished';
    void saveItem(book, {
      status: isFinished ? 'finished' : 'reading',
      progress: isFinished ? 100 : Math.round((page / samplePassages.length) * 100),
    })
      .then(() => setLibraryError(null))
      .catch((error: unknown) => setLibraryError(error instanceof Error ? error.message : 'Could not save reading progress.'));
  }, [book, isLibraryLoaded, libraryItem?.status, page, preferences.ageGroup, saveItem]);

  if (!book) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
        <View style={styles.restrictedState}>
          <Text style={styles.readerTitle}>
            {isFetchingBook || !isReady ? 'Loading book…' : fetchError ? 'Could not load book' : 'Book not found'}
          </Text>
          {fetchError && <Text accessibilityRole="alert" style={styles.sourceDescription}>{fetchError}</Text>}
          {!isFetchingBook && !accessToken && isReady && (
            <Link href="/sign-in" style={styles.backLink}>Sign in to load this book</Link>
          )}
          {fetchError && accessToken && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setFetchFailure(null);
                setFetchAttempt((attempt) => attempt + 1);
              }}
              style={styles.pageButton}
            >
              <Text style={styles.pageButtonText}>Try again</Text>
            </Pressable>
          )}
          <Link href="/" style={styles.backLink}>Return to the library</Link>
        </View>
      </SafeAreaView>
    );
  }

  if (!isBookAllowedForAge(book.ageRating, preferences.ageGroup)) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
        <View style={styles.restrictedState}>
          <Text style={styles.readerTitle}>This sample isn’t available for your age group.</Text>
          <Link href="/" style={styles.backLink}>Return to the library</Link>
        </View>
      </SafeAreaView>
    );
  }

  if (book.availability === 'metadata_only' && book.sourceUrl) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
        <View style={styles.restrictedState}>
          <Text style={styles.readerTitle}>This title is available from its source</Text>
          <Text style={styles.sourceDescription}>
            We have catalog information only. Worldwide reading and narration rights have not been verified, so Libery
            does not copy or serve the book text.
          </Text>
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(book.sourceUrl!)} style={styles.pageButton}>
            <Text style={styles.pageButtonText}>Open {book.provider}</Text>
          </Pressable>
          <Link href={`/book/${book.id}`} style={styles.backLink}>Back to book details</Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <View style={styles.header}>
        <Link href={`/book/${book.id}`} style={styles.backLink}>Book details</Link>
        <Text style={styles.headerTitle} numberOfLines={1}>{book.title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={libraryItem?.isFavorite ? 'Remove bookmark' : 'Add bookmark'}
          accessibilityState={{ selected: Boolean(libraryItem?.isFavorite) }}
          onPress={() => {
            setLibraryError(null);
            const isFinished = libraryItem?.status === 'finished';
            void saveItem(book, {
              status: isFinished ? 'finished' : 'reading',
              progress: isFinished ? 100 : libraryItem?.progress ?? Math.round((page / samplePassages.length) * 100),
              isFavorite: !libraryItem?.isFavorite,
            })
              .catch((error: unknown) => setLibraryError(error instanceof Error ? error.message : 'Could not update bookmark.'));
          }}
          style={styles.bookmarkButton}
        >
          <Text style={styles.bookmarkIcon}>{libraryItem?.isFavorite ? '★' : '☆'}</Text>
        </Pressable>
      </View>

      {libraryError && <Text accessibilityRole="alert" style={styles.libraryError}>{libraryError}</Text>}
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.pageLabel}>SAMPLE · PAGE {page} OF {samplePassages.length}</Text>
        <Text style={[styles.passage, { fontSize }]}>{samplePassages[page - 1]}</Text>
        <Text style={[styles.passage, { fontSize }]}>
          Take your time with these pages. Your place in this sample is kept while you explore the preview.
        </Text>
      </ScrollView>

      <View style={styles.controls}>
        <View style={styles.textControls}>
          <Text style={styles.controlLabel}>Text size</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Decrease text size"
            disabled={fontSize <= 16}
            onPress={() => setFontSize((size) => Math.max(16, size - 2))}
            style={styles.fontButton}
          >
            <Text style={styles.fontButtonText}>A−</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Increase text size"
            disabled={fontSize >= 28}
            onPress={() => setFontSize((size) => Math.min(28, size + 2))}
            style={styles.fontButton}
          >
            <Text style={styles.fontButtonText}>A+</Text>
          </Pressable>
        </View>
        <View style={styles.navigationRow}>
          <Pressable
            accessibilityRole="button"
            disabled={page === 1}
            onPress={() => setSelectedPage({ id, page: Math.max(1, page - 1) })}
            style={[styles.pageButton, page === 1 && styles.disabledButton]}
          >
            <Text style={styles.pageButtonText}>Previous</Text>
          </Pressable>
          <Text style={styles.pageCounter}>{page} / {samplePassages.length}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSelectedPage({ id, page: Math.min(samplePassages.length, page + 1) })}
            style={styles.pageButton}
          >
            <Text style={styles.pageButtonText}>{page === samplePassages.length ? 'Finish' : 'Next'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FBF8F1',
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E3D8',
  },
  restrictedState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  readerTitle: {
    color: palette.textLight,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  sourceDescription: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  libraryError: {
    color: '#A9342B',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  backLink: {
    color: palette.primary,
    fontWeight: '700',
    marginRight: spacing.md,
  },
  headerTitle: {
    flex: 1,
    color: palette.textLight,
    fontSize: 15,
    fontWeight: '700',
  },
  bookmarkButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkIcon: {
    color: palette.primary,
    fontSize: 26,
  },
  page: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 36,
  },
  pageLabel: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.xl,
  },
  passage: {
    color: '#2A332D',
    lineHeight: 34,
    marginBottom: spacing.lg,
  },
  controls: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E8E3D8',
  },
  textControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: spacing.xs,
  },
  controlLabel: {
    color: palette.muted,
    fontSize: 12,
    marginRight: 12,
  },
  fontButton: {
    minWidth: 48,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: '#EAF3EE',
    marginLeft: 8,
  },
  fontButtonText: {
    color: palette.primaryDark,
    fontWeight: '700',
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageButton: {
    minWidth: 96,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
    borderRadius: radii.md,
  },
  disabledButton: {
    opacity: 0.45,
  },
  pageButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  pageCounter: {
    color: palette.muted,
    fontWeight: '600',
  },
});
