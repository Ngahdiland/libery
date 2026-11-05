import * as Network from 'expo-network';
import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export type NetworkStatus = {
  isConnected: boolean;
  isInternetReachable: boolean;
  isOffline: boolean;
  refresh: () => Promise<void>;
};

/**
 * Direct async check for network reachability outside React components.
 */
export async function checkIsOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    const connected = state.isConnected ?? true;
    const reachable = state.isInternetReachable ?? connected;
    return connected && reachable;
  } catch {
    return true; // Default to optimistic online if check fails
  }
}

/**
 * Hook to observe network connectivity state with auto-refresh on app resume.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean>(true);

  const checkStatus = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      const connected = state.isConnected ?? true;
      const reachable = state.isInternetReachable ?? connected;
      setIsConnected(connected);
      setIsInternetReachable(reachable);
    } catch {
      // Keep existing state if error occurs
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    void Promise.resolve().then(async () => {
      if (mounted) await checkStatus();
    });

    // Check periodically
    const interval = setInterval(() => {
      if (mounted) void checkStatus();
    }, 4000);

    // Refresh immediately when app transitions to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        void checkStatus();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      mounted = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, [checkStatus]);

  const isOffline = !isConnected || !isInternetReachable;

  return {
    isConnected,
    isInternetReachable,
    isOffline,
    refresh: checkStatus,
  };
}
