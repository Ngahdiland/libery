import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Checks whether the native `ExpoAudio` module is compiled into the current binary.
 * In custom EAS development builds or supported Expo Go releases, this returns true.
 * In environments where ExpoAudio is not linked, this returns false instead of throwing.
 */
export function isExpoAudioAvailable(): boolean {
  try {
    return Boolean(requireOptionalNativeModule('ExpoAudio'));
  } catch {
    return false;
  }
}

interface AudioSessionManager {
  initAudioMode: () => Promise<void>;
  startKeepAlive: (silentUri: string) => Promise<void>;
  stopKeepAlive: () => Promise<void>;
  dispose: () => void;
}

// Retain a persistent reference to the background silent audio player instance
let playerInstance: {
  loop: boolean;
  volume: number;
  play: () => void;
  pause: () => void;
  remove?: () => void;
} | null = null;

export const BackgroundAudioSession: AudioSessionManager = {
  initAudioMode: async () => {
    if (!isExpoAudioAvailable()) {
      return;
    }
    try {
      const { setAudioModeAsync } = await import('expo-audio');
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'mixWithOthers',
      });
    } catch {
      // Non-blocking in non-native or restricted preview contexts
    }
  },

  startKeepAlive: async (silentUri: string) => {
    if (!isExpoAudioAvailable()) {
      return;
    }
    try {
      const { createAudioPlayer } = await import('expo-audio');
      if (!playerInstance) {
        const player = createAudioPlayer(silentUri);
        player.loop = true;
        player.volume = 0.01;
        playerInstance = player;
      }
      playerInstance.play();
    } catch {
      // Non-blocking fallback
    }
  },

  stopKeepAlive: async () => {
    try {
      if (playerInstance) {
        playerInstance.pause();
      }
    } catch {
      // Non-blocking fallback
    }
  },

  dispose: () => {
    try {
      if (playerInstance) {
        if (typeof playerInstance.remove === 'function') {
          playerInstance.remove();
        }
        playerInstance = null;
      }
    } catch {
      // Non-blocking fallback
    }
  },
};

