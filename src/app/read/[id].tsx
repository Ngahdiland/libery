import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useReaderPreferences, isBookAllowedForAge } from '../../context/ReaderPreferences';
import { books } from '../../data/books';
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
  const book = books.find((item) => item.id === id) ?? books[0];
  const [page, setPage] = useState(1);
  const [fontSize, setFontSize] = useState(20);
  const [bookmarked, setBookmarked] = useState(false);

  if (!isBookAllowedForAge(book.ageRating, preferences.ageGroup)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.restrictedState}>
          <Text style={styles.readerTitle}>This sample isn’t available for your age group.</Text>
          <Link href="/" style={styles.backLink}>Return to the library</Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Link href={`/book/${book.id}`} style={styles.backLink}>Book details</Link>
        <Text style={styles.headerTitle} numberOfLines={1}>{book.title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
          accessibilityState={{ selected: bookmarked }}
          onPress={() => setBookmarked((current) => !current)}
          style={styles.bookmarkButton}
        >
          <Text style={styles.bookmarkIcon}>{bookmarked ? '★' : '☆'}</Text>
        </Pressable>
      </View>

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
            onPress={() => setPage((current) => Math.max(1, current - 1))}
            style={[styles.pageButton, page === 1 && styles.disabledButton]}
          >
            <Text style={styles.pageButtonText}>Previous</Text>
          </Pressable>
          <Text style={styles.pageCounter}>{page} / {samplePassages.length}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPage((current) => Math.min(samplePassages.length, current + 1))}
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
