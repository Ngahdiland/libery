import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createCommunityPost, fetchCommunityPosts, type ApiCommunityPost } from '../../api/client';
import { BookCard } from '../../components/BookCard';
import { toAppBook, type Book } from '../../data/books';
import { ThreadPostCard, type ThreadPostData } from '../../components/ThreadPostCard';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { isBookAllowedForAge, useReaderPreferences } from '../../context/ReaderPreferences';
import { useReadingLibrary } from '../../context/ReadingLibraryContext';
import { type QuoteMood } from '../../data/quotes';
import { palette, radii, spacing } from '../../theme';
import { generatePersonalizedPostFeed } from '../../utils/postingAlgorithm';
import { computeRecommendations } from '../../utils/recommendations';

const moodFilters: ('All' | QuoteMood)[] = [
  'All',
  'Fun',
  'Educational',
  'Philosophical',
  'Inspirational',
  'Adventurous',
  'Poetic',
];

const catalogCategories = [
  'All',
  'Fiction',
  'Philosophy',
  'History',
  'Science & Technology',
  'Poetry',
  'Biography',
  'Literature',
];

function getGreetingTime(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate(): string {
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  return new Date().toLocaleDateString(undefined, options);
}

function formatTimeAgo(dateStr: string | Date): string {
  const d = new Date(dateStr);
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - d.getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  return `${Math.floor(diffSec / 86400)}d`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { preferences } = useReaderPreferences();
  const { books } = useCatalog();
  const { user, accessToken } = useAuth();
  const { items: libraryItems } = useReadingLibrary();

  const [selectedMood, setSelectedMood] = useState<'All' | QuoteMood>('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [userPosts, setUserPosts] = useState<ThreadPostData[]>([]);
  const [dbPosts, setDbPosts] = useState<ApiCommunityPost[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSeed, setRefreshSeed] = useState(() => Math.floor(Date.now() / 1000) % 100000);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [composerBookId, setComposerBookId] = useState<string>('');

  const loadCommunityPosts = useCallback(async () => {
    try {
      const posts = await fetchCommunityPosts(30, accessToken ?? undefined);
      setDbPosts(posts);
    } catch {
      // Graceful fallback if offline or backend is unreachable
    }
  }, [accessToken]);

  useEffect(() => {
    void Promise.resolve().then(() => loadCommunityPosts());
  }, [loadCommunityPosts]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshSeed((prev) => prev + 1);
    await loadCommunityPosts();
    setIsRefreshing(false);
  };

  // Filter books allowed by reader age and language
  const availableBooks = useMemo(() => {
    return books.filter(
      (book) =>
        isBookAllowedForAge(book.ageRating, preferences.ageGroup)
        && preferences.languages.includes(book.language),
    );
  }, [books, preferences.ageGroup, preferences.languages]);

  // Run personalized recommendation algorithm based on user likes, reading shelf, and focus areas
  const recommendations = useMemo(() => {
    return computeRecommendations({
      allBooks: availableBooks,
      libraryItems,
      focusAreas: user?.focusAreas ?? preferences.focusAreas,
      selectedMood,
      refreshSeed,
      userId: user?.id,
    });
  }, [availableBooks, libraryItems, preferences.focusAreas, refreshSeed, selectedMood, user?.focusAreas, user?.id]);

  // Identify active book in progress from user's reading shelf
  const activeReadingItem = useMemo(() => {
    return libraryItems.find(
      (item) => item.status === 'reading' && item.progress > 0 && item.progress < 100,
    );
  }, [libraryItems]);

  // Catalog filtered by selected category
  const filteredCatalogBooks = useMemo(() => {
    if (selectedCategory === 'All') return availableBooks.slice(0, 20);
    return availableBooks
      .filter((b) => b.category.toLowerCase().includes(selectedCategory.toLowerCase()))
      .slice(0, 20);
  }, [availableBooks, selectedCategory]);

  // Build the personalized Threads post feed pairing curiosity-gap hooks, reflections and live books with inserted chapters
  const communityFeedPosts: ThreadPostData[] = useMemo(() => {
    return generatePersonalizedPostFeed({
      allBooks: availableBooks,
      userProfile: {
        userId: user?.id,
        focusAreas: user?.focusAreas ?? preferences.focusAreas,
      },
      libraryItems,
      selectedMood,
      refreshSeed,
      limit: 15,
    });
  }, [availableBooks, libraryItems, preferences.focusAreas, refreshSeed, selectedMood, user?.focusAreas, user?.id]);

  // Build community posts fetched from the live MongoDB database
  const dbFeedPosts: ThreadPostData[] = useMemo(() => {
    return dbPosts.map((post) => {
      let matchingBook: Book | undefined = post.book
        ? toAppBook(post.book)
        : post.bookId
          ? availableBooks.find((b) => b.id === post.bookId)
          : undefined;

      return {
        id: `db-post-${post.id}`,
        user: {
          username: post.author.username,
          displayName: post.author.displayName,
          avatarUrl: post.author.avatarUrl,
          avatarColor: palette.primary,
          isVerified: false,
        },
        timeAgo: formatTimeAgo(post.createdAt),
        content: post.content,
        book: matchingBook ?? availableBooks[0],
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        repostsCount: 0,
        sharesCount: 0,
      };
    });
  }, [dbPosts, availableBooks]);

  // Build a unified interleaved feed:
  // posts → book-row → posts → rec-row → posts → book-row → ...
  type FeedItem =
    | { kind: 'post'; data: ThreadPostData }
    | { kind: 'book-row'; label: string; books: typeof availableBooks; offset: number }
    | { kind: 'rec-row' };

  const mixedFeed: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    const catalogChunks = [
      filteredCatalogBooks.slice(0, 5),
      filteredCatalogBooks.slice(5, 10),
      filteredCatalogBooks.slice(10, 15),
    ];
    const recBooks =
      recommendations.tailoredPicks.length > 0
        ? recommendations.tailoredPicks
        : availableBooks.slice(0, 6);

    const seenBookIds = new Set<string>();
    for (const p of userPosts) {
      if (p.book?.id) seenBookIds.add(p.book.id);
    }
    for (const p of dbFeedPosts) {
      if (p.book?.id) seenBookIds.add(p.book.id);
    }
    const freshCommunityPosts = communityFeedPosts.filter(
      (p) => !p.book?.id || !seenBookIds.has(p.book.id),
    );

    const posts = [...userPosts, ...dbFeedPosts, ...freshCommunityPosts];

    posts.forEach((post, idx) => {
      items.push({ kind: 'post', data: post });

      // After every 2nd post insert a book row
      if ((idx + 1) % 2 === 0) {
        const chunkIdx = Math.floor((idx + 1) / 2) - 1;
        if (chunkIdx === 0) {
          // First book injection: tailored recs
          items.push({ kind: 'rec-row' });
        } else {
          // Subsequent book injections: catalog chunks
          const catalogChunk = catalogChunks[(chunkIdx - 1) % catalogChunks.length];
          if (catalogChunk.length > 0) {
            items.push({
              kind: 'book-row',
              label: chunkIdx === 1 ? '📚 From the Catalog' : '🔥 More Picks',
              books: catalogChunk,
              offset: chunkIdx,
            });
          }
        }
      }
    });

    // If we only have 0-1 posts still inject recs at the end
    if (posts.length <= 1 && recBooks.length > 0) {
      items.push({ kind: 'rec-row' });
    }

    return items;
  }, [
    userPosts,
    dbFeedPosts,
    communityFeedPosts,
    filteredCatalogBooks,
    recommendations.tailoredPicks,
    availableBooks,
  ]);

  const handleCreatePost = async () => {
    if (!composerText.trim()) return;
    const text = composerText.trim();
    const bookId = composerBookId || availableBooks[0]?.id;
    const selectedBook = availableBooks.find((b) => b.id === composerBookId) ?? availableBooks[0];
    const tempId = `user-post-${Date.now()}`;
    const newPost: ThreadPostData = {
      id: tempId,
      user: {
        username: user?.username ?? 'curious_reader',
        displayName: user?.displayName ?? 'Curious Reader',
        avatarUrl: user?.avatarUrl,
        avatarColor: palette.primary,
        isVerified: false,
      },
      timeAgo: 'Just now',
      content: text,
      book: selectedBook,
      likesCount: 1,
      commentsCount: 0,
      repostsCount: 0,
      sharesCount: 0,
    };
    setUserPosts((prev) => [newPost, ...prev]);
    setComposerText('');
    setIsComposerOpen(false);

    try {
      const created = await createCommunityPost(
        {
          content: text,
          bookId: bookId && /^[a-fA-F0-9]{24}$/.test(bookId) ? bookId : undefined,
        },
        accessToken ?? undefined,
      );
      setUserPosts((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? {
                ...p,
                id: created.id,
              }
            : p,
        ),
      );
      void loadCommunityPosts();
    } catch (err) {
      console.warn('Could not save post to database:', err);
    }
  };



  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {/* Top Header: Libery Threads Icon, Title & Notifications */}
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Ionicons name="at" size={20} color="#0B1B14" />
            </View>
            <View>
              <Text style={styles.eyebrow}>
                {getGreetingTime()} · {getFormattedDate()}
              </Text>
              <Text style={styles.heading}>{user?.displayName ?? 'Curious Reader'}</Text>
            </View>
          </View>

          {/* <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => router.push('/notifications')}
            style={styles.notificationBadge}
          >
            <Ionicons name="notifications-outline" size={18} color="#fff" />
          </Pressable> */}
        </View>

        {/* Guest Banner if not signed in */}
        {!user && (
          <View style={styles.guestBanner}>
            <View style={styles.guestBannerLeft}>
              <View style={styles.guestSparkle}>
                <Ionicons name="sparkles" size={16} color={palette.primary} />
              </View>
              <View style={styles.guestBannerTextWrap}>
                <Text style={styles.guestBannerTitle}>Welcome to Libra Hub Feed</Text>
                <Text style={styles.guestBannerSubtitle}>
                  Explore 2,000+ timeless books and reader reflections. Sign in anytime to sync your shelf.
                </Text>
              </View>
            </View>
            <Link href="/sign-in" asChild>
              <Pressable style={styles.guestSignInBtn}>
                <Text style={styles.guestSignInText}>Sign In</Text>
              </Pressable>
            </Link>
          </View>
        )}

        {/* Live Catalog Banner */}
        {/* <View style={styles.catalogIndicator}>
          <View style={styles.indicatorDot} />
          <Text style={styles.indicatorText}>
            {isCloudCatalog
              ? `Connected to MongoDB Atlas Cloud · ${availableBooks.length} books available`
              : isLoading
                ? 'Connecting to MongoDB Atlas Cloud…'
                : `Libra Hub Catalog · ${availableBooks.length} books ready`}
          </Text>
        </View> */}

        {/* Threads Quick Post Composer Bar */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a new book post"
          onPress={() => {
            if (!composerBookId && availableBooks.length > 0) {
              setComposerBookId(availableBooks[0].id);
            }
            setIsComposerOpen(true);
          }}
          style={styles.composerBar}
        >
          <View style={styles.composerAvatar}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.composerAvatarImg} />
            ) : (
              <Text style={styles.composerAvatarText}>
                {user?.displayName ? user.displayName[0].toUpperCase() : 'R'}
              </Text>
            )}
            <View style={styles.composerPlusBadge}>
              <Ionicons name="add" size={10} color="#0B1B14" />
            </View>
          </View>
          <Text style={styles.composerPlaceholder}>
            What are you reading? Share a quote or thought…
          </Text>
          <View style={styles.postSmallBtn}>
            <Text style={styles.postSmallBtnText}>Post</Text>
          </View>
        </Pressable>

        {/* Active Book In-Progress (if any) */}
        {activeReadingItem && (
          <View style={styles.continueCard}>
            <View style={styles.continueInfo}>
              <Text style={styles.continueLabel}>Continue reading</Text>
              <Text style={styles.continueTitle} numberOfLines={1}>
                {activeReadingItem.book.title}
              </Text>
              <Text style={styles.continueAuthor} numberOfLines={1}>
                {activeReadingItem.book.author}
              </Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressFill, { width: `${activeReadingItem.progress}%` }]}
                  />
                </View>
                <Text style={styles.progressPercent}>{activeReadingItem.progress}%</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Resume reading"
              onPress={() => router.push(`/read/${activeReadingItem.book.id}`)}
              style={styles.resumeBtn}
            >
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={styles.resumeBtnText}>Resume</Text>
            </Pressable>
          </View>
        )}

        {/* Feed Mood Filter Chips */}
        <View style={styles.feedFilterSection}>
          <Text style={styles.feedFilterTitle}>Explore Community Threads</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {moodFilters.map((mood) => {
              const isSelected = selectedMood === mood;
              return (
                <Pressable
                  key={mood}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedMood(mood)}
                  style={[styles.moodChip, isSelected && styles.moodChipActive]}
                >
                  <Text style={[styles.moodChipText, isSelected && styles.moodChipTextActive]}>
                    {mood === 'All' ? '🔥 For You' : mood}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Unified Interleaved Feed: posts ↔ book rows ↔ rec rows mixed inline */}
        <View style={styles.threadsFeed}>
          {mixedFeed.map((item, idx) => {
            if (item.kind === 'post') {
              return <ThreadPostCard key={item.data.id} post={item.data} />;
            }

            if (item.kind === 'rec-row') {
              const recBooks =
                recommendations.tailoredPicks.length > 0
                  ? recommendations.tailoredPicks
                  : availableBooks.slice(0, 6);
              return (
                <View key={`rec-row-${idx}`} style={styles.inlineSectionWrap}>
                  <View style={styles.inlineSectionHeader}>
                    <Ionicons name="heart-circle" size={16} color={palette.primary} />
                    <Text style={styles.inlineSectionTitle}>Tailored to Your Taste</Text>
                    <Text style={styles.inlineSectionSub}>· Based on your likes</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.inlineBookRow}
                  >
                    {recBooks.map((book) => (
                      <BookCard key={`rec-${book.id}`} book={book} />
                    ))}
                  </ScrollView>
                </View>
              );
            }

            if (item.kind === 'book-row') {
              return (
                <View key={`book-row-${idx}`} style={styles.inlineSectionWrap}>
                  <View style={styles.inlineSectionHeader}>
                    <Ionicons name="book" size={14} color={palette.primary} />
                    <Text style={styles.inlineSectionTitle}>{item.label}</Text>
                    <Text style={styles.inlineSectionSub}>· Atlas 2,000+</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.inlineBookRow}
                  >
                    {item.books.map((book) => (
                      <BookCard key={`brow-${item.offset}-${book.id}`} book={book} />
                    ))}
                  </ScrollView>
                </View>
              );
            }

            return null;
          })}
        </View>

        {/* Category filter chips + extra catalog sweep at the very bottom */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="grid" size={16} color={palette.primary} />
            <Text style={styles.sectionTitle}>Explore by Category</Text>
          </View>
          <Text style={styles.sectionSub}>Atlas Collection</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {catalogCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.inlineBookRow}
        >
          {filteredCatalogBooks.slice(15).map((book) => (
            <BookCard key={`cat-bottom-${book.id}`} book={book} />
          ))}
        </ScrollView>


        {/* Guest Community Sign-Up Banner */}
        {!user && (
          <View style={styles.finalCta}>
            <Text style={styles.finalCtaTitle}>Ready to build your personal shelf?</Text>
            <Text style={styles.finalCtaSubtitle}>
              Create a free account to track reading progress, bookmark favorite quotes, and join discussions.
            </Text>
            <Link href="/sign-in" asChild>
              <Pressable style={styles.finalCtaButton}>
                <Text style={styles.finalCtaButtonText}>Create Free Account</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </Pressable>
            </Link>
          </View>
        )}
      </ScrollView>

      {/* New Thread Post Composer Modal */}
      <Modal
        visible={isComposerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsComposerOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setIsComposerOpen(false)} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>New Thread Post</Text>
            <Pressable
              onPress={handleCreatePost}
              disabled={!composerText.trim()}
              style={[styles.modalPostBtn, !composerText.trim() && styles.modalPostBtnDisabled]}
            >
              <Text style={styles.modalPostBtnText}>Post</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.composerUserRow}>
              <View style={styles.composerAvatar}>
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.composerAvatarImg} />
                ) : (
                  <Text style={styles.composerAvatarText}>
                    {user?.displayName ? user.displayName[0].toUpperCase() : 'R'}
                  </Text>
                )}
              </View>
              <Text style={styles.composerUsername}>
                {user?.username ?? 'curious_reader'}
              </Text>
            </View>

            <TextInput
              multiline
              autoFocus
              placeholder="What are you reading? Share a quote or reflection…"
              placeholderTextColor="#94A3B8"
              value={composerText}
              onChangeText={setComposerText}
              style={styles.composerInput}
            />

            <Text style={styles.selectBookLabel}>Attach a Book from Atlas Catalog:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bookSelectorRow}>
              {availableBooks.slice(0, 15).map((book) => {
                const isSelected = book.id === composerBookId;
                return (
                  <Pressable
                    key={book.id}
                    onPress={() => setComposerBookId(book.id)}
                    style={[styles.bookPill, isSelected && styles.bookPillSelected]}
                  >
                    <Ionicons
                      name="book"
                      size={14}
                      color={isSelected ? '#fff' : palette.primary}
                    />
                    <Text
                      style={[styles.bookPillText, isSelected && styles.bookPillTextSelected]}
                      numberOfLines={1}
                    >
                      {book.title}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heading: {
    color: '#0B1B14',
    fontSize: 22,
    fontWeight: '800',
  },
  notificationBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0B1B14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestBanner: {
    backgroundColor: '#EAF5EE',
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#D4E8DC',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  guestBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  guestSparkle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestBannerTextWrap: {
    flex: 1,
  },
  guestBannerTitle: {
    color: palette.textLight,
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 2,
  },
  guestBannerSubtitle: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  guestSignInBtn: {
    backgroundColor: palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  guestSignInText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  catalogIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAF9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginHorizontal: spacing.md,
    marginTop: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2EBE5',
  },
  indicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  indicatorText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '700',
  },
  composerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: 10,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  composerAvatar: {
    position: 'relative',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerAvatarImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  composerAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B1B14',
  },
  composerPlusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: '#94A3B8',
  },
  postSmallBtn: {
    backgroundColor: '#0B1B14',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  postSmallBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  feedFilterSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  feedFilterTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0B1B14',
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    marginBottom: spacing.xs,
    gap: 8,
  },
  moodChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  moodChipActive: {
    backgroundColor: '#0B1B14',
  },
  moodChipText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
  },
  moodChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  threadsFeed: {
    borderTopWidth: 1,
    borderTopColor: '#F0F3F1',
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    color: '#0B1B14',
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSub: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  bookRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 12,
  },
  inlineSectionWrap: {
    borderTopWidth: 1,
    borderTopColor: '#F0F3F1',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: '#FAFCFB',
  },
  inlineSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    marginBottom: 8,
  },
  inlineSectionTitle: {
    color: '#0B1B14',
    fontSize: 13,
    fontWeight: '800',
  },
  inlineSectionSub: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  inlineBookRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    gap: 10,
  },
  categoryChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E2EBE5',
  },
  categoryChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  categoryChipText: {
    color: palette.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E3E2B',
    borderRadius: radii.xl,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#173624',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  continueInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  continueLabel: {
    color: '#86EFAC',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  continueTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  continueAuthor: {
    color: '#D1FAE5',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ADE80',
    borderRadius: 3,
  },
  progressPercent: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    minWidth: 28,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    gap: 6,
  },
  resumeBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  finalCta: {
    backgroundColor: '#163824',
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.lg,
  },
  finalCtaTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  finalCtaSubtitle: {
    color: '#D1FAE5',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 4,
  },
  finalCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radii.md,
    gap: 8,
  },
  finalCtaButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  // Modal Composer Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalCancelBtn: {
    padding: 4,
  },
  modalCancelText: {
    color: '#64748B',
    fontSize: 15,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1B14',
  },
  modalPostBtn: {
    backgroundColor: '#0B1B14',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  modalPostBtnDisabled: {
    opacity: 0.4,
  },
  modalPostBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
    padding: spacing.md,
  },
  composerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  composerUsername: {
    fontWeight: '700',
    fontSize: 14,
    color: '#0B1B14',
  },
  composerInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#0B1B14',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  selectBookLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginTop: spacing.md,
    marginBottom: 8,
  },
  bookSelectorRow: {
    gap: 8,
    paddingVertical: 4,
  },
  bookPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: 200,
  },
  bookPillSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  bookPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0B1B14',
  },
  bookPillTextSelected: {
    color: '#fff',
  },
});
