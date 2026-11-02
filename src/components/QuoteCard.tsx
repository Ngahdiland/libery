import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useComments } from '../context/CommentsContext';
import { useReadingLibrary } from '../context/ReadingLibraryContext';
import type { Book } from '../data/books';
import type { LiteraryQuote } from '../data/quotes';
import { palette, radii, spacing } from '../theme';
import { BookCover } from './BookCover';

type QuoteCardProps = {
  quote: LiteraryQuote;
  book?: Book;
};

export function QuoteCard({ quote, book }: QuoteCardProps) {
  const router = useRouter();
  const { getItem, saveItem } = useReadingLibrary();
  const { getCommentCount, openComments } = useComments();

  const libraryItem = book ? getItem(book.id) : undefined;
  const isBookLiked = Boolean(libraryItem?.isFavorite);
  const [quoteLiked, setQuoteLiked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const isLiked = isBookLiked || quoteLiked;
  const currentLikes = quote.likesCount + (isLiked ? 1 : 0);
  const commentCount = book ? getCommentCount(book.id) : quote.commentsCount;
  const repostCount = Math.round(quote.likesCount * 0.35) + (isReposted ? 1 : 0);

  // Author handle e.g. @marcus_aurelius
  const authorHandle = `@${quote.author.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  // Initials for avatar
  const initials = quote.author
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const toggleLike = async () => {
    const nextState = !isLiked;
    setQuoteLiked(nextState);
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

  const handleReadPress = () => {
    if (book) {
      router.push(`/read/${book.id}`);
    } else {
      router.push(`/discover?q=${encodeURIComponent(quote.bookTitle)}`);
    }
  };

  const handleCommentPress = () => {
    if (book) {
      openComments(book);
    }
  };

  return (
    <View style={styles.card}>
      {/* Post Header: Avatar, Name, Handle, Mood Pill & More */}
      <View style={styles.header}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: `${quote.moodColor}20` }]}>
          <Text style={[styles.avatarText, { color: quote.moodColor }]}>
            {initials || 'L'}
          </Text>
        </View>

        {/* User / Author Details */}
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.authorName} numberOfLines={1}>
              {quote.author}
            </Text>
            <Ionicons name="checkmark-circle" size={14} color="#1D9BF0" style={styles.verifiedIcon} />
            <Text style={styles.handleText} numberOfLines={1}>
              {authorHandle}
            </Text>
            <Text style={styles.dotSeparator}>·</Text>
            <View style={[styles.moodTag, { backgroundColor: `${quote.moodColor}15` }]}>
              <Text style={[styles.moodTagText, { color: quote.moodColor }]}>
                {quote.moodBadge}
              </Text>
            </View>
          </View>
        </View>

        {/* Options Icon */}
        <Ionicons name="ellipsis-horizontal" size={17} color="#94A3B8" />
      </View>

      {/* Post Text: The Literary Quote */}
      <View style={styles.body}>
        <Text style={styles.quoteContent}>“{quote.quote}”</Text>
      </View>

      {/* Embedded Book Card with Small Book Icon (Quote-Tweet / Card preview style) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Read ${quote.bookTitle}`}
        onPress={handleReadPress}
        style={styles.bookAttachmentCard}
      >
        <View style={styles.bookAttachmentLeft}>
          {book ? (
            <View style={styles.miniCoverWrapper}>
              <BookCover book={book} compact height={46} />
            </View>
          ) : (
            <View style={[styles.miniBookIconBox, { backgroundColor: `${quote.moodColor}18` }]}>
              <Ionicons name="book" size={17} color={quote.moodColor} />
            </View>
          )}
          <View style={styles.bookAttachmentMeta}>
            <View style={styles.bookTitleRow}>
              <Ionicons name="book-outline" size={12} color={palette.primary} style={styles.inlineBookIcon} />
              <Text style={styles.bookAttachmentTitle} numberOfLines={1}>
                {quote.bookTitle}
              </Text>
            </View>
            <Text style={styles.bookAttachmentTagline} numberOfLines={1}>
              {quote.tagline || `${quote.category} classic`}
            </Text>
          </View>
        </View>

        {/* Read CTA pill */}
        <View style={styles.readPill}>
          <Text style={styles.readPillText}>Read</Text>
          <Ionicons name="chevron-forward" size={13} color={palette.primary} />
        </View>
      </Pressable>

      {/* Bottom Social Action Bar: Twitter / Threads inspired */}
      <View style={styles.actionBar}>
        {/* Reply / Comment */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reply to quote"
          onPress={handleCommentPress}
          style={styles.actionItem}
        >
          <Ionicons name="chatbubble-outline" size={17} color="#64748B" />
          <Text style={styles.actionCount}>{commentCount}</Text>
        </Pressable>

        {/* Repost / Retweet */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Repost quote"
          onPress={toggleRepost}
          style={styles.actionItem}
        >
          <Ionicons
            name="repeat-outline"
            size={19}
            color={isReposted ? '#10B981' : '#64748B'}
          />
          <Text style={[styles.actionCount, isReposted && styles.repostedCount]}>
            {repostCount}
          </Text>
        </Pressable>

        {/* Like */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isLiked ? 'Unlike quote' : 'Like quote'}
          onPress={() => void toggleLike()}
          style={styles.actionItem}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={18}
            color={isLiked ? '#E11D48' : '#64748B'}
          />
          <Text style={[styles.actionCount, isLiked && styles.likedCount]}>
            {currentLikes}
          </Text>
        </Pressable>

        {/* Bookmark */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isBookmarked ? 'Bookmarked' : 'Bookmark quote'}
          onPress={() => void toggleBookmark()}
          style={styles.actionItem}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={17}
            color={isBookmarked ? palette.primary : '#64748B'}
          />
        </Pressable>

        {/* Share */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share quote"
          onPress={handleReadPress}
          style={styles.actionItem}
        >
          <Ionicons name="share-outline" size={18} color="#64748B" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E7ECE8',
    shadowColor: '#0E2417',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  authorName: {
    color: palette.textLight,
    fontWeight: '700',
    fontSize: 14,
    maxWidth: 110,
  },
  verifiedIcon: {
    marginLeft: 3,
    marginRight: 4,
  },
  handleText: {
    color: '#64748B',
    fontSize: 13,
    maxWidth: 85,
  },
  dotSeparator: {
    color: '#94A3B8',
    marginHorizontal: 5,
    fontSize: 12,
  },
  moodTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  moodTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  body: {
    marginBottom: 12,
  },
  quoteContent: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  bookAttachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAF8',
    borderWidth: 1,
    borderColor: '#E2EBE5',
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  bookAttachmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  miniCoverWrapper: {
    width: 32,
    height: 46,
    borderRadius: 5,
    overflow: 'hidden',
    marginRight: 10,
  },
  miniBookIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bookAttachmentMeta: {
    flex: 1,
  },
  bookTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineBookIcon: {
    marginRight: 4,
  },
  bookAttachmentTitle: {
    color: palette.textLight,
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
  bookAttachmentTagline: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  readPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 3,
  },
  readPillText: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F3',
    paddingHorizontal: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  actionCount: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  repostedCount: {
    color: '#10B981',
  },
  likedCount: {
    color: '#E11D48',
  },
});
