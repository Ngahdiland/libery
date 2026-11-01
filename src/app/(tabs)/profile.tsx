import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { useReaderPreferences, type AgeGroup } from '../../context/ReaderPreferences';
import { palette, radii, spacing } from '../../theme';

const ageGroups: { id: AgeGroup; title: string; range: string }[] = [
  { id: 'kids', title: 'Kids', range: '0–12' },
  { id: 'teens', title: 'Teens', range: '13–17' },
  { id: 'adults', title: 'Adults', range: '18+' },
];
const languages = ['English', 'French'];

export default function ProfileScreen() {
  const { preferences, updatePreferences } = useReaderPreferences();
  const { books } = useCatalog();
  const { user, error: authError, signOut } = useAuth();
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const focusAreas = Array.from(new Set(books.map((book) => book.category)));

  const savePreferences = async (updates: Parameters<typeof updatePreferences>[0]) => {
    setPreferenceError(null);
    try {
      await updatePreferences(updates);
    } catch (error) {
      setPreferenceError(error instanceof Error ? error.message : 'Could not save your preferences.');
    }
  };

  const toggleFocus = (focus: string) => {
    const focusSelection = preferences.focusAreas.includes(focus)
      ? preferences.focusAreas.filter((item) => item !== focus)
      : [...preferences.focusAreas, focus];
    void savePreferences({ focusAreas: focusSelection });
  };

  const toggleLanguage = (language: string) => {
    const languageSelection = preferences.languages.includes(language)
      ? preferences.languages.filter((item) => item !== language)
      : [...preferences.languages, language];
    if (languageSelection.length > 0) void savePreferences({ languages: languageSelection });
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.displayName.slice(0, 1).toUpperCase() ?? 'A'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.displayName ?? 'Your reader profile'}</Text>
            <Text style={styles.handle}>{user?.email ?? 'Personalized on this device'}</Text>
            <Text style={styles.bio}>
              {user ? 'Signed in to your Libery cloud library.' : 'Sign in to connect your account to the Atlas-backed book catalog.'}
            </Text>
          </View>
        </View>
        {user ? (
          <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.accountButton}>
            <Text style={styles.accountButtonText}>Sign out of cloud library</Text>
          </Pressable>
        ) : (
          <Link href="/sign-in" asChild>
            <Pressable accessibilityRole="button" style={styles.accountButton}>
              <Text style={styles.accountButtonText}>Sign in to cloud library</Text>
            </Pressable>
          </Link>
        )}
        {authError && <Text accessibilityRole="alert" style={styles.accountError}>{authError}</Text>}
        {preferenceError && <Text accessibilityRole="alert" style={styles.accountError}>{preferenceError}</Text>}

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{preferences.focusAreas.length}</Text>
            <Text style={styles.statLabel}>Focus areas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{preferences.languages.length}</Text>
            <Text style={styles.statLabel}>Languages</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{ageGroups.find((group) => group.id === preferences.ageGroup)?.title}</Text>
            <Text style={styles.statLabel}>Age group</Text>
          </View>
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Age group</Text>
          <Text style={styles.sectionHint}>We’ll only show books suitable for this age range.</Text>
          <View style={styles.chipRow}>
            {ageGroups.map((group) => {
              const selected = preferences.ageGroup === group.id;
              return (
                <Pressable
                  key={group.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => void savePreferences({ ageGroup: group.id })}
                  style={[styles.chip, selected && styles.selectedChip]}
                >
                  <Text style={[styles.chipTitle, selected && styles.selectedChipText]}>{group.title}</Text>
                  <Text style={[styles.chipSubtitle, selected && styles.selectedChipText]}>{group.range}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Focus areas</Text>
          <Text style={styles.sectionHint}>Select topics to shape your recommendations.</Text>
          <View style={styles.chipRow}>
            {focusAreas.map((focus) => {
              const selected = preferences.focusAreas.includes(focus);
              return (
                <Pressable
                  key={focus}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => toggleFocus(focus)}
                  style={[styles.focusChip, selected && styles.selectedChip]}
                >
                  <Text style={[styles.focusText, selected && styles.selectedChipText]}>{focus}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Languages</Text>
          <Text style={styles.sectionHint}>At least one language must be selected.</Text>
          <View style={styles.chipRow}>
            {languages.map((language) => {
              const selected = preferences.languages.includes(language);
              return (
                <Pressable
                  key={language}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => toggleLanguage(language)}
                  style={[styles.focusChip, selected && styles.selectedChip]}
                >
                  <Text style={[styles.focusText, selected && styles.selectedChipText]}>{language}</Text>
                </Pressable>
              );
            })}
          </View>

          {preferences.ageGroup === 'kids' && (
            <View style={styles.guardianNotice}>
              <Text style={styles.guardianNoticeText}>
                Accounts for children under 13 require verified guardian consent. {user
                  ? 'Your account age filter is also enforced by the Libery API.'
                  : 'This setting filters sample books on this device.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.surfaceLight,
  },
  container: {
    flex: 1,
    backgroundColor: palette.surfaceLight,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 32,
  },
  heading: {
    color: palette.textLight,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: '#0B1B14',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3,
  },
  accountButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
  },
  accountButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  accountError: {
    color: '#A9342B',
    fontSize: 13,
    lineHeight: 19,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    color: palette.textLight,
    fontSize: 20,
    fontWeight: '800',
  },
  handle: {
    marginTop: 2,
    fontSize: 13,
    color: palette.muted,
  },
  bio: {
    color: palette.muted,
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F3F7F4',
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginRight: 10,
  },
  statNumber: {
    color: palette.textLight,
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 4,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: radii.xl,
    padding: spacing.md,
  },
  sectionTitle: {
    color: palette.textLight,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  sectionHint: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginBottom: spacing.md,
  },
  chip: {
    minWidth: 82,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F7F4',
    borderRadius: radii.md,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E4ECE6',
  },
  chipTitle: {
    color: palette.textLight,
    fontWeight: '700',
    fontSize: 13,
  },
  chipSubtitle: {
    color: palette.muted,
    fontSize: 11,
    marginTop: 2,
  },
  focusChip: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: '#F3F7F4',
    borderRadius: 999,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E4ECE6',
  },
  focusText: {
    color: palette.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  selectedChip: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  selectedChipText: {
    color: '#fff',
  },
  guardianNotice: {
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: '#FFF5E5',
    marginTop: 4,
  },
  guardianNoticeText: {
    color: '#6B4C1D',
    fontSize: 12,
    lineHeight: 18,
  },
});
