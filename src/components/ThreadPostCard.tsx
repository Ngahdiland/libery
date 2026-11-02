import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useComments } from '../context/CommentsContext';
import { useReadingLibrary } from '../context/ReadingLibraryContext';
import type { Book } from '../data/books';
import type { LiteraryQuote } from '../data/quotes';
import { palette, radii, spacing } from '../theme';
import { BookCover } from './BookCover';

export type ThreadPostData = {
  id: string;
  user: {
    username: string;
    displayName: string;
    avatarUrl?: string;
    avatarColor?: string;
    isVerified?: boolean;
    isAuthor?: boolean;
  };
  timeAgo: string;
  content: string;
  book?: Book;
  quote?: string;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  sharesCount: number;
};

type ThreadPostCardProps = {
  post?: ThreadPostData;
  quote?: LiteraryQuote;
  book?: Book;
};

export function ThreadPostCard({ post, quote, book: propBook }: ThreadPostCardProps) {
  const router = useRouter();
  const { getItem, saveItem } = useReadingLibrary();
  const { getCommentCount, openComments } = useComments();

  // Normalize post data from either `post` or `quote` + `propBook`
  const book = post?.book ?? propBook;
  const username = post?.user.username ?? (quote ? quote.author.toLowerCase().replace(/[^a-z0-9]/g, '') : 'libery_reader');
  const displayName = post?.user.displayName ?? (quote ? quote.author : 'Book Lover');
  const isVerified = post?.user.isVerified ?? true;
  const timeAgo = post?.timeAgo ?? (quote?.mood === 'Fun' ? '2h' : quote?.mood === 'Philosophical' ? '5h' : '1d');
  const content = post?.content ?? (quote ? `“${quote.quote}”\n\n${quote.tagline}` : 'Just finished this masterpiece. Highly recommended to everyone!');
  const initialLikes = post?.likesCount ?? (quote?.likesCount ?? 128);
  const initialComments = post?.commentsCount ?? (quote?.commentsCount ?? 14);
  const initialReposts = post?.repostsCount ?? Math.max(4, Math.round(initialLikes * 0.2));
  const initialShares = post?.sharesCount ?? Math.max(2, Math.round(initialLikes * 0.1));
  const avatarColor = post?.user.avatarColor ?? (quote?.moodColor ?? palette.primary);

  const libraryItem = book ? getItem(book.id) : undefined;
  const isBookLiked = Boolean(libraryItem?.isFavorite);
  const [isLiked, setIsLiked] = useState(isBookLiked);
  const [isReposted, setIsReposted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const liveLikes = initialLikes + (isLiked ? 1 : 0);
  const liveComments = book ? Math.max(initialComments, getCommentCount(book.id)) : initialComments;
  const liveReposts = initialReposts + (isReposted ? 1 : 0);

  // Avatar Initials
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const toggleLike = async () => {
    const nextState = !isLiked;
    setIsLiked(nextState);
    if (book) {
      try {
        await saveItem(book, {
          status: libraryItem?.status ?? 'want_to_read',
          progress: libraryItem?.progress ?? 0,
          isFavorite: nextState,
        });
      } catch {
        // Handled silently
      }
    }
  };

  const toggleRepost = () => {
    setIsReposted(!isReposted);
  };

  const toggleBookmark = async () => {
    const nextBookmark = !isBookmarked;
    setIsBookmarked(nextBookmark);
    if (book && nextBookmark) {
      try {
        await saveItem(book, {
          status: libraryItem?.status ?? 'want_to_read',
          progress: libraryItem?.progress ?? 0,
          isFavorite: isLiked,
        });
      } catch {
        // Handled silently
      }
    }
  };

  const handleBookPress = () => {
    if (book) {
      router.push(`/read/${book.id}`);
    } else if (quote) {
      router.push(`/discover?q=${encodeURIComponent(quote.bookTitle)}`);
    }
  };

  const handleCommentPress = () => {
    if (book) {
      openComments(book);
    }
  };

  return (
    <View style={styles.postWrapper}>
      {/* 2-Column Threads Layout: Left Avatar & Line, Right Post Content */}
      <View style={styles.leftCol}>
        {/* User Avatar with Threads '+' Follow Badge */}
        <View style={styles.avatarContainer}>
          {post?.user.avatarUrl ? (
            <Image source={{ uri: post.user.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: `${avatarColor}20` }]}>
              <Text style={[styles.avatarText, { color: avatarColor }]}>{initials}</Text>
            </View>
          )}
          {!isFollowing && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Follow ${displayName}`}
              onPress={() => setIsFollowing(true)}
              style={styles.plusBadge}
            >
              <Ionicons name="add" size={11} color="#0B1B14" />
            </Pressable>
          )}
        </View>

        {/* Continuous Threads vertical connection line */}
        <View style={styles.threadLine} />
      </View>

      {/* Right Column: User Header, Content, Media Card & Action Row */}
      <View style={styles.rightCol}>
        {/* Top Header: Username, Verified Badge, Timestamp & More */}
        <View style={styles.headerRow}>
          <View style={styles.userMetaRow}>
            <Text style={styles.username} numberOfLines={1}>{username}</Text>
            {isVerified && (
              <Ionicons name="checkmark-circle" size={14} color="#1D9BF0" style={styles.verifiedBadge} />
            )}
            <Text style={styles.timestamp}>{timeAgo}</Text>
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel="More options" style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={16} color="#94A3B8" />
          </Pressable>
        </View>

        {/* Post Text / Caption */}
        <Text style={styles.postContent}>{content}</Text>

        {/* The Central Media/Book Card (Netflix-style rounded focal preview in Threads) */}
        {book && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Read ${book.title}`}
            onPress={handleBookPress}
            style={styles.mediaCard}
          >
            {/* Background / Inner Content */}
            <View style={styles.mediaCardInner}>
              {/* Left: Book Cover */}
              <View style={styles.mediaCoverWrap}>
                <BookCover book={book} compact height={96} />
              </View>

              {/* Right: Book Metadata & Summary */}
              <View style={styles.mediaDetails}>
                <View style={styles.mediaCategoryPill}>
                  <Text style={styles.mediaCategoryText}>{book.category}</Text>
                </View>
                <Text style={styles.mediaTitle} numberOfLines={2}>
                  {book.title}
                </Text>
                <Text style={styles.mediaAuthor} numberOfLines={1}>
                  by {book.author}
                </Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingText}>{book.rating.toFixed(1)}</Text>
                  {book.pages && (
                    <>
                      <Text style={styles.ratingDot}>·</Text>
                      <Text style={styles.pagesText}>{book.pages} pages</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Floating Bottom-Right Badge (like the mute/sound badge in Threads) */}
              <View style={styles.mediaBadge}>
                <Ionicons name="book" size={13} color="#fff" />
                <Text style={styles.mediaBadgeText}>Read</Text>
              </View>
            </View>
          </Pressable>
        )}

        {/* Threads Action Row: Heart, Comment, Repost, Share */}
        <View style={styles.actionRow}>
          {/* Heart / Like */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isLiked ? 'Unlike' : 'Like'}
            onPress={() => void toggleLike()}
            style={styles.actionBtn}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? '#E11D48' : '#0B1B14'}
            />
            <Text style={[styles.actionCount, isLiked && styles.likedCount]}>
              {liveLikes}
            </Text>
          </Pressable>

          {/* Speech Bubble / Comment */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reply"
            onPress={handleCommentPress}
            style={styles.actionBtn}
          >
            <Ionicons name="chatbubble-outline" size={19} color="#0B1B14" />
            <Text style={styles.actionCount}>{liveComments}</Text>
          </Pressable>

          {/* Repost / Quote */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Repost"
            onPress={toggleRepost}
            style={styles.actionBtn}
          >
            <Ionicons
              name="repeat-outline"
              size={21}
              color={isReposted ? '#10B981' : '#0B1B14'}
            />
            <Text style={[styles.actionCount, isReposted && styles.repostedCount]}>
              {liveReposts}
            </Text>
          </Pressable>

          {/* Paper Airplane / Share */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share"
            onPress={() => void toggleBookmark()}
            style={styles.actionBtn}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'paper-plane-outline'}
              size={19}
              color={isBookmarked ? palette.primary : '#0B1B14'}
            />
            <Text style={[styles.actionCount, isBookmarked && styles.bookmarkedCount]}>
              {initialShares + (isBookmarked ? 1 : 0)}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  postWrapper: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F1',
  },
  leftCol: {
    width: 44,
    alignItems: 'center',
    marginRight: 12,
  },
  avatarContainer: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  avatarText: {
    fontWeight: '800',
    fontSize: 15,
  },
  plusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  threadLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E5EAE7',
    marginTop: 8,
    borderRadius: 1,
  },
  rightCol: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  username: {
    fontWeight: '700',
    fontSize: 14,
    color: '#0B1B14',
  },
  verifiedBadge: {
    marginLeft: 1,
  },
  timestamp: {
    fontSize: 13,
    color: '#94A3B8',
    marginLeft: 4,
  },
  moreButton: {
    padding: 4,
  },
  postContent: {
    fontSize: 14.5,
    lineHeight: 21,
    color: '#1E293B',
    marginBottom: 10,
    letterSpacing: -0.1,
  },
  mediaCard: {
    borderRadius: radii.xl,
    backgroundColor: '#0F1E17',
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#0E2417',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  mediaCardInner: {
    flexDirection: 'row',
    padding: 12,
    position: 'relative',
    alignItems: 'center',
  },
  mediaCoverWrap: {
    marginRight: 12,
    borderRadius: radii.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  mediaDetails: {
    flex: 1,
    paddingRight: 28,
  },
  mediaCategoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 4,
  },
  mediaCategoryText: {
    color: '#A7F3D0',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mediaTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 2,
  },
  mediaAuthor: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#FDE68A',
    fontSize: 11,
    fontWeight: '700',
  },
  ratingDot: {
    color: '#64748B',
    fontSize: 11,
  },
  pagesText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  mediaBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  mediaBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingVertical: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  actionCount: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  likedCount: {
    color: '#E11D48',
    fontWeight: '700',
  },
  repostedCount: {
    color: '#10B981',
    fontWeight: '700',
  },
  bookmarkedCount: {
    color: palette.primary,
    fontWeight: '700',
  },
});
