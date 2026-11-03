import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { palette, radii, spacing } from '../theme';

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 2.0];
const SLEEP_TIMER_OPTIONS = [
  { label: 'Off', minutes: null },
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '45 minutes', minutes: 45 },
  { label: '60 minutes', minutes: 60 },
];

export function AudioPlayerBar() {
  const {
    isPlaying,
    isPaused,
    currentBook,
    currentChapterNumber,
    currentChapterTitle,
    sentences,
    currentSentenceIndex,
    speechRate,
    availableVoices,
    selectedVoice,
    sleepTimerMinutes,
    sleepTimerRemaining,
    isAudioBarVisible,
    pause,
    resume,
    stop,
    skipNext,
    skipPrevious,
    setSpeechRate,
    setSelectedVoice,
    setSleepTimer,
    toggleAudioBar,
  } = useAudioPlayer();

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'speed' | 'timer' | 'voice'>('speed');

  if (!isAudioBarVisible || !currentBook) {
    return null;
  }

  const progressPercent =
    sentences.length > 0
      ? Math.min(100, Math.round(((currentSentenceIndex + 1) / sentences.length) * 100))
      : 0;

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <>
      {/* Floating Mini Player Bar */}
      <View style={styles.floatingContainer}>
        {/* Progress Bar Line */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>

        <View style={styles.contentRow}>
          {/* Chapter & Status info */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Audio player details"
            onPress={() => setShowOptionsModal(true)}
            style={styles.infoCol}
          >
            <View style={styles.badgeRow}>
              <View style={styles.liveIndicator}>
                <View style={[styles.liveDot, isPlaying && styles.liveDotActive]} />
                <Text style={styles.liveText}>
                  {isPlaying ? 'READING ALOUD' : isPaused ? 'PAUSED' : 'AUDIO READY'}
                </Text>
              </View>
              {sleepTimerRemaining !== null && (
                <Text style={styles.timerBadge}>
                  ⏱ {formatRemaining(sleepTimerRemaining)}
                </Text>
              )}
            </View>

            <Text style={styles.bookTitle} numberOfLines={1}>
              {currentBook.title}
            </Text>
            <Text style={styles.chapterSubtitle} numberOfLines={1}>
              {currentChapterTitle || `Chapter ${currentChapterNumber}`} · Sentence {currentSentenceIndex + 1}/{sentences.length}
            </Text>
          </Pressable>

          {/* Quick Play Controls */}
          <View style={styles.controlsRow}>
            {/* Skip back sentence */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip back one sentence"
              onPress={() => void skipPrevious()}
              style={styles.iconButton}
            >
              <Ionicons name="play-skip-back" size={20} color={palette.textLight} />
            </Pressable>

            {/* Play / Pause Toggle */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause audio narration' : 'Play audio narration'}
              onPress={() => {
                if (isPlaying) {
                  void pause();
                } else {
                  void resume();
                }
              }}
              style={styles.playButton}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={22}
                color="#FFFFFF"
                style={!isPlaying ? { marginLeft: 2 } : undefined}
              />
            </Pressable>

            {/* Skip forward sentence */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip forward one sentence"
              onPress={() => void skipNext()}
              style={styles.iconButton}
            >
              <Ionicons name="play-skip-forward" size={20} color={palette.textLight} />
            </Pressable>

            {/* Options button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Audio settings"
              onPress={() => setShowOptionsModal(true)}
              style={styles.optionsButton}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={palette.muted} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Audio Options Modal (Speed, Voices, Sleep Timer) */}
      <Modal
        visible={showOptionsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowOptionsModal(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Audio Playback</Text>
                <Text style={styles.modalSubtitle}>Device Text-To-Speech & Background Audio</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowOptionsModal(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={palette.textLight} />
              </Pressable>
            </View>

            {/* Tabs */}
            <View style={styles.tabRow}>
              {(['speed', 'timer', 'voice'] as const).map((tab) => (
                <Pressable
                  key={tab}
                  accessibilityRole="button"
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
                >
                  <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
                    {tab === 'speed' ? `Speed (${speechRate}x)` : tab === 'timer' ? 'Sleep Timer' : 'Voice'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Tab: Speed */}
            {activeTab === 'speed' && (
              <View style={styles.tabContent}>
                <Text style={styles.settingExplainer}>
                  Adjust the narration speaking pace without distortion:
                </Text>
                <View style={styles.optionsGrid}>
                  {SPEED_OPTIONS.map((rate) => (
                    <Pressable
                      key={rate}
                      accessibilityRole="button"
                      onPress={() => void setSpeechRate(rate)}
                      style={[styles.pillOption, speechRate === rate && styles.pillOptionActive]}
                    >
                      <Text style={[styles.pillOptionText, speechRate === rate && styles.pillOptionTextActive]}>
                        {rate.toFixed(2).replace(/\.00$/, '')}x
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Tab: Sleep Timer */}
            {activeTab === 'timer' && (
              <View style={styles.tabContent}>
                <Text style={styles.settingExplainer}>
                  Automatically stop playback after a set duration:
                </Text>
                <View style={styles.optionsList}>
                  {SLEEP_TIMER_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.label}
                      accessibilityRole="button"
                      onPress={() => {
                        setSleepTimer(opt.minutes);
                        setShowOptionsModal(false);
                      }}
                      style={[
                        styles.listOptionRow,
                        sleepTimerMinutes === opt.minutes && styles.listOptionRowActive,
                      ]}
                    >
                      <Text style={[styles.listOptionText, sleepTimerMinutes === opt.minutes && styles.listOptionTextActive]}>
                        {opt.label}
                      </Text>
                      {sleepTimerMinutes === opt.minutes && (
                        <Ionicons name="checkmark-circle" size={18} color={palette.primary} />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Tab: Voice Selection */}
            {activeTab === 'voice' && (
              <ScrollView style={styles.voiceScroll} contentContainerStyle={styles.tabContent}>
                <Text style={styles.settingExplainer}>
                  Select from device-installed voices ({currentBook.language}):
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void setSelectedVoice(null)}
                  style={[styles.listOptionRow, selectedVoice === null && styles.listOptionRowActive]}
                >
                  <Text style={[styles.listOptionText, selectedVoice === null && styles.listOptionTextActive]}>
                    System Default
                  </Text>
                  {selectedVoice === null && (
                    <Ionicons name="checkmark-circle" size={18} color={palette.primary} />
                  )}
                </Pressable>

                {availableVoices
                  .filter((v) =>
                    currentBook.language === 'French'
                      ? v.language.startsWith('fr')
                      : v.language.startsWith('en'),
                  )
                  .map((v) => (
                    <Pressable
                      key={v.identifier}
                      accessibilityRole="button"
                      onPress={() => void setSelectedVoice(v.identifier)}
                      style={[
                        styles.listOptionRow,
                        selectedVoice === v.identifier && styles.listOptionRowActive,
                      ]}
                    >
                      <View>
                        <Text style={[styles.listOptionText, selectedVoice === v.identifier && styles.listOptionTextActive]}>
                          {v.name}
                        </Text>
                        <Text style={styles.subVoiceMeta}>{v.language}</Text>
                      </View>
                      {selectedVoice === v.identifier && (
                        <Ionicons name="checkmark-circle" size={18} color={palette.primary} />
                      )}
                    </Pressable>
                  ))}
              </ScrollView>
            )}

            {/* Stop / Dismiss buttons */}
            <View style={styles.modalFooter}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void stop();
                  toggleAudioBar();
                  setShowOptionsModal(false);
                }}
                style={styles.stopButton}
              >
                <Ionicons name="stop-circle-outline" size={18} color="#A9342B" />
                <Text style={styles.stopButtonText}>Stop & Close Player</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2ECE5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 99,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: '#EDF3EF',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: palette.primary,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 12,
  },
  infoCol: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: palette.muted,
  },
  liveDotActive: {
    backgroundColor: '#1E8E5A',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: palette.primaryDark,
    letterSpacing: 0.8,
  },
  timerBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.textLight,
  },
  chapterSubtitle: {
    fontSize: 12,
    color: palette.muted,
    marginTop: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  optionsButton: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.textLight,
  },
  modalSubtitle: {
    fontSize: 12,
    color: palette.muted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#EFF3F0',
    borderRadius: radii.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.muted,
  },
  tabButtonTextActive: {
    color: palette.primaryDark,
    fontWeight: '700',
  },
  tabContent: {
    paddingVertical: spacing.xs,
  },
  settingExplainer: {
    fontSize: 13,
    color: palette.muted,
    marginBottom: spacing.sm,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: spacing.xs,
  },
  pillOption: {
    flex: 1,
    minWidth: 60,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F3F7F5',
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: '#E2EBE5',
  },
  pillOptionActive: {
    borderColor: palette.primary,
    backgroundColor: '#EAF3EE',
  },
  pillOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.textLight,
  },
  pillOptionTextActive: {
    color: palette.primaryDark,
  },
  optionsList: {
    gap: 8,
  },
  listOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#EBF1ED',
  },
  listOptionRowActive: {
    borderColor: palette.primary,
    backgroundColor: '#EAF3EE',
  },
  listOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.textLight,
  },
  listOptionTextActive: {
    color: palette.primaryDark,
    fontWeight: '700',
  },
  subVoiceMeta: {
    fontSize: 11,
    color: palette.muted,
    marginTop: 2,
  },
  voiceScroll: {
    maxHeight: 260,
  },
  modalFooter: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F2',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: '#FDF2F2',
    gap: 8,
  },
  stopButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A9342B',
  },
});

