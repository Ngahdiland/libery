import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { Book } from '../data/books';

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Arts: 'color-palette',
  Biography: 'person',
  Business: 'briefcase',
  Children: 'sparkles',
  Drama: 'ticket',
  Education: 'school',
  Fiction: 'leaf',
  History: 'time',
  Literature: 'book',
  Philosophy: 'infinite',
  Poetry: 'flower',
  Religion: 'sunny',
  Science: 'planet',
  Society: 'people',
  Travel: 'compass',
};

type BookCoverProps = {
  book: Pick<Book, 'title' | 'author' | 'category' | 'coverColors' | 'coverImageUrl'>;
  compact?: boolean;
  large?: boolean;
  height?: number;
};

export function BookCover({ book, compact = false, large = false, height }: BookCoverProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const iconKey = Object.keys(categoryIcons).find((key) => book.category.toLowerCase().includes(key.toLowerCase()));
  const icon = categoryIcons[iconKey ?? 'Literature'];
  const imageUrl = imageFailed ? undefined : book.coverImageUrl;
  const small = height !== undefined && height <= 130;

  return (
    <View
      accessibilityLabel={`${book.title} cover`}
      style={[
        styles.cover,
        compact && styles.compact,
        large && styles.large,
        height !== undefined && { height },
        { backgroundColor: book.coverColors[0] },
      ]}
    >
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
          onError={() => setImageFailed(true)}
        />
      )}
      {!imageUrl && (
        <>
          <View style={[styles.sun, { backgroundColor: book.coverColors[1] }]} />
          <View style={styles.orbit} />
          <Ionicons name={icon} size={large ? 106 : compact ? 48 : 68} color="rgba(255,255,255,0.72)" />
        </>
      )}
      <View style={styles.copy}>
        <Text style={[styles.category, small && styles.smallCategory]} numberOfLines={1}>{book.category.toUpperCase()}</Text>
        <Text style={[styles.title, compact && styles.compactTitle, small && styles.smallTitle, large && styles.largeTitle]} numberOfLines={3}>
          {book.title}
        </Text>
        {!compact && <Text style={styles.author} numberOfLines={1}>{book.author}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    padding: 12,
    position: 'relative',
  },
  compact: {
    height: 148,
  },
  large: {
    height: 300,
    borderRadius: 22,
    marginBottom: 22,
  },
  sun: {
    width: '78%',
    aspectRatio: 1,
    borderRadius: 999,
    opacity: 0.28,
    position: 'absolute',
    top: '-24%',
    right: '-20%',
  },
  orbit: {
    width: '86%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    position: 'absolute',
    top: '8%',
    left: '-34%',
  },
  copy: {
    alignSelf: 'stretch',
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    zIndex: 1,
  },
  category: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 21,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowRadius: 8,
  },
  compactTitle: {
    fontSize: 14,
    lineHeight: 17,
  },
  smallCategory: {
    fontSize: 8,
    marginBottom: 4,
  },
  smallTitle: {
    fontSize: 12,
    lineHeight: 14,
  },
  largeTitle: {
    fontSize: 28,
    lineHeight: 32,
  },
  author: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 11,
    marginTop: 6,
  },
});
