import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCover } from '../../components/BookCover';
import { useAuth } from '../../context/AuthContext';
import { useReadingLibrary, type LibraryStatus } from '../../context/ReadingLibraryContext';
import { getStorageInfo, useNetworkStatus } from '../../offline';
import { palette, radii, spacing } from '../../theme';

type Shelf = LibraryStatus | 'favorites';

const shelves: { id: Shelf; label: string; tone: string }[] = [
  { id: 'reading', label: 'Reading', tone: '#E1F4E7' },
  { id: 'want_to_read', label: 'Want to read', tone: '#F2E7CB' },
  { id: 'finished', label: 'Finished', tone: '#E2EBFF' },
  { id: 'favorites', label: 'Favorites', tone: '#F4DDE5' },
];

export default function LibraryScreen() {
  const router = useRouter();
  const { items, isLoaded, error } = useReadingLibrary();
  const { user } = useAuth();
  const { isOffline } = useNetworkStatus();
  const [downloadCount, setDownloadCount] = useState(0);
  const [selectedShelf, setSelectedShelf] = useState<Shelf>('reading');

  useEffect(() => {
    void getStorageInfo()
      .then((info) => setDownloadCount(info.count))
      .catch(() => {});
  }, []);

  const selectedItems = items.filter((item) => selectedShelf === 'favorites'
    ? item.isFavorite
    : item.status === selectedShelf);

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          {user ? 'Your reading list syncs with your Libery account.' : 'Your reading list is saved on this device.'}
        </Text>

        {/* Offline Alert Banner */}
        {isOffline && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/downloads')}
            style={styles.offlineBanner}
          >
            <Ionicons name="cloud-offline-outline" size={18} color="#9A3412" />
            <Text style={styles.offlineBannerText}>
              Offline mode active. Tap to open your Downloaded books ({downloadCount}).
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#9A3412" />
          </Pressable>
        )}

        {/* Downloads Quick Shortcut */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open downloaded books"
          onPress={() => router.push('/downloads')}
          style={styles.downloadsShortcut}
        >
          <View style={styles.downloadsShortcutLeft}>
            <View style={styles.downloadsIconCircle}>
              <Ionicons name="cloud-download-outline" size={18} color={palette.primary} />
            </View>
            <View>
              <Text style={styles.downloadsShortcutTitle}>Downloaded Books</Text>
              <Text style={styles.downloadsShortcutSubtitle}>
                {downloadCount} {downloadCount === 1 ? 'book' : 'books'} saved on this device
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.muted} />
        </Pressable>

        <View style={styles.grid}>
          {shelves.map((shelf) => {
            const count = shelf.id === 'favorites'
              ? items.filter((item) => item.isFavorite).length
              : items.filter((item) => item.status === shelf.id).length;
            const selected = selectedShelf === shelf.id;
            return (
              <Pressable
                key={shelf.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSelectedShelf(shelf.id)}
                style={[styles.shelfCard, { backgroundColor: shelf.tone }, selected && styles.selectedShelf]}
              >
                <Text style={styles.shelfLabel}>{shelf.label}</Text>
                <Text style={styles.shelfCount}>{count}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{shelves.find((shelf) => shelf.id === selectedShelf)?.label}</Text>
          <Text style={styles.sectionAction}>{selectedItems.length} {selectedItems.length === 1 ? 'book' : 'books'}</Text>
        </View>

        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {!isLoaded && <Text style={styles.emptyDescription}>Loading your library…</Text>}
        {isLoaded && selectedItems.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nothing on this shelf yet</Text>
            <Text style={styles.emptyDescription}>Save books from Discover and they’ll appear here.</Text>
            <Link href="/discover" style={styles.discoverLink}>Explore books</Link>
          </View>
        )}

        {selectedItems.map((item) => (
          <Link key={item.book.id} href={`/book/${item.book.id}`} asChild>
            <Pressable accessibilityRole="link" style={styles.bookRow}>
              <View style={styles.cover}>
                <BookCover book={item.book} compact height={88} />
              </View>
              <View style={styles.metaWrap}>
                <Text style={styles.bookTitle} numberOfLines={2}>{item.book.title}</Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>{item.book.author}</Text>
                <Text style={styles.statusLabel}>
                  {item.status === 'want_to_read' ? 'Want to read' : item.status === 'finished' ? 'Finished' : 'Reading'}
                  {item.isFavorite ? ' · Favorite' : ''}
                </Text>
                {item.status === 'reading' && (
                  <View style={styles.progressRow}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{item.progress}%</Text>
                  </View>
                )}
              </View>
            </Pressable>
          </Link>
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
  },
  subtitle: {
    color: palette.muted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFEDD5',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: spacing.md,
  },
  offlineBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9A3412',
    flex: 1,
  },
  downloadsShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FAF4',
    borderWidth: 1,
    borderColor: '#D1EADE',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  downloadsShortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  downloadsIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DCEDE2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadsShortcutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.primaryDark,
  },
  downloadsShortcutSubtitle: {
    fontSize: 11,
    color: palette.muted,
    marginTop: 1,
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
    borderWidth: 2,
    borderColor: 'transparent',
    padding: spacing.md,
    marginBottom: 12,
  },
  selectedShelf: {
    borderColor: palette.primary,
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
    overflow: 'hidden',
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
  statusLabel: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
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
  discoverLink: {
    color: palette.primary,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  error: {
    color: '#A9342B',
    marginBottom: spacing.md,
  },
});
