import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCard } from '../../components/BookCard';
import { useReaderPreferences, isBookAllowedForAge } from '../../context/ReaderPreferences';
import { books } from '../../data/books';
import { palette, radii, spacing } from '../../theme';

export default function HomeScreen() {
  const { preferences } = useReaderPreferences();
  const availableBooks = books.filter((book) =>
    isBookAllowedForAge(book.ageRating, preferences.ageGroup)
    && preferences.languages.includes(book.language),
  );
  const continueBook = availableBooks.find((book) => book.progress !== undefined) ?? availableBooks[0] ?? books[0];
  const recommendedBooks = availableBooks.filter((book) => preferences.focusAreas.includes(book.category));
  const focusBooks = recommendedBooks.length > 0 ? recommendedBooks : availableBooks;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>Good evening</Text>
            <Text style={styles.heading}>Amina</Text>
          </View>
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroLabel}>Continue reading</Text>
            <Text style={styles.heroTitle}>{continueBook.title}</Text>
            <Text style={styles.heroMeta}>{continueBook.author}</Text>
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${continueBook.progress ?? 0}%` }]} />
              </View>
              <Text style={styles.progressText}>{continueBook.progress ?? 0}%</Text>
            </View>
          </View>
          <View
            style={[
              styles.heroCover,
              {
                backgroundColor: continueBook.coverColors[0],
                borderColor: continueBook.coverColors[1],
              },
            ]}
          >
            <Text style={styles.heroCoverText}>{continueBook.title}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended for you</Text>
          <Text style={styles.sectionAction}>See all</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bookRow}>
          {(recommendedBooks.length > 0 ? recommendedBooks : availableBooks).map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top in your focus areas</Text>
          <Text style={styles.sectionAction}>More</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bookRow}>
          {focusBooks.filter((book) => book.id !== continueBook.id).map((book) => (
            <BookCard key={`${book.id}-related`} book={book} compact />
          ))}
        </ScrollView>
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
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  eyebrow: {
    color: palette.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heading: {
    color: palette.textLight,
    fontSize: 28,
    fontWeight: '800',
  },
  notificationBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EAF5ED',
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  heroTextWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  heroLabel: {
    color: palette.primary,
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: palette.textLight,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroMeta: {
    color: palette.muted,
    fontSize: 14,
    marginBottom: 18,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 9,
    borderRadius: 999,
    backgroundColor: '#CFE5D7',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: palette.primary,
  },
  progressText: {
    marginLeft: 10,
    color: palette.primaryDark,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  heroCover: {
    width: 92,
    height: 126,
    borderRadius: radii.lg,
    padding: 10,
    borderWidth: 1,
    justifyContent: 'flex-end',
  },
  heroCoverText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
  },
  sectionTitle: {
    color: palette.textLight,
    fontWeight: '700',
    fontSize: 18,
  },
  sectionAction: {
    color: palette.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  bookRow: {
    paddingRight: spacing.md,
    paddingBottom: 10,
  },
});
