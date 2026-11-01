import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRef, type ComponentRef } from 'react';
import { BlurTargetView } from 'expo-blur';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ReaderPreferencesProvider, useReaderPreferences } from '../context/ReaderPreferences';
import { AuthProvider } from '../context/AuthContext';
import { CatalogProvider } from '../context/CatalogContext';
import { ReadingLibraryProvider } from '../context/ReadingLibraryContext';
import { BlurTargetContext } from '../context/BlurTargetContext';
import { BottomNavigation } from '../components/BottomNavigation';
import { LibraryHeaderActions } from '../components/LibraryHeaderActions';
import { palette } from '../theme';

export default function RootLayout() {
  const blurTarget = useRef<ComponentRef<typeof View>>(null);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ReaderPreferencesProvider>
          <ReadingLibraryProvider>
            <CatalogProvider>
              <BlurTargetContext.Provider value={blurTarget}>
                <BlurTargetView ref={blurTarget} style={styles.appContent}>
                  <AppNavigator />
                </BlurTargetView>
              </BlurTargetContext.Provider>
            </CatalogProvider>
          </ReadingLibraryProvider>
        </ReaderPreferencesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppNavigator() {
  const { isLoaded } = useReaderPreferences();
  const pathname = usePathname();
  const isAuthOrSetupRoute = pathname.split('/').some((segment) =>
    ['sign-in', 'login', 'setup', 'onboarding'].includes(segment.toLowerCase()),
  );

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <StatusBar style="dark" />
      {!isAuthOrSetupRoute && (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <LibraryHeaderActions />
          </View>
        </SafeAreaView>
      )}
      <View style={styles.stack}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      {!isAuthOrSetupRoute && <BottomNavigation />}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: palette.surfaceLight,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceLight,
  },
  appContent: {
    flex: 1,
  },
  headerSafeArea: {
    backgroundColor: '#F5FAF6',
    borderBottomWidth: 1,
    borderBottomColor: '#DCEDE2',
  },
  header: {
    height: 56,
    justifyContent: 'center',
    paddingLeft: 8,
    paddingRight: 4,
  },
  stack: {
    flex: 1,
  },
});
