import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCover } from '../components/BookCover';
import {
  deleteDownload,
  getDownloadedBooks,
  getStorageInfo,
  useNetworkStatus,
  type DownloadedBookRecord,
  type StorageInfo,
} from '../offline';
import { palette, radii, spacing } from '../theme';

export default function DownloadsScreen() {
  const router = useRouter();
  const { isOffline } = useNetworkStatus();
  const [books, setBooks] = useState<DownloadedBookRecord[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    count: 0,
    totalBytes: 0,
    formattedSize: '0 KB',
  });
  const [loading, setLoading] = useState(true);

  const loadDownloads = useCallback(async () => {
    try {
      const [downloadedList, info] = await Promise.all([
        getDownloadedBooks(),
        getStorageInfo(),
      ]);
      setBooks(downloadedList);
      setStorageInfo(info);
    } catch (err) {
      console.error('Failed to load downloads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void Promise.resolve().then(async () => {
      if (mounted) await loadDownloads();
    });
    return () => {
      mounted = false;
    };
  }, [loadDownloads]);

  const handleDelete = (book: DownloadedBookRecord) => {
    Alert.alert(
      'Remove Download',
      `Are you sure you want to remove "${book.title}" and its ${book.total_chapters} chapters from your device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDownload(book.book_id);
              await loadDownloads();
            } catch {
              Alert.alert('Error', 'Failed to remove download.');
            }
          },
        },
      ],
    );
  };

  const formatDate = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={24} color={palette.primaryDark} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Downloads</Text>
            <Text style={styles.subtitle}>
              {storageInfo.count} {storageInfo.count === 1 ? 'book' : 'books'} • {storageInfo.formattedSize}
            </Text>
          </View>
        </View>

        {/* Offline Banner */}
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={18} color="#9A3412" />
            <Text style={styles.offlineBannerText}>
              Offline mode active. All books below are ready to read.
            </Text>
          </View>
        )}

        {/* Content */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : books.length === 0 ? (
          <View style={styles.centerContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="download-outline" size={38} color={palette.primary} />
            </View>
            <Text style={styles.emptyTitle}>No downloaded books</Text>
            <Text style={styles.emptyDescription}>
              Download books from their details screen to read anywhere without an internet connection.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.navigate('/(tabs)/discover')}
              style={styles.browseButton}
            >
              <Text style={styles.browseButtonText}>Explore Books</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={books}
            keyExtractor={(item) => item.book_id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.bookCard}>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`Read ${item.title}`}
                  onPress={() => router.push(`/read/${item.book_id}`)}
                  style={styles.bookInfoRow}
                >
                  <View style={styles.coverWrapper}>
                    <BookCover
                      book={{
                        title: item.title,
                        author: item.author || 'Unknown',
                        category: 'Literature',
                        coverColors: ['#0E5C38', '#147D4C'],
                        coverImageUrl: item.cover_url || undefined,
                      }}
                      compact
                      height={90}
                    />
                  </View>

                  <View style={styles.metaCol}>
                    <Text style={styles.bookTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.bookAuthor} numberOfLines={1}>
                      {item.author || 'Unknown Author'}
                    </Text>
                    <View style={styles.badgeRow}>
                      <View style={styles.badge}>
                        <Ionicons name="checkmark-circle" size={13} color="#0E5C38" />
                        <Text style={styles.badgeText}>
                          {item.total_chapters} {item.total_chapters === 1 ? 'ch' : 'chs'}
                        </Text>
                      </View>
                      <Text style={styles.downloadDate}>
                        {formatDate(item.downloaded_at)}
                      </Text>
                    </View>
                  </View>
                </Pressable>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Read ${item.title}`}
                    onPress={() => router.push(`/read/${item.book_id}`)}
                    style={styles.readButton}
                  >
                    <Ionicons name="book-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.readButtonText}>Read</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.title} download`}
                    onPress={() => handleDelete(item)}
                    style={styles.deleteButton}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={18} color="#B91C1C" />
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}
      </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2EBE5',
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.textLight,
  },
  subtitle: {
    fontSize: 13,
    color: palette.muted,
    marginTop: 2,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFEDD5',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
  },
  offlineBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9A3412',
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCEDE2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.textLight,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    fontSize: 14,
    color: palette.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  browseButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  bookCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E6EFE9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bookInfoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  coverWrapper: {
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  metaCol: {
    flex: 1,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.textLight,
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 13,
    color: palette.muted,
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCEDE2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0E5C38',
  },
  downloadDate: {
    fontSize: 11,
    color: palette.muted,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F0F5F2',
  },
  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  readButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 8,
    borderRadius: radii.sm,
    backgroundColor: '#FEE2E2',
  },
});
