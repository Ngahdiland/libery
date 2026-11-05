import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, radii, spacing } from '../theme';
import type { Book } from '../data/books';

type AttributionProps = {
  book: Pick<Book, 'title' | 'author' | 'sourceName' | 'sourceUrl' | 'license' | 'downloadUrl'>;
};

export function Attribution({ book }: AttributionProps) {
  const sourceName = book.sourceName || 'Project Gutenberg';
  const license = book.license || 'Public Domain';
  const sourceUrl = book.sourceUrl || (book.downloadUrl ?? undefined);
  const downloadUrl = book.downloadUrl || book.sourceUrl;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="shield-checkmark-outline" size={18} color={palette.primaryDark} />
        <Text style={styles.headerTitle}>Attribution & License</Text>
      </View>

      <Text style={styles.bodyText}>
        <Text style={styles.boldText}>{book.title}</Text> by{' '}
        <Text style={styles.boldText}>{book.author}</Text>
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>Source:</Text>
          <Text style={styles.badgeValue}>{sourceName}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>License:</Text>
          <Text style={styles.badgeValue}>{license}</Text>
        </View>
      </View>

      <Text style={styles.disclaimerText}>
        This book is distributed under open public domain licensing. Libra Hub never hosts or stores copyrighted copies.
      </Text>

      <View style={styles.actionsRow}>
        {Boolean(sourceUrl) && (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`View ${book.title} at ${sourceName}`}
            onPress={() => sourceUrl && void Linking.openURL(sourceUrl)}
            style={styles.linkButton}
          >
            <Ionicons name="open-outline" size={14} color={palette.primaryDark} />
            <Text style={styles.linkButtonText}>View at original source</Text>
          </Pressable>
        )}

        {Boolean(downloadUrl) && (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Download original file from ${sourceName}`}
            onPress={() => downloadUrl && void Linking.openURL(downloadUrl)}
            style={styles.downloadButton}
          >
            <Ionicons name="download-outline" size={14} color="#FFFFFF" />
            <Text style={styles.downloadButtonText}>Original file (Source)</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F8F5',
    borderColor: '#D4E8DC',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    color: palette.primaryDark,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyText: {
    color: palette.textLight,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  boldText: {
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2F0E7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    gap: 4,
  },
  badgeLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  badgeValue: {
    color: palette.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  disclaimerText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderColor: palette.primary,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  linkButtonText: {
    color: palette.primaryDark,
    fontSize: 13,
    fontWeight: '600',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

