import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useReaderPreferences, isBookAllowedForAge } from '../../context/ReaderPreferences';
import { useReadingLibrary } from '../../context/ReadingLibraryContext';
import { useCatalog } from '../../context/CatalogContext';
import { useAuth } from '../../context/AuthContext';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { ChapterList } from '../../components/ChapterList';
import { toAppBook, type Book } from '../../data/books';
import {
  fetchChapter,
  fetchReadingProgress,
  saveReadingProgress,
  type ApiBook,
  type ApiChapter,
} from '../../api/client';
import { palette, radii, spacing } from '../../theme';

type ReaderTheme = 'light' | 'sepia' | 'dark';

const THEMES: Record<ReaderTheme, {
  bg: string;
  text: string;
  headerBg: string;
  border: string;
  pillBg: string;
  pillText: string;
  secondaryText: string;
  highlightBg: string;
  highlightText: string;
}> = {
  light: {
    bg: '#FAF8F5',
    text: '#222B25',
    headerBg: '#FFFFFF',
    border: '#E8EFEA',
    pillBg: '#EFF5F1',
    pillText: palette.primaryDark,
    secondaryText: '#627067',
    highlightBg: '#DCF5E7',
    highlightText: '#0E5C38',
  },
  sepia: {
    bg: '#F5EEDB',
    text: '#3D3023',
    headerBg: '#ECE2CA',
    border: '#E2D6BC',
    pillBg: '#E9DCBE',
    pillText: '#59442C',
    secondaryText: '#7D6A53',
    highlightBg: '#E2D3B3',
    highlightText: '#3B2912',
  },
  dark: {
    bg: '#141718',
    text: '#E1E5E7',
    headerBg: '#1D2123',
    border: '#2A3033',
    pillBg: '#252B2E',
    pillText: '#87D3A6',
    secondaryText: '#8E989E',
    highlightBg: '#1B3F2E',
    highlightText: '#A7F3D0',
  },
};

const THEME_STORAGE_KEY = '@libery_reader_theme';
const FONT_SIZE_STORAGE_KEY = '@libery_reader_fontsize';

export default function ReaderScreen() {
  const router = useRouter();
  const { id, chapter: chapterParam, autoPlay } = useLocalSearchParams<{
    id: string;
    chapter?: string;
    autoPlay?: string;
  }>();

  const { preferences } = useReaderPreferences();
  const { books } = useCatalog();
  const { accessToken, isReady, request } = useAuth();
  const { isLoaded: isLibraryLoaded, saveItem } = useReadingLibrary();

  const {
    isPlaying,
    isPaused,
    currentBook: audioBook,
    currentChapterNumber: audioChapterNumber,
    sentences,
    currentSentenceIndex,
    playChapter,
    pause,
    resume,
    setOnAdvanceChapter,
  } = useAudioPlayer();

  const [fetchedBook, setFetchedBook] = useState<Book | null>(null);
  const [fetchFailure, setFetchFailure] = useState<{ id: string; error: string } | null>(null);

  const book = books.find((item) => item.id === id)
    ?? (fetchedBook?.id === id ? fetchedBook : undefined);

  // Chapter state
  const initialChapter = Number(chapterParam) || 1;
  const [chapterNumber, setChapterNumber] = useState(initialChapter);
  const [chapter, setChapter] = useState<ApiChapter | null>(null);
  const [loadingChapter, setLoadingChapter] = useState(true);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [isOfflineCopy, setIsOfflineCopy] = useState(false);

  // Settings
  const [theme, setTheme] = useState<ReaderTheme>('sepia');
  const [fontSize, setFontSize] = useState(19);
  const [showSettings, setShowSettings] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);

  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const scrollOffsetRef = useRef(0);

  // Check if audio is currently narrating this exact book & chapter
  const isAudioActive = isPlaying && audioBook?.id === id && audioChapterNumber === chapterNumber;
  const isAudioPausedThisChapter = isPaused && audioBook?.id === id && audioChapterNumber === chapterNumber;

  // Load user reader preferences from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'sepia' || saved === 'dark') setTheme(saved);
    });
    AsyncStorage.getItem(FONT_SIZE_STORAGE_KEY).then((saved) => {
      if (saved) {
        const size = Number(saved);
        if (size >= 14 && size <= 32) setFontSize(size);
      }
    });
  }, []);

  const changeTheme = (newTheme: ReaderTheme) => {
    setTheme(newTheme);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  const changeFontSize = (delta: number) => {
    setFontSize((prev) => {
      const next = Math.max(14, Math.min(32, prev + delta));
      void AsyncStorage.setItem(FONT_SIZE_STORAGE_KEY, String(next));
      return next;
    });
  };

  // Fetch book metadata if needed
  useEffect(() => {
    if (!id || book || !isReady || !accessToken) return;
    let active = true;
    void request<{ book: ApiBook }>(`/books/${encodeURIComponent(id)}`)
      .then(({ book: result }) => {
        if (active) setFetchedBook(toAppBook(result));
      })
      .catch((error: unknown) => {
        if (active) {
          setFetchFailure({
            id,
            error: error instanceof Error ? error.message : 'Could not load book information.',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [accessToken, book, id, isReady, request]);

  // Initial resume from saved progress if no chapter param was passed in URL
  useEffect(() => {
    if (!id || chapterParam) return;
    let active = true;

    // Check AsyncStorage first for instant offline resume
    AsyncStorage.getItem(`@libery_reading_progress_${id}`).then((local) => {
      if (active && local) {
        try {
          const parsed = JSON.parse(local);
          if (parsed.chapterNumber) setChapterNumber(parsed.chapterNumber);
        } catch {}
      }
    });

    // Sync from API if user is authenticated
    if (accessToken) {
      fetchReadingProgress(id, accessToken).then((prog) => {
        if (active && prog && prog.chapterNumber) {
          setChapterNumber(prog.chapterNumber);
        }
      }).catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [id, chapterParam, accessToken]);

  // Fetch the current chapter text whenever book.id or chapterNumber changes
  useEffect(() => {
    if (!id) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setLoadingChapter(true);
      setChapterError(null);
    });

    const cacheKey = `@libery_chapter_cache_${id}_${chapterNumber}`;

    fetchChapter(id, chapterNumber, accessToken || undefined)
      .then((data) => {
        if (active) {
          setChapter(data);
          setIsOfflineCopy(false);
          setLoadingChapter(false);
          scrollViewRef.current?.scrollTo({ y: 0, animated: false });
          void AsyncStorage.setItem(cacheKey, JSON.stringify(data));
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        AsyncStorage.getItem(cacheKey)
          .then((cached) => {
            if (active && cached) {
              try {
                const parsed = JSON.parse(cached) as ApiChapter;
                setChapter(parsed);
                setIsOfflineCopy(true);
                setLoadingChapter(false);
                scrollViewRef.current?.scrollTo({ y: 0, animated: false });
                return;
              } catch {}
            }
            if (active) {
              setChapterError(
                err instanceof Error
                  ? err.message
                  : 'Could not load chapter content. Check your network connection.',
              );
              setLoadingChapter(false);
            }
          })
          .catch(() => {
            if (active) {
              setChapterError('Could not load chapter content.');
              setLoadingChapter(false);
            }
          });
      });

    return () => {
      active = false;
    };
  }, [id, chapterNumber, accessToken]);

  // Auto-play audio if triggered with ?autoPlay=1
  useEffect(() => {
    if (autoPlay === '1' && book && chapter && !isPlaying) {
      void playChapter(book, {
        chapterNumber,
        title: chapter.title,
        text: chapter.text,
        audioUrl: chapter.audioUrl,
      });
    }
  }, [autoPlay, book, chapter, chapterNumber, isPlaying, playChapter]);

  // Auto-save reading position on chapter change and update library progress
  const saveProgressState = useCallback((targetChapter: number, textPos = 0) => {
    if (!id) return;
    const progressData = {
      chapterNumber: targetChapter,
      textPosition: textPos,
      audioPositionSeconds: 0,
    };

    void AsyncStorage.setItem(`@libery_reading_progress_${id}`, JSON.stringify(progressData));

    if (accessToken) {
      void saveReadingProgress(id, progressData, accessToken).catch(() => {});
    }

    if (book && isLibraryLoaded) {
      const total = book.totalChapters || 1;
      const isFinished = targetChapter >= total;
      const progressPercent = Math.min(100, Math.round((targetChapter / total) * 100));

      void saveItem(book, {
        status: isFinished ? 'finished' : 'reading',
        progress: progressPercent,
      }).catch(() => {});
    }
  }, [id, accessToken, book, isLibraryLoaded, saveItem]);

  const goToChapter = useCallback((newChapterNum: number) => {
    setChapterNumber(newChapterNum);
    saveProgressState(newChapterNum, 0);
  }, [saveProgressState]);

  // Wire auto-advance for audio playback
  useEffect(() => {
    setOnAdvanceChapter((nextChap) => {
      goToChapter(nextChap);
    });
  }, [setOnAdvanceChapter, goToChapter]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  };

  const currentTheme = THEMES[theme];
  const totalChapters = book?.totalChapters || 1;
  const canGoPrevious = chapterNumber > 1;
  const canGoNext = chapterNumber < totalChapters;

  if (book && !isBookAllowedForAge(book.ageRating, preferences.ageGroup)) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: currentTheme.bg }]}>
        <View style={styles.centerContainer}>
          <Ionicons name="lock-closed-outline" size={48} color={palette.muted} />
          <Text style={[styles.titleText, { color: currentTheme.text }]}>Age Restricted Content</Text>
          <Text style={[styles.metaText, { color: currentTheme.secondaryText }]}>
            This title is restricted according to your profile age settings.
          </Text>
          <Link href={`/book/${id}`} style={styles.backButton}>Return to Book</Link>
        </View>
      </SafeAreaView>
    );
  }

  if (!book && fetchFailure) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: currentTheme.bg }]}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#A9342B" />
          <Text style={[styles.titleText, { color: currentTheme.text }]}>Could not open book</Text>
          <Text style={[styles.metaText, { color: currentTheme.secondaryText }]}>{fetchFailure.error}</Text>
          <Link href="/" style={styles.backButton}>Return to Home</Link>
        </View>
      </SafeAreaView>
    );
  }

  const toggleAudio = () => {
    if (isAudioActive) {
      void pause();
    } else if (isAudioPausedThisChapter) {
      void resume();
    } else if (book && chapter) {
      void playChapter(book, {
        chapterNumber,
        title: chapter.title,
        text: chapter.text,
        audioUrl: chapter.audioUrl,
      });
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: currentTheme.bg }]}>
      {/* Top Navigation Bar */}
      <View style={[styles.header, { backgroundColor: currentTheme.headerBg, borderBottomColor: currentTheme.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to book details"
          onPress={() => router.push(`/book/${id}`)}
          style={styles.headerIconButton}
        >
          <Ionicons name="chevron-back" size={24} color={currentTheme.text} />
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerBookTitle, { color: currentTheme.text }]} numberOfLines={1}>
            {book?.title || 'Libery Reader'}
          </Text>
          <Text style={[styles.headerChapterTitle, { color: currentTheme.secondaryText }]} numberOfLines={1}>
            {chapter?.title ? chapter.title : `Chapter ${chapterNumber}`}
          </Text>
        </View>

        {/* Audio, TOC, and Settings Toggles */}
        <View style={styles.headerRightActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isAudioActive ? 'Pause audio narration' : 'Listen to chapter aloud'}
            onPress={toggleAudio}
            style={[
              styles.headerIconButton,
              isAudioActive && { backgroundColor: currentTheme.highlightBg },
            ]}
          >
            <Ionicons
              name={isAudioActive ? 'volume-high' : 'headset-outline'}
              size={20}
              color={isAudioActive ? palette.primary : currentTheme.text}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open table of contents"
            onPress={() => setShowChapterModal(true)}
            style={styles.headerIconButton}
          >
            <Ionicons name="list" size={22} color={currentTheme.text} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Customize reader font and theme"
            onPress={() => setShowSettings((prev) => !prev)}
            style={[styles.headerIconButton, showSettings && { backgroundColor: currentTheme.pillBg }]}
          >
            <Ionicons name="text-outline" size={20} color={currentTheme.text} />
          </Pressable>
        </View>
      </View>

      {/* Reader Appearance & Font Settings Panel */}
      {showSettings && (
        <View style={[styles.settingsPanel, { backgroundColor: currentTheme.headerBg, borderBottomColor: currentTheme.border }]}>
          {/* Theme selector */}
          <View style={styles.settingsRow}>
            <Text style={[styles.settingsLabel, { color: currentTheme.secondaryText }]}>Theme</Text>
            <View style={styles.themeButtonGroup}>
              {(['light', 'sepia', 'dark'] as ReaderTheme[]).map((t) => (
                <Pressable
                  key={t}
                  accessibilityRole="button"
                  accessibilityLabel={`${t} theme`}
                  onPress={() => changeTheme(t)}
                  style={[
                    styles.themeButton,
                    { backgroundColor: THEMES[t].bg, borderColor: theme === t ? palette.primary : THEMES[t].border },
                    theme === t && styles.themeButtonActive,
                  ]}
                >
                  <Text style={[styles.themeButtonText, { color: THEMES[t].text }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Font Size controls */}
          <View style={styles.settingsRow}>
            <Text style={[styles.settingsLabel, { color: currentTheme.secondaryText }]}>Font Size</Text>
            <View style={styles.fontControlsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease font size"
                disabled={fontSize <= 14}
                onPress={() => changeFontSize(-2)}
                style={[styles.fontChangeButton, { backgroundColor: currentTheme.pillBg }]}
              >
                <Text style={[styles.fontChangeButtonText, { color: currentTheme.text }]}>A−</Text>
              </Pressable>
              <Text style={[styles.fontSizeDisplay, { color: currentTheme.text }]}>{fontSize}px</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase font size"
                disabled={fontSize >= 32}
                onPress={() => changeFontSize(2)}
                style={[styles.fontChangeButton, { backgroundColor: currentTheme.pillBg }]}
              >
                <Text style={[styles.fontChangeButtonText, { color: currentTheme.text }]}>A+</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Main Chapter Content */}
      {loadingChapter ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.loadingText, { color: currentTheme.secondaryText }]}>
            Loading Chapter {chapterNumber}…
          </Text>
        </View>
      ) : chapterError ? (
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={48} color={currentTheme.secondaryText} />
          <Text style={[styles.titleText, { color: currentTheme.text }]}>Chapter not loaded</Text>
          <Text style={[styles.metaText, { color: currentTheme.secondaryText }]}>{chapterError}</Text>
          {book?.sourceUrl && (
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL(book.sourceUrl!)}
              style={styles.actionPill}
            >
              <Text style={styles.actionPillText}>Read at Source ({book.sourceName || 'Gutenberg'})</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          showsVerticalScrollIndicator={false}
        >
          {/* Chapter Heading Banner */}
          <View style={styles.chapterHeaderBox}>
            <Text style={[styles.chapterNumberEyebrow, { color: currentTheme.pillText }]}>
              CHAPTER {chapterNumber} OF {totalChapters}
            </Text>
            <Text style={[styles.chapterMainTitle, { color: currentTheme.text }]}>
              {chapter?.title}
            </Text>
            {Boolean(chapter?.wordCount) && (
              <Text style={[styles.wordCountMeta, { color: currentTheme.secondaryText }]}>
                {chapter?.wordCount.toLocaleString()} words · ~{Math.max(1, Math.round((chapter?.wordCount || 0) / 220))} min read
              </Text>
            )}
          </View>

          {/* Offline Cached Indicator */}
          {isOfflineCopy && (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={14} color="#D97706" />
              <Text style={styles.offlineBannerText}>Reading offline saved copy</Text>
            </View>
          )}

          {/* Chapter Body Text with Real-Time Spoken Sentence Highlighting */}
          {isAudioActive && sentences.length > 0 ? (
            <View style={styles.sentencesContainer}>
              {sentences.map((sentence, idx) => {
                const isCurrent = idx === currentSentenceIndex;
                return (
                  <Pressable
                    key={idx}
                    accessibilityRole="button"
                    accessibilityLabel={`Sentence ${idx + 1}`}
                    onPress={() => {
                      if (book && chapter) {
                        void playChapter(
                          book,
                          {
                            chapterNumber,
                            title: chapter.title,
                            text: chapter.text,
                            audioUrl: chapter.audioUrl,
                          },
                          idx,
                        );
                      }
                    }}
                    style={[
                      styles.sentenceWrapper,
                      isCurrent && {
                        backgroundColor: currentTheme.highlightBg,
                        borderRadius: 4,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bodyText,
                        {
                          color: isCurrent ? currentTheme.highlightText : currentTheme.text,
                          fontSize,
                          lineHeight: Math.round(fontSize * 1.68),
                          fontWeight: isCurrent ? '600' : '400',
                        },
                      ]}
                    >
                      {sentence}{' '}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text
              style={[
                styles.bodyText,
                {
                  color: currentTheme.text,
                  fontSize,
                  lineHeight: Math.round(fontSize * 1.68),
                },
              ]}
              selectable
            >
              {chapter?.text}
            </Text>
          )}

          {/* End of Chapter Navigation Prompts */}
          <View style={[styles.endOfChapterNav, { borderTopColor: currentTheme.border }]}>
            <Text style={[styles.endOfChapterPrompt, { color: currentTheme.secondaryText }]}>
              End of Chapter {chapterNumber}
            </Text>
            <View style={styles.bottomNavRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go to previous chapter"
                disabled={!canGoPrevious}
                onPress={() => goToChapter(chapterNumber - 1)}
                style={[
                  styles.navButton,
                  { backgroundColor: currentTheme.headerBg, borderColor: currentTheme.border },
                  !canGoPrevious && styles.navButtonDisabled,
                ]}
              >
                <Ionicons name="arrow-back" size={16} color={canGoPrevious ? currentTheme.text : currentTheme.secondaryText} />
                <Text style={[styles.navButtonText, { color: canGoPrevious ? currentTheme.text : currentTheme.secondaryText }]}>
                  Previous
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={canGoNext ? 'Go to next chapter' : 'Finish reading book'}
                onPress={() => {
                  if (canGoNext) {
                    goToChapter(chapterNumber + 1);
                  } else {
                    saveProgressState(totalChapters, 100);
                    router.push(`/book/${id}`);
                  }
                }}
                style={[styles.navButton, styles.navButtonPrimary]}
              >
                <Text style={styles.navButtonPrimaryText}>
                  {canGoNext ? 'Next Chapter' : 'Complete Book'}
                </Text>
                <Ionicons name={canGoNext ? 'arrow-forward' : 'checkmark-done'} size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Floating Bottom Quick Bar */}
      <View style={[styles.bottomBar, { backgroundColor: currentTheme.headerBg, borderTopColor: currentTheme.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous chapter"
          disabled={!canGoPrevious}
          onPress={() => goToChapter(chapterNumber - 1)}
          style={[styles.barButton, !canGoPrevious && { opacity: 0.3 }]}
        >
          <Ionicons name="play-skip-back" size={18} color={currentTheme.text} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open chapters table of contents"
          onPress={() => setShowChapterModal(true)}
          style={styles.barChapterPill}
        >
          <Text style={[styles.barChapterText, { color: currentTheme.text }]}>
            Ch. {chapterNumber} / {totalChapters}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next chapter"
          disabled={!canGoNext}
          onPress={() => goToChapter(chapterNumber + 1)}
          style={[styles.barButton, !canGoNext && { opacity: 0.3 }]}
        >
          <Ionicons name="play-skip-forward" size={18} color={currentTheme.text} />
        </Pressable>
      </View>

      {/* Table of Contents Modal */}
      <Modal
        visible={showChapterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowChapterModal(false)}
      >
        <SafeAreaView style={[styles.safeArea, { backgroundColor: '#FFFFFF' }]}>
          <ChapterList
            bookId={id!}
            currentChapter={chapterNumber}
            onClose={() => setShowChapterModal(false)}
            onSelectChapter={(num) => {
              setShowChapterModal(false);
              goToChapter(num);
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  headerBookTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerChapterTitle: {
    fontSize: 12,
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsPanel: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: 12,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  themeButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1.5,
  },
  themeButtonActive: {
    borderColor: palette.primary,
  },
  themeButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fontControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fontChangeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontChangeButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  fontSizeDisplay: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 80,
  },
  chapterHeaderBox: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  offlineBannerText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '700',
  },
  chapterNumberEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  chapterMainTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 6,
  },
  wordCountMeta: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  bodyText: {
    letterSpacing: 0.2,
  },
  sentencesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sentenceWrapper: {
    marginVertical: 1,
  },
  endOfChapterNav: {
    marginTop: spacing.xxl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  endOfChapterPrompt: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  bottomNavRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  navButton: {
    flex: 1,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  navButtonPrimary: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  navButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomBar: {
    minHeight: 52,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  barButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barChapterPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  barChapterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  metaText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionPill: {
    backgroundColor: palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    marginTop: 8,
  },
  actionPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  backButton: {
    color: palette.primary,
    fontWeight: '700',
    marginTop: 12,
  },
});
