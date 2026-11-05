import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { type AgeGroup, useReaderPreferences } from '../context/ReaderPreferences';
import { getStorageInfo } from '../offline';
import { palette, radii, spacing } from '../theme';

const AGE_GROUPS: { id: AgeGroup; label: string; desc: string }[] = [
  { id: 'adults', label: 'Adults (18+)', desc: 'Unrestricted access to all classic literature and themes' },
  { id: 'teens', label: 'Teens (13-17)', desc: 'Age-appropriate classic fiction, history, and adventure' },
  { id: 'kids', label: 'Kids (<13)', desc: 'Curated fairy tales, fables, and gentle children’s classics' },
];

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { preferences, updatePreferences } = useReaderPreferences();
  const [offlineStats, setOfflineStats] = useState<{ count: number; totalBytes: number; formattedSize: string }>({
    count: 0,
    totalBytes: 0,
    formattedSize: '0 KB',
  });
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [offlineAutoSync, setOfflineAutoSync] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(async () => {
      try {
        const stats = await getStorageInfo();
        if (mounted) setOfflineStats(stats);
      } catch {
        // Ignore offline storage query error
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleAgeChange = async (group: AgeGroup) => {
    try {
      await updatePreferences({ ageGroup: group });
    } catch {
      Alert.alert('Error', 'Could not update your reading age preference.');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to sign out of Libra Hub? Your downloaded books will stay saved on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/sign-in');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Could not sign out.');
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={palette.textLight} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. ACCOUNT INFORMATION ────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Account Information</Text>
        <View style={styles.card}>
          {user ? (
            <>
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitial}>
                    {(user.displayName || user.username || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.profileDetails}>
                  <Text style={styles.profileName}>{user.displayName || user.username}</Text>
                  <Text style={styles.profileHandle}>@{user.username}</Text>
                  <Text style={styles.profileEmail}>{user.email}</Text>
                </View>
              </View>

              <View style={styles.badgeRow}>
                <View style={styles.accountBadge}>
                  <Ionicons
                    name={user.role === 'provider' ? 'business-outline' : 'book-outline'}
                    size={14}
                    color={palette.primaryDark}
                  />
                  <Text style={styles.accountBadgeText}>
                    {user.role === 'provider' ? 'Publisher Account' : 'Reader Account'}
                  </Text>
                </View>
                {user.providerStatus === 'verified' && (
                  <View style={[styles.accountBadge, { backgroundColor: '#E8F5EE' }]}>
                    <Ionicons name="checkmark-circle" size={14} color={palette.primaryDark} />
                    <Text style={styles.accountBadgeText}>Verified</Text>
                  </View>
                )}
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/(tabs)/profile')}
                style={styles.editProfileBtn}
              >
                <Ionicons name="create-outline" size={16} color={palette.primaryDark} />
                <Text style={styles.editProfileBtnText}>Edit Profile & Avatar</Text>
                <Ionicons name="chevron-forward" size={16} color={palette.muted} style={{ marginLeft: 'auto' }} />
              </Pressable>
            </>
          ) : (
            <View style={styles.guestContainer}>
              <View style={styles.guestIconWrap}>
                <Ionicons name="person-circle-outline" size={42} color={palette.muted} />
              </View>
              <Text style={styles.guestTitle}>You are browsing as Guest</Text>
              <Text style={styles.guestSubtitle}>
                Sign in to sync your reading shelf, save annotations, and personalize your book recommendations across devices.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/sign-in')}
                style={styles.signInBtn}
              >
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <Text style={styles.signInBtnText}>Sign In / Create Account</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── 2. READING PREFERENCES ────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Reading Preferences</Text>
        <View style={styles.card}>
          <Text style={styles.settingLabel}>Content Filter (Age Group)</Text>
          <Text style={styles.settingDescription}>
            Filters the book catalog and feeds according to safety guidelines.
          </Text>

          <View style={styles.radioList}>
            {AGE_GROUPS.map((item) => {
              const isSelected = preferences.ageGroup === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => void handleAgeChange(item.id)}
                  style={[styles.radioItem, isSelected && styles.radioItemSelected]}
                >
                  <View style={styles.radioItemContent}>
                    <Text style={[styles.radioTitle, isSelected && styles.radioTitleSelected]}>
                      {item.label}
                    </Text>
                    <Text style={styles.radioDesc}>{item.desc}</Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={isSelected ? palette.primary : palette.muted}
                  />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.divider} />

          <View style={styles.preferenceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Focus & Favorite Themes</Text>
              <Text style={styles.settingDescription}>
                {preferences.focusAreas.length > 0
                  ? preferences.focusAreas.join(' · ')
                  : 'Fiction, Philosophy'}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/sign-in')}
              style={styles.actionPill}
            >
              <Text style={styles.actionPillText}>Update</Text>
            </Pressable>
          </View>
        </View>

        {/* ── 3. PRIVACY & DATA ─────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Privacy & Storage</Text>
        <View style={styles.card}>
          <View style={styles.preferenceRow}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text style={styles.settingLabel}>Offline Storage</Text>
              <Text style={styles.settingDescription}>
                {offlineStats.count} {offlineStats.count === 1 ? 'book' : 'books'} downloaded · {offlineStats.formattedSize} used
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/downloads')}
              style={styles.actionPill}
            >
              <Ionicons name="folder-open-outline" size={14} color={palette.primaryDark} style={{ marginRight: 4 }} />
              <Text style={styles.actionPillText}>Manage</Text>
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text style={styles.settingLabel}>Auto-sync when online</Text>
              <Text style={styles.settingDescription}>
                Automatically check server for updated chapters when opening downloaded books.
              </Text>
            </View>
            <Switch
              value={offlineAutoSync}
              onValueChange={setOfflineAutoSync}
              trackColor={{ false: palette.border, true: palette.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text style={styles.settingLabel}>Anonymous Reading Insights</Text>
              <Text style={styles.settingDescription}>
                Help improve community book curation without sharing personal identifying data.
              </Text>
            </View>
            <Switch
              value={analyticsEnabled}
              onValueChange={setAnalyticsEnabled}
              trackColor={{ false: palette.border, true: palette.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark-outline" size={18} color={palette.primary} />
            <Text style={styles.securityNoteText}>
              Libra Hub stores your account sessions with cryptographically rotated tokens in secure device keychain. Passwords are never stored in plain text.
            </Text>
          </View>
        </View>

        {/* ── 4. ABOUT LIBRA HUB ────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>About</Text>
        <View style={styles.card}>
          <View style={styles.aboutRow}>
            <Image
              source={require('../../assets/app-logo.png')}
              style={styles.aboutLogo}
              resizeMode="contain"
            />
            <Text style={styles.aboutVersion}>Libra Hub · v1.0.0</Text>
            <Text style={styles.aboutTagline}>
              Open timeless literature, reader reflections, and offline chapter reading.
            </Text>
          </View>
        </View>

        {/* ── 5. LOGOUT BUTTON AT THE BOTTOM ────────────────────────────────── */}
        {user ? (
          <Pressable
            accessibilityRole="button"
            onPress={handleSignOut}
            style={styles.logoutBtn}
          >
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text style={styles.logoutBtnText}>Log Out of Libra Hub</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/sign-in')}
            style={styles.signInBottomBtn}
          >
            <Ionicons name="log-in-outline" size={20} color="#fff" />
            <Text style={styles.signInBottomBtnText}>Sign In / Create Account</Text>
          </Pressable>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.surfaceLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.surfaceLight,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.textLight,
  },
  scrollContent: {
    padding: spacing.md,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: palette.muted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: spacing.sm,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.textLight,
  },
  profileHandle: {
    fontSize: 13,
    color: palette.muted,
    marginTop: 1,
  },
  profileEmail: {
    fontSize: 12,
    color: palette.muted,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  accountBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.primaryDark,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textLight,
  },
  guestContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  guestIconWrap: {
    marginBottom: spacing.xs,
  },
  guestTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.textLight,
    marginBottom: 4,
  },
  guestSubtitle: {
    fontSize: 13,
    color: palette.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    gap: spacing.xs,
  },
  signInBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.textLight,
  },
  settingDescription: {
    fontSize: 12,
    color: palette.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  radioList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceLight,
  },
  radioItemSelected: {
    borderColor: palette.primary,
    backgroundColor: '#F0FBF5',
  },
  radioItemContent: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  radioTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textLight,
  },
  radioTitleSelected: {
    color: palette.primaryDark,
  },
  radioDesc: {
    fontSize: 11,
    color: palette.muted,
    marginTop: 2,
    lineHeight: 15,
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: spacing.md,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.primaryDark,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FBF5',
    padding: spacing.sm,
    borderRadius: radii.md,
    gap: spacing.xs,
  },
  securityNoteText: {
    flex: 1,
    fontSize: 11,
    color: palette.primaryDark,
    lineHeight: 16,
  },
  aboutRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  aboutLogo: {
    width: 140,
    height: 48,
    marginBottom: spacing.xs,
  },
  aboutVersion: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textLight,
  },
  aboutTagline: {
    fontSize: 12,
    color: palette.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F8B4B4',
    paddingVertical: 14,
    borderRadius: radii.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '800',
  },
  signInBottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
    paddingVertical: 14,
    borderRadius: radii.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  signInBottomBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
