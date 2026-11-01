import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ComponentRef } from 'react';

import { BookCard } from '../../components/BookCard';
import { useReaderPreferences, isBookAllowedForAge } from '../../context/ReaderPreferences';
import { useCatalog } from '../../context/CatalogContext';
import { palette, radii, spacing } from '../../theme';

const catalogCategories = [
  'Arts & Music',
  'Biography',
  'Business & Economics',
  'Children & Young Adult',
  'Drama',
  'Education',
  'Fiction',
  'Health & Medicine',
  'History',
  'Language & Linguistics',
  'Law',
  'Literature',
  'Philosophy',
  'Poetry',
  'Religion',
  'Science & Technology',
  'Society & Politics',
  'Travel & Places',
];

export default function DiscoverScreen() {
  const { focusSearch, q } = useLocalSearchParams<{ focusSearch?: string; q?: string }>();
  const initialQuery = typeof q === 'string' ? q : '';
  return <DiscoverContent key={initialQuery} initialQuery={initialQuery} focusSearch={focusSearch} />;
}

function DiscoverContent({
  initialQuery,
  focusSearch,
}: {
  initialQuery: string;
  focusSearch?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const initializedSearch = useRef(false);
  const searchInput = useRef<ComponentRef<typeof TextInput>>(null);
  const { width: windowWidth } = useWindowDimensions();
  const { preferences } = useReaderPreferences();
  const { books, total, isCloudCatalog, isLoading, error, hasMore, loadMore, refresh, search } = useCatalog();
  const columns = windowWidth >= 840 ? 4 : windowWidth >= 600 ? 3 : 2;
  const cardWidth = Math.floor((windowWidth - spacing.md * 2 - 14 * (columns - 1)) / columns);
  const availableBooks = books.filter((book) =>
    isBookAllowedForAge(book.ageRating, preferences.ageGroup)
    && preferences.languages.includes(book.language),
  );
  const availableFilters = ['All', ...Array.from(new Set([
    ...availableBooks.map((book) => book.category),
    ...(isCloudCatalog ? catalogCategories : []),
    ...(selectedCategory === 'All' ? [] : [selectedCategory]),
  ]))];
  const activeCategory = availableFilters.includes(selectedCategory) ? selectedCategory : 'All';
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const results = availableBooks.filter((book) => {
    const matchesCategory = activeCategory === 'All' || book.category === activeCategory;
    const searchableText = `${book.title} ${book.author} ${book.provider} ${book.category} ${book.language}`.toLocaleLowerCase();
    return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery));
  });

  useEffect(() => {
    if (!isCloudCatalog) {
      initializedSearch.current = false;
      return;
    }
    if (!initializedSearch.current) {
      initializedSearch.current = true;
      return;
    }
    const timer = setTimeout(() => {
      void search(query, activeCategory);
    }, 250);
    return () => clearTimeout(timer);
  }, [activeCategory, isCloudCatalog, query, search]);

  useEffect(() => {
    if (focusSearch !== '1') return;
    const timer = setTimeout(() => {
      searchInput.current?.focus();
      router.setParams({ focusSearch: undefined, q: undefined });
    }, 150);
    return () => clearTimeout(timer);
  }, [focusSearch]);

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {!isCloudCatalog && (
          <View style={styles.catalogNotice}>
            <Text style={styles.catalogNoticeText}>Showing sample books. Sign in to browse your MongoDB Atlas library.</Text>
          </View>
        )}
        {error && (
          <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.catalogNotice}>
            <Text style={styles.catalogNoticeText}>{error} Tap to retry.</Text>
          </Pressable>
        )}

        <View style={styles.searchWrap}>
          <TextInput
            accessibilityLabel="Search books"
            ref={searchInput}
            placeholder="Search titles, authors, providers..."
            style={styles.searchInput}
            placeholderTextColor={palette.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {availableFilters.map((filter) => (
            <Pressable
              key={filter}
              accessibilityRole="button"
              accessibilityState={{ selected: activeCategory === filter }}
              onPress={() => setSelectedCategory(filter)}
              style={[styles.filterChip, activeCategory === filter && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, activeCategory === filter && styles.filterTextActive]}>{filter}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{query || activeCategory !== 'All' ? 'Search results' : 'Trending now'}</Text>
          <Text style={styles.sectionAction}>
            {isCloudCatalog ? total : results.length} {(isCloudCatalog ? total : results.length) === 1 ? 'book' : 'books'}
          </Text>
        </View>
        <View style={styles.bookGrid}>
          {results.map((book) => (
            <View key={book.id} style={[styles.bookGridItem, { width: cardWidth }]}>
              <BookCard book={book} compact width={cardWidth} />
            </View>
          ))}
        </View>
        {hasMore && (
          <Pressable accessibilityRole="button" disabled={isLoading} onPress={() => void loadMore()} style={styles.loadMoreButton}>
            <Text style={styles.loadMoreText}>{isLoading ? 'Loading…' : 'Load more books'}</Text>
          </Pressable>
        )}
        {results.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No books found</Text>
            <Text style={styles.emptyDescription}>Try another title, author, provider, or category.</Text>
          </View>
        )}
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
  searchWrap: {
    backgroundColor: '#EEF4F1',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#D8E4DB',
  },
  searchInput: {
    height: 48,
    color: palette.textLight,
    fontSize: 15,
  },
  filterRow: {
    paddingBottom: 8,
    marginBottom: spacing.lg,
  },
  filterChip: {
    backgroundColor: '#EFF5F1',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: palette.primary,
  },
  filterText: {
    color: palette.textLight,
    fontWeight: '700',
    fontSize: 12,
  },
  filterTextActive: {
    color: '#fff',
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
  bookGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bookGridItem: {
    marginBottom: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#EFF5F1',
    borderRadius: radii.lg,
  },
  emptyTitle: {
    color: palette.textLight,
    fontSize: 17,
    fontWeight: '700',
  },
  emptyDescription: {
    color: palette.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  catalogNotice: {
    backgroundColor: '#FFF5DF',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  catalogNoticeText: {
    color: '#684D1A',
    fontSize: 13,
    lineHeight: 19,
  },
  loadMoreButton: {
    minHeight: 48,
    marginTop: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#EAF3EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    color: palette.primaryDark,
    fontWeight: '700',
  },
});
