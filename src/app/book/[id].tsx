import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useReaderPreferences, isBookAllowedForAge } from '../../context/ReaderPreferences';
import { BookCover } from '../../components/BookCover';
import { Attribution } from '../../components/Attribution';
import { ChapterList } from '../../components/ChapterList';
import { useCatalog } from '../../context/CatalogContext';
import { useReadingLibrary } from '../../context/ReadingLibraryContext';
import { useAuth } from '../../context/AuthContext';
import { useComments } from '../../context/CommentsContext';
import { toAppBook, type Book } from '../../data/books';
import { fetchReadingProgress, type ApiBook, type ApiReadingProgress } from '../../api/client';
import { palette, radii, spacing } from '../../theme';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { preferences } = useReaderPreferences();
  const { books } = useCatalog();
  const { accessToken, isReady, request } = useAuth();
  const { getItem, isLoaded: isLibraryLoaded, saveItem, removeItem } = useReadingLibrary();
  const { openComments, getCommentCount } = useComments();

  const [fetchedBook, setFetchedBook] = useState<Book | null>(null);
  const [fetchFailure, setFetchFailure] = useState<{ id: string; error: string } | null>(null);
  const [fetchAttempt, setFetchAttempt] = useState(0);

  const [savedProgress, setSavedProgress] = useState<ApiReadingProgress | null>(null);
  const [showChapterModal, setShowChapterModal] = useState(false);

  const book = books.find((item) => item.id === id)
    ?? (fetchedBook?.id === id ? fetchedBook : undefined);
  const fetchError = fetchFailure?.id === id ? fetchFailure.error : null;
  const isFetchingBook = Boolean(!book && isReady && accessToken && !fetchError);
  const libraryItem = book ? getItem(book.id) : undefined;
  const [actionError, setActionError] = useState<string | null>(null);
  const canRead = book ? isBookAllowedForAge(book.ageRating, preferences.ageGroup) : false;

  const commentCount = book ? getCommentCount(book.id) : 0;

  // Fetch book details from backend if not in memory
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

  // Fetch saved reading progress for this book
  useEffect(() => {
    if (!id || !accessToken) return;
    let active = true;
    fetchReadingProgress(id, accessToken)
      .then((prog) => {
        if (active) setSavedProgress(prog);
      })
      .catch(() => {
        // Silently ignore progress fetch failure (e.g. offline or guest)
      });
    return () => {
      active = false;
    };
  }, [id, accessToken]);

  if (!book) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
        <View style={styles.restrictedState}>
          <Text style={styles.title}>
            {isFetchingBook || !isReady ? 'Loading book…' : fetchError ? 'Could not load book' : 'Book not found'}
          </Text>
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

  const hasInAppChapters = book.availability === 'in_app_text' || (book.totalChapters !== undefined && book.totalChapters > 0);
  const currentChapter = savedProgress?.chapterNumber ?? 1;

  const startReading = () => {
    router.push({
      pathname: '/read/[id]',
      params: { id: book.id, chapter: String(currentChapter) },
    });
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Link href="/" style={styles.backLink}>← Back to catalog</Link>

        <BookCover book={book} large />

        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.meta}>{book.author} · {book.provider}</Text>

        {/* Primary Action Buttons */}
        <View style={styles.primaryActions}>
          {hasInAppChapters ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={savedProgress ? `Continue reading chapter ${currentChapter}` : 'Start reading'}
              onPress={startReading}
              style={styles.readButton}
            >
              <Ionicons name="book-outline" size={18} color="#FFFFFF" />
              <Text style={styles.readButtonText}>
                {savedProgress && savedProgress.chapterNumber > 1
                  ? `Continue Reading (Ch. ${savedProgress.chapterNumber})`
                  : 'Start Reading'}
              </Text>
            </Pressable>
          ) : book.availability === 'metadata_only' && book.sourceUrl ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL(book.sourceUrl!)}
              style={styles.readButton}
            >
              <Ionicons name="open-outline" size={18} color="#FFFFFF" />
              <Text style={styles.readButtonText}>Read at source</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={startReading} style={styles.readButton}>
              <Ionicons name="book-outline" size={18} color="#FFFFFF" />
              <Text style={styles.readButtonText}>Read in app</Text>
            </Pressable>
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
            <Ionicons
              name={libraryItem ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={palette.primaryDark}
            />
            <Text style={styles.saveButtonText}>
              {libraryItem ? 'In Library' : 'Want to read'}
            </Text>
          </Pressable>
        </View>

        {/* Secondary Action Row: Favorites & Chapters */}
        <View style={styles.secondaryActionsRow}>
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
            style={[styles.secondaryButton, libraryItem?.isFavorite && styles.secondaryButtonActive]}
          >
            <Ionicons
              name={libraryItem?.isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={libraryItem?.isFavorite ? '#E0245E' : palette.primary}
            />
            <Text style={[styles.secondaryButtonText, libraryItem?.isFavorite && styles.secondaryButtonTextActive]}>
              {libraryItem?.isFavorite ? 'Favorited' : 'Favorite'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View chapters table of contents"
            onPress={() => setShowChapterModal(true)}
            style={styles.secondaryButton}
          >
            <Ionicons name="list-outline" size={18} color={palette.primary} />
            <Text style={styles.secondaryButtonText}>
              {book.totalChapters ? `${book.totalChapters} Chapters` : 'Chapters'}
            </Text>
          </Pressable>
        </View>

        {actionError && <Text accessibilityRole="alert" style={styles.actionError}>{actionError}</Text>}

        {/* Badges / Category pills */}
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
          {Boolean(book.license) && (
            <View style={styles.pill}>
              <Text style={styles.pillText}>{book.license}</Text>
            </View>
          )}
        </View>

        {/* Synopsis / Description */}
        <View style={styles.summaryBox}>
          <Text style={styles.sectionHeader}>Synopsis</Text>
          <Text style={styles.summary}>{book.description}</Text>
        </View>

        {/* Legal Attribution Component */}
        <Attribution book={book} />

        {/* Reviews, Comments & Community Discussion */}
        <View style={styles.reviewsBox}>
          <View style={styles.reviewsHeaderRow}>
            <View>
              <Text style={styles.sectionHeader}>Reviews & Discussion</Text>
              <View style={styles.ratingBadgeRow}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.ratingScore}>{book.reviews > 0 ? book.rating.toFixed(1) : '5.0'}</Text>
                <Text style={styles.ratingReviewsCount}>
                  ({Math.max(book.reviews, commentCount)} community notes)
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open book comments and reviews sheet"
              onPress={() => openComments(book)}
              style={styles.openCommentsButton}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
              <Text style={styles.openCommentsButtonText}>Reviews ({commentCount})</Text>
            </Pressable>
          </View>
        </View>

        {/* Book Metadata details */}
        {book.pages > 0 && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estimated Pages</Text>
            <Text style={styles.infoValue}>{book.pages}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Provider / Source</Text>
          <Text style={styles.infoValue}>{book.sourceName || book.provider}</Text>
        </View>
      </ScrollView>

      {/* Chapter Table of Contents Modal */}
      <Modal
        visible={showChapterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowChapterModal(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <ChapterList
            bookId={book.id}
            currentChapter={currentChapter}
            onClose={() => setShowChapterModal(false)}
            onSelectChapter={(chapNum) => {
              setShowChapterModal(false);
              router.push({
                pathname: '/read/[id]',
                params: { id: book.id, chapter: String(chapNum) },
              });
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.surfaceLight,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    marginTop: spacing.sm,
  },
  meta: {
    fontSize: 14,
    color: palette.muted,
    marginTop: 6,
  },
  primaryActions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    gap: 10,
  },
  readButton: {
    minHeight: 48,
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: palette.primary,
    gap: 8,
    paddingHorizontal: 12,
  },
  readButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  saveButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.primary,
    backgroundColor: '#fff',
    gap: 6,
  },
  savedButton: {
    backgroundColor: '#EAF3EE',
  },
  saveButtonText: {
    color: palette.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE5',
    gap: 6,
  },
  secondaryButtonActive: {
    backgroundColor: '#FDF2F4',
    borderColor: '#F8B4C4',
  },
  secondaryButtonText: {
    color: palette.textLight,
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryButtonTextActive: {
    color: '#E0245E',
  },
  actionError: {
    color: '#A9342B',
    marginVertical: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: '#EAF3EE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    color: palette.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryBox: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  summary: {
    color: palette.textLight,
    fontSize: 15,
    lineHeight: 22,
  },
  reviewsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#EBF2EE',
  },
  reviewsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  ratingScore: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.textLight,
  },
  ratingReviewsCount: {
    fontSize: 13,
    color: palette.muted,
  },
  openCommentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    gap: 6,
  },
  openCommentsButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EFEA',
  },
  infoLabel: {
    color: palette.muted,
    fontWeight: '600',
    fontSize: 14,
  },
  infoValue: {
    color: palette.textLight,
    fontWeight: '700',
    fontSize: 14,
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
});
