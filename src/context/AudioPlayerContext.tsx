import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { Book } from '../data/books';
import { BackgroundAudioSession } from '../utils/backgroundAudio';
import { SILENT_AUDIO_URI, splitTextIntoSentences } from '../utils/textToSpeech';

export type SpeechVoice = {
  identifier: string;
  name: string;
  language: string;
  quality?: string;
};

export type AudioPlayerContextValue = {
  isPlaying: boolean;
  isPaused: boolean;
  currentBook: Book | null;
  currentChapterNumber: number;
  currentChapterTitle: string;
  sentences: string[];
  currentSentenceIndex: number;
  speechRate: number;
  availableVoices: SpeechVoice[];
  selectedVoice: string | null;
  sleepTimerMinutes: number | null;
  sleepTimerRemaining: number | null;
  hasAudioUrl: boolean;
  isAudioBarVisible: boolean;

  playChapter: (
    book: Book,
    chapter: { chapterNumber: number; title: string; text: string; audioUrl?: string },
    startSentenceIndex?: number,
  ) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;
  setSpeechRate: (rate: number) => Promise<void>;
  setSelectedVoice: (voiceId: string | null) => Promise<void>;
  setSleepTimer: (minutes: number | null) => void;
  toggleAudioBar: () => void;
  onAdvanceChapter?: (nextChapterNumber: number) => void;
  setOnAdvanceChapter: (fn: (nextChapterNumber: number) => void) => void;
};

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

const SPEECH_RATE_STORAGE_KEY = '@libery_audio_speech_rate';
const SPEECH_VOICE_STORAGE_KEY = '@libery_audio_voice';

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [currentChapterNumber, setCurrentChapterNumber] = useState(1);
  const [currentChapterTitle, setCurrentChapterTitle] = useState('');
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [speechRate, setSpeechRateState] = useState(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechVoice[]>([]);
  const [selectedVoice, setSelectedVoiceState] = useState<string | null>(null);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [hasAudioUrl, setHasAudioUrl] = useState(false);
  const [isAudioBarVisible, setIsAudioBarVisible] = useState(false);

  // Audio playback state
  const isPlayingRef = useRef(false);
  const sentencesRef = useRef<string[]>([]);
  const currentIndexRef = useRef(0);
  const speechRateRef = useRef(1.0);
  const selectedVoiceRef = useRef<string | null>(null);
  const onAdvanceChapterRef = useRef<((nextChapter: number) => void) | null>(null);
  const sleepTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speakSentenceAtRef = useRef<(idx: number) => Promise<void>>(() => Promise.resolve());
  const stopRef = useRef<() => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    sentencesRef.current = sentences;
  }, [sentences]);

  useEffect(() => {
    currentIndexRef.current = currentSentenceIndex;
  }, [currentSentenceIndex]);

  useEffect(() => {
    speechRateRef.current = speechRate;
  }, [speechRate]);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Load available TTS voices and saved settings on mount
  useEffect(() => {
    let active = true;

    Speech.getAvailableVoicesAsync()
      .then((voices) => {
        if (!active) return;
        const mapped = voices.map((v) => ({
          identifier: v.identifier,
          name: v.name,
          language: v.language,
          quality: v.quality,
        }));
        setAvailableVoices(mapped);
      })
      .catch(() => {});

    AsyncStorage.getItem(SPEECH_RATE_STORAGE_KEY).then((saved) => {
      if (active && saved) {
        const rate = Number(saved);
        if (rate >= 0.5 && rate <= 2.5) {
          setSpeechRateState(rate);
          speechRateRef.current = rate;
        }
      }
    });

    AsyncStorage.getItem(SPEECH_VOICE_STORAGE_KEY).then((saved) => {
      if (active && saved) {
        setSelectedVoiceState(saved);
        selectedVoiceRef.current = saved;
      }
    });

    void BackgroundAudioSession.initAudioMode();

    return () => {
      active = false;
      BackgroundAudioSession.dispose();
    };
  }, []);

  // Background keep-alive helper
  const startBackgroundAudioSession = async () => {
    await BackgroundAudioSession.startKeepAlive(SILENT_AUDIO_URI);
  };

  const stopBackgroundAudioSession = async () => {
    await BackgroundAudioSession.stopKeepAlive();
  };

  const stop = useCallback(async () => {
    setIsPlaying(false);
    setIsPaused(false);
    isPlayingRef.current = false;
    try {
      await Speech.stop();
    } catch {}
    await stopBackgroundAudioSession();
  }, []);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  // Sleep timer interval countdown
  useEffect(() => {
    if (sleepTimerMinutes === null) {
      if (sleepTimerIntervalRef.current) {
        clearInterval(sleepTimerIntervalRef.current);
        sleepTimerIntervalRef.current = null;
      }
      return;
    }

    const interval = setInterval(() => {
      setSleepTimerRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          void stopRef.current();
          setSleepTimerMinutes(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    sleepTimerIntervalRef.current = interval;

    return () => {
      clearInterval(interval);
    };
  }, [sleepTimerMinutes]);

  // Speaks the utterance at index `idx` and chains next
  const speakSentenceAt = useCallback(async (idx: number) => {
    const list = sentencesRef.current;
    if (idx >= list.length) {
      if (onAdvanceChapterRef.current) {
        onAdvanceChapterRef.current(currentChapterNumber + 1);
      } else {
        setIsPlaying(false);
        setIsPaused(false);
        await stopBackgroundAudioSession();
      }
      return;
    }

    const utterance = list[idx];
    if (!utterance || !utterance.trim()) {
      setCurrentSentenceIndex(idx + 1);
      currentIndexRef.current = idx + 1;
      void speakSentenceAtRef.current(idx + 1);
      return;
    }

    setCurrentSentenceIndex(idx);
    currentIndexRef.current = idx;

    try {
      await Speech.stop();
    } catch {}

    const voiceOptions: Speech.SpeechOptions = {
      rate: speechRateRef.current,
      pitch: 1.0,
      language: currentBook?.language === 'French' ? 'fr-FR' : 'en-US',
      ...(selectedVoiceRef.current ? { voice: selectedVoiceRef.current } : {}),
      onDone: () => {
        if (isPlayingRef.current) {
          const nextIdx = idx + 1;
          setCurrentSentenceIndex(nextIdx);
          currentIndexRef.current = nextIdx;
          void speakSentenceAtRef.current(nextIdx);
        }
      },
      onStopped: () => {},
      onError: () => {
        if (isPlayingRef.current) {
          const nextIdx = idx + 1;
          void speakSentenceAtRef.current(nextIdx);
        }
      },
    };

    Speech.speak(utterance, voiceOptions);
  }, [currentBook?.language, currentChapterNumber]);

  useEffect(() => {
    speakSentenceAtRef.current = speakSentenceAt;
  }, [speakSentenceAt]);

  const playChapter = async (
    book: Book,
    chapter: { chapterNumber: number; title: string; text: string; audioUrl?: string },
    startSentenceIndex = 0,
  ) => {
    setCurrentBook(book);
    setCurrentChapterNumber(chapter.chapterNumber);
    setCurrentChapterTitle(chapter.title);
    setHasAudioUrl(Boolean(chapter.audioUrl));
    setIsAudioBarVisible(true);

    const split = splitTextIntoSentences(chapter.text, 350);
    setSentences(split);
    sentencesRef.current = split;

    const targetIdx = Math.min(startSentenceIndex, Math.max(0, split.length - 1));
    setCurrentSentenceIndex(targetIdx);
    currentIndexRef.current = targetIdx;

    setIsPlaying(true);
    setIsPaused(false);
    isPlayingRef.current = true;

    await startBackgroundAudioSession();
    await speakSentenceAt(targetIdx);
  };

  const pause = async () => {
    setIsPlaying(false);
    setIsPaused(true);
    isPlayingRef.current = false;
    try {
      await Speech.stop();
    } catch {}
    await stopBackgroundAudioSession();
  };

  const resume = async () => {
    if (!currentBook || sentencesRef.current.length === 0) return;
    setIsPlaying(true);
    setIsPaused(false);
    isPlayingRef.current = true;
    await startBackgroundAudioSession();
    await speakSentenceAt(currentIndexRef.current);
  };

  const skipNext = async () => {
    const nextIdx = Math.min(currentIndexRef.current + 1, sentencesRef.current.length - 1);
    setCurrentSentenceIndex(nextIdx);
    currentIndexRef.current = nextIdx;
    if (isPlayingRef.current) {
      await speakSentenceAt(nextIdx);
    }
  };

  const skipPrevious = async () => {
    const prevIdx = Math.max(0, currentIndexRef.current - 1);
    setCurrentSentenceIndex(prevIdx);
    currentIndexRef.current = prevIdx;
    if (isPlayingRef.current) {
      await speakSentenceAt(prevIdx);
    }
  };

  const setSpeechRate = async (rate: number) => {
    setSpeechRateState(rate);
    speechRateRef.current = rate;
    await AsyncStorage.setItem(SPEECH_RATE_STORAGE_KEY, String(rate));
    if (isPlayingRef.current) {
      await speakSentenceAt(currentIndexRef.current);
    }
  };

  const setSelectedVoice = async (voiceId: string | null) => {
    setSelectedVoiceState(voiceId);
    selectedVoiceRef.current = voiceId;
    if (voiceId) {
      await AsyncStorage.setItem(SPEECH_VOICE_STORAGE_KEY, voiceId);
    } else {
      await AsyncStorage.removeItem(SPEECH_VOICE_STORAGE_KEY);
    }
    if (isPlayingRef.current) {
      await speakSentenceAt(currentIndexRef.current);
    }
  };

  const setSleepTimer = (minutes: number | null) => {
    setSleepTimerMinutes(minutes);
    setSleepTimerRemaining(minutes !== null ? minutes * 60 : null);
  };

  const toggleAudioBar = () => {
    setIsAudioBarVisible((prev) => !prev);
  };

  const setOnAdvanceChapter = (fn: (nextChapterNumber: number) => void) => {
    onAdvanceChapterRef.current = fn;
  };

  return (
    <AudioPlayerContext.Provider
      value={{
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
        hasAudioUrl,
        isAudioBarVisible,
        playChapter,
        pause,
        resume,
        stop,
        skipNext,
        skipPrevious,
        setSpeechRate,
        setSelectedVoice,
        setSleepTimer,
        toggleAudioBar,
        setOnAdvanceChapter,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}
