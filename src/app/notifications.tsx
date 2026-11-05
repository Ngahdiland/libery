import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, spacing } from '../theme';

export default function NotificationsScreen() {
  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <View style={styles.content}>
        <Link href="/(tabs)" style={styles.backLink}>Back to Libra Hub</Link>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>You’re all caught up</Text>
          <Text style={styles.description}>Updates about your library and provider listings will appear here.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.surfaceLight,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  backLink: {
    color: palette.primary,
    fontWeight: '700',
    marginBottom: spacing.xl,
  },
  title: {
    color: palette.textLight,
    fontSize: 28,
    fontWeight: '800',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    color: palette.textLight,
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
