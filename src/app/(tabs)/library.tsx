import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { books } from '../../data/books';
import { palette, radii, spacing } from '../../theme';

const shelfEntries = [
  { label: 'Reading', count: 3, tone: '#E1F4E7' },
  { label: 'Want to Read', count: 12, tone: '#F2E7CB' },
  { label: 'Finished', count: 28, tone: '#E2EBFF' },
  { label: 'Favorites', count: 9, tone: '#F4DDE5' },
];

export default function LibraryScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>My library</Text>

        <View style={styles.grid}>
          {shelfEntries.map((shelf) => (
            <View key={shelf.label} style={[styles.shelfCard, { backgroundColor: shelf.tone }]}>
              <Text style={styles.shelfLabel}>{shelf.label}</Text>
              <Text style={styles.shelfCount}>{shelf.count}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Currently reading</Text>
          <Text style={styles.sectionAction}>Sync</Text>
        </View>

        {books.slice(0, 2).map((book) => (
          <View key={book.id} style={styles.bookRow}>
            <View style={[styles.cover, { backgroundColor: book.coverColors[0], borderColor: book.coverColors[1] }]}>
              <Text style={styles.coverText}>{book.title}</Text>
            </View>
            <View style={styles.metaWrap}>
              <Text style={styles.bookTitle}>{book.title}</Text>
              <Text style={styles.bookAuthor}>{book.author}</Text>
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${book.progress ?? 0}%` }]} />
                </View>
                <Text style={styles.progressText}>{book.progress ?? 0}%</Text>
              </View>
            </View>
          </View>
        ))}
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
    paddingBottom: 32,
  },
  heading: {
    color: palette.textLight,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  shelfCard: {
    width: '48%',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: 12,
  },
  shelfLabel: {
    color: palette.textLight,
    fontSize: 13,
    fontWeight: '600',
  },
  shelfCount: {
    marginTop: 10,
    color: palette.primaryDark,
    fontSize: 26,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    color: palette.textLight,
    fontWeight: '700',
  },
  sectionAction: {
    fontSize: 12,
    color: palette.primary,
    fontWeight: '700',
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#0B1B14',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3,
  },
  cover: {
    width: 64,
    height: 88,
    borderRadius: radii.md,
    justifyContent: 'flex-end',
    padding: 8,
    borderWidth: 1,
  },
  coverText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  metaWrap: {
    flex: 1,
    marginLeft: 14,
  },
  bookTitle: {
    color: palette.textLight,
    fontWeight: '700',
    fontSize: 15,
  },
  bookAuthor: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#D9E7DD',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: palette.primary,
  },
  progressText: {
    marginLeft: 8,
    color: palette.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },
});
