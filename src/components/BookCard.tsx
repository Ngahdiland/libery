import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useComments } from '../context/CommentsContext';
import { useReadingLibrary } from '../context/ReadingLibraryContext';
import type { Book } from '../data/books';
import { palette, radii } from '../theme';
import { BookCover } from './BookCover';

type BookCardProps = {
  book: Book;
  compact?: boolean;
  width?: number;
};

export function BookCard({ book, compact = false, width }: BookCardProps) {
  const router = useRouter();
  const { getItem, saveItem } = useReadingLibrary();
  const { getCommentCount, openComments } = useComments();

  const libraryItem = getItem(book.id);
  const isLiked = Boolean(libraryItem?.isFavorite);
  const [localLikeDelta, setLocalLikeDelta] = useState(0);

  const baseLikes = Math.max(12, Math.floor(((book.rating || 4.2) * 18) + (book.reviews || 5)));
  const currentLikes = baseLikes + (isLiked ? 1 : 0) + localLikeDelta;
  const commentCount = getCommentCount(book.id);

  const toggleLike = async () => {
    const nextFavorite = !isLiked;
    setLocalLikeDelta((prev) => (nextFavorite ? prev + 1 : prev - 1));
    try {
      await saveItem(book, {
        status: libraryItem?.status ?? 'want_to_read',
        progress: libraryItem?.progress ?? 0,
        isFavorite: nextFavorite,
      });
    } catch {
      // Revert if error
      setLocalLikeDelta(0);
    }
  };

  const handleCardPress = () => {
    router.push(`/book/${book.id}`);
  };

  const handleReadPress = () => {
    router.push(`/read/${book.id}`);
  };

  const handleCommentPress = () => {
    openComments(book);
  };

  return (
    <View
      style={StyleSheet.flatten([
        styles.card,
        compact && styles.compactCard,
        width ? { width, marginRight: 0 } : undefined,
      ])}
    >
      {/* Clickable cover and book info */}
      <Pressable onPress={handleCardPress} style={styles.cardHeader}>
        <BookCover book={book} compact={compact} />
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={2}>
            {book.title}
          </Text>
          <Text style={styles.author} numberOfLines={1}>
            {book.author}
          </Text>
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText} numberOfLines={1}>
                {book.category}
              </Text>
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ {book.rating.toFixed(1)}</Text>
            </View>
          </View>
        </View>
      </Pressable>

      {/* Interactive Action Bar: Like, Comment, Read */}
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isLiked ? 'Unlike book' : 'Like book'}
          onPress={toggleLike}
          style={styles.actionBtn}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={17}
            color={isLiked ? '#E11D48' : palette.muted}
          />
          <Text style={[styles.actionCount, isLiked && styles.actionCountLiked]}>
            {currentLikes}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Comments"
          onPress={handleCommentPress}
          style={styles.actionBtn}
        >
          <Ionicons name="chatbubble-outline" size={15} color={palette.muted} />
          <Text style={styles.actionCount}>{commentCount}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Read book"
          onPress={handleReadPress}
          style={styles.readBtn}
        >
          <Ionicons name="book-outline" size={13} color="#fff" />
          <Text style={styles.readBtnText}>Read</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 178,
    marginRight: 14,
    borderRadius: radii.lg,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E7EFEA',
    shadowColor: '#173624',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    justifyContent: 'space-between',
  },
  compactCard: {
    width: 156,
  },
  cardHeader: {
    flex: 1,
  },
  textWrap: {
    padding: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.textLight,
    lineHeight: 18,
    marginBottom: 2,
  },
  author: {
    color: palette.muted,
    fontSize: 12,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: '#EEF6F1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 90,
  },
  categoryText: {
    color: palette.primaryDark,
    fontSize: 10,
    fontWeight: '700',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#D97706',
    fontWeight: '700',
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F5F2',
    backgroundColor: '#FAFDFB',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  actionCount: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  actionCountLiked: {
    color: '#E11D48',
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    gap: 3,
  },
  readBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
