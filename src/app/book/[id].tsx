import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReaderPreferences, isBookAllowedForAge } from '../../context/ReaderPreferences';
import { books } from '../../data/books';
import { palette, radii, spacing } from '../../theme';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { preferences } = useReaderPreferences();
  const book = books.find((item) => item.id === id) ?? books[0];
  const [saved, setSaved] = useState(false);
  const canRead = isBookAllowedForAge(book.ageRating, preferences.ageGroup);

  if (!canRead) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.restrictedState}>
          <Text style={styles.title}>This book isn’t available for your age group</Text>
          <Text style={styles.meta}>Your age preference keeps this title out of your library.</Text>
          <Link href="/" style={styles.backLink}>Return to the library</Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Link href="/" style={styles.backLink}>Back to home</Link>

        <View style={[styles.cover, { backgroundColor: book.coverColors[0], borderColor: book.coverColors[1] }]}>
          <Text style={styles.coverText}>{book.title}</Text>
        </View>

        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.meta}>{book.author} · {book.provider}</Text>

        <View style={styles.primaryActions}>
          <Link href={`/read/${book.id}`} asChild>
            <Pressable accessibilityRole="button" style={styles.readButton}>
              <Text style={styles.readButtonText}>Read sample</Text>
            </Pressable>
          </Link>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: saved }}
            onPress={() => setSaved((current) => !current)}
            style={[styles.saveButton, saved && styles.savedButton]}
          >
            <Text style={[styles.saveButtonText, saved && styles.savedButtonText]}>
              {saved ? 'Saved to library' : 'Save to library'}
            </Text>
          </Pressable>
        </View>

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
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summary}>{book.description}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Pages</Text>
          <Text style={styles.infoValue}>{book.pages}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Rating</Text>
          <Text style={styles.infoValue}>{book.rating.toFixed(1)} / 5</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Reviews</Text>
          <Text style={styles.infoValue}>{book.reviews}</Text>
        </View>
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
  cover: {
    height: 260,
    borderRadius: radii.xl,
    justifyContent: 'flex-end',
    padding: spacing.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  coverText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  title: {
    color: palette.textLight,
    fontSize: 28,
    fontWeight: '800',
  },
  meta: {
    fontSize: 14,
    color: palette.muted,
    marginTop: 6,
  },
  primaryActions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  readButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: palette.primary,
    marginRight: 10,
  },
  readButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  saveButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.primary,
    backgroundColor: '#fff',
  },
  savedButton: {
    backgroundColor: '#EAF3EE',
  },
  saveButtonText: {
    color: palette.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
  savedButtonText: {
    color: palette.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  pill: {
    backgroundColor: '#EAF3EE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  pillText: {
    color: palette.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },
  summaryBox: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  summary: {
    color: palette.textLight,
    fontSize: 15,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EFEA',
    marginBottom: 12,
  },
  infoLabel: {
    color: palette.muted,
    fontWeight: '600',
  },
  infoValue: {
    color: palette.textLight,
    fontWeight: '700',
  },
});
