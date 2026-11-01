import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ReaderPreferencesProvider, useReaderPreferences } from '../context/ReaderPreferences';
import { palette } from '../theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ReaderPreferencesProvider>
        <AppNavigator />
      </ReaderPreferencesProvider>
    </SafeAreaProvider>
  );
}

function AppNavigator() {
  const { isLoaded } = useReaderPreferences();

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceLight,
  },
});
