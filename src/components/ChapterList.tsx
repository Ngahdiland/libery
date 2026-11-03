import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchBookChapters, type ApiChapterSummary } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { palette, radii, spacing } from '../theme';

type ChapterListProps = {
  bookId: string;
  currentChapter?: number;
  onSelectChapter: (chapterNumber: number) => void;
  onClose?: () => void;
};

export function ChapterList({
  bookId,
  currentChapter,
  onSelectChapter,
  onClose,
}: ChapterListProps) {
  const { accessToken } = useAuth();
  const [chapters, setChapters] = useState<ApiChapterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setLoading(true);
      setError(null);
    });

    const cacheKey = `@libery_chapters_cache_${bookId}`;

    fetchBookChapters(bookId, accessToken || undefined)
      .then((data) => {
        if (active) {
          setChapters(data.chapters);
          setLoading(false);
          void AsyncStorage.setItem(cacheKey, JSON.stringify(data.chapters));
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        AsyncStorage.getItem(cacheKey)
          .then((cached) => {
            if (active && cached) {
              try {
                const parsed = JSON.parse(cached) as ApiChapterSummary[];
                setChapters(parsed);
                setLoading(false);
                return;
              } catch {}
            }
            if (active) {
              setError(err instanceof Error ? err.message : 'Could not load chapter index.');
              setLoading(false);
            }
          })
          .catch(() => {
            if (active) {
              setError('Could not load chapter index.');
              setLoading(false);
            }
          });
      });

    return () => {
      active = false;
    };
  }, [bookId, accessToken]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="list" size={20} color={palette.primaryDark} />
          <Text style={styles.title}>Table of Contents</Text>
          {chapters.length > 0 && (
            <Text style={styles.countBadge}>{chapters.length} chapters</Text>
          )}
        </View>
        {Boolean(onClose) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close chapter list"
            onPress={onClose}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={22} color={palette.textLight} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={palette.primary} size="large" />
          <Text style={styles.statusText}>Loading chapters…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={36} color="#A9342B" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : chapters.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="book-outline" size={36} color={palette.muted} />
          <Text style={styles.statusText}>No chapters ingested yet for this book.</Text>
        </View>
      ) : (
        <FlatList
          data={chapters}
          keyExtractor={(item) => String(item.chapterNumber)}
          contentContainerStyle={styles.listContent}
          initialScrollIndex={
            currentChapter && currentChapter > 4 && currentChapter <= chapters.length
              ? Math.max(0, currentChapter - 2)
              : undefined
          }
          getItemLayout={(_data, index) => ({
            length: 64,
            offset: 64 * index,
            index,
          })}
          renderItem={({ item }) => {
            const isSelected = item.chapterNumber === currentChapter;
            const approxMinutes = Math.max(1, Math.round(item.wordCount / 220));

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, chapter ${item.chapterNumber}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelectChapter(item.chapterNumber)}
                style={[styles.chapterItem, isSelected && styles.chapterItemSelected]}
              >
                <View style={styles.chapterNumCircle}>
                  <Text style={[styles.chapterNumText, isSelected && styles.chapterNumTextSelected]}>
                    {item.chapterNumber}
                  </Text>
                </View>
                <View style={styles.chapterInfo}>
                  <Text
                    style={[styles.chapterTitle, isSelected && styles.chapterTitleSelected]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.chapterMeta}>
                    {item.wordCount.toLocaleString()} words · ~{approxMinutes} min read
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={18} color={palette.primary} />
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2EE',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.textLight,
  },
  countBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.primaryDark,
    backgroundColor: '#EAF3EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  closeButton: {
    padding: 6,
    borderRadius: 999,
  },
  centered: {
    padding: spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  statusText: {
    color: palette.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: '#A9342B',
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: spacing.xs,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F8F6',
  },
  chapterItemSelected: {
    backgroundColor: '#F0F8F3',
  },
  chapterNumCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF3F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterNumText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textLight,
  },
  chapterNumTextSelected: {
    color: palette.primary,
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.textLight,
    marginBottom: 2,
  },
  chapterTitleSelected: {
    color: palette.primaryDark,
    fontWeight: '700',
  },
  chapterMeta: {
    fontSize: 12,
    color: palette.muted,
  },
});
