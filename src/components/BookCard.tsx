import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BookCover } from './BookCover';
import type { Book } from '../data/books';
import { palette, radii } from '../theme';

type BookCardProps = {
  book: Book;
  compact?: boolean;
  width?: number;
};

export function BookCard({ book, compact = false, width }: BookCardProps) {
  return (
    <Link href={`/book/${book.id}`} asChild>
      <Pressable style={StyleSheet.flatten([styles.card, compact && styles.compactCard, width ? { width, marginRight: 0 } : undefined])}>
        <BookCover book={book} compact={compact} />

        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
          <Text style={styles.meta}>{book.author}</Text>
          <Text style={styles.meta}>{book.category}</Text>
          <View style={styles.ratingRow}>
            {book.reviews > 0 ? (
              <>
                <Text style={styles.rating}>★ {book.rating.toFixed(1)}</Text>
                <Text style={styles.reviews}>({book.reviews})</Text>
              </>
            ) : <Text style={styles.reviews}>No ratings yet</Text>}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 170,
    marginRight: 14,
    borderRadius: radii.md,
    backgroundColor: palette.card,
    overflow: 'hidden',
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  compactCard: {
    width: 150,
  },
  textWrap: {
    padding: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.textLight,
    marginBottom: 2,
  },
  meta: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 2,
  },
  ratingRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    color: '#E4A42B',
    fontWeight: '700',
    fontSize: 12,
  },
  reviews: {
    color: palette.muted,
    fontSize: 11,
  },
});
