import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Page not found</Text>
      <Link href="/" style={styles.link}>Go home</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceLight,
  },
  title: {
    color: palette.textLight,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
  link: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
