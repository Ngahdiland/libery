import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useEffect, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import {
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBlurTarget } from '../context/BlurTargetContext';
import { useAuth } from '../context/AuthContext';
import { palette, radii, spacing } from '../theme';

export function LibraryHeaderActions() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { width } = useWindowDimensions();
  const blurTarget = useBlurTarget();
  const drawerWidth = Math.min(width * 0.78, 320);
  const expandedSearchWidth = Math.min(Math.max(width * 0.28, 84), 150);
  const [drawerTranslateX] = useState(() => new Animated.Value(-drawerWidth));
  const [searchFieldWidth] = useState(() => new Animated.Value(36));
  const searchInput = useRef<ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const animation = Animated.timing(drawerTranslateX, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [drawerTranslateX, drawerWidth, isDrawerOpen]);

  useEffect(() => {
    const animation = Animated.timing(searchFieldWidth, {
      toValue: isSearchOpen ? expandedSearchWidth : 36,
      duration: 220,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [expandedSearchWidth, isSearchOpen, searchFieldWidth]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const timer = setTimeout(() => searchInput.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, [isSearchOpen]);

  const closeDrawer = () => setIsDrawerOpen(false);
  const openDrawer = () => {
    drawerTranslateX.setValue(-drawerWidth);
    setIsDrawerOpen(true);
  };

  const submitSearch = () => {
    const query = searchValue.trim();
    if (!query) return;
    searchInput.current?.blur();
    setIsSearchOpen(false);
    router.push({ pathname: '/discover', params: { focusSearch: '1', q: query } });
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to sign out of Libra Hub?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            closeDrawer();
            await signOut();
            router.replace('/sign-in');
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <>
      <View style={styles.headerRow}>
        <View style={styles.brand}>
          <HeaderIcon name="menu-outline" label="Open navigation menu" onPress={openDrawer} />
          <Image
            source={require('../../assets/app-icon.png')}
            style={styles.headerLogoIcon}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Libra Hub</Text>
        </View>
        <View style={styles.actions}>
          <Animated.View
            style={[
              styles.searchField,
              { width: searchFieldWidth },
              isSearchOpen && styles.searchFieldExpanded,
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isSearchOpen ? 'Close search' : 'Search books'}
              onPress={() => {
                if (isSearchOpen) searchInput.current?.blur();
                setIsSearchOpen(!isSearchOpen);
              }}
              style={styles.searchToggle}
            >
              <Ionicons name={isSearchOpen ? 'close' : 'search-outline'} size={19} color={palette.primaryDark} />
            </Pressable>
            {isSearchOpen && (
              <TextInput
                accessibilityLabel="Search books"
                ref={searchInput}
                placeholder="Search"
                placeholderTextColor={palette.muted}
                returnKeyType="search"
                style={styles.searchInput}
                value={searchValue}
                onChangeText={setSearchValue}
                onSubmitEditing={submitSearch}
              />
            )}
          </Animated.View>
          <HeaderIcon
            name="notifications-outline"
            label="Notifications"
            onPress={() => router.navigate('/notifications')}
          />
          <HeaderIcon
            name="person-circle-outline"
            label="Profile"
            onPress={() => router.navigate('/(tabs)/profile')}
          />
        </View>
      </View>

      <Modal
        animationType="none"
        onRequestClose={closeDrawer}
        statusBarTranslucent
        transparent
        visible={isDrawerOpen}
      >
        <View style={styles.drawerOverlay}>
          {blurTarget ? (
            <BlurView
              blurMethod="dimezisBlurView"
              blurTarget={blurTarget}
              intensity={48}
              style={StyleSheet.absoluteFill}
              tint="light"
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.blurFallback]} />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close navigation menu"
            onPress={closeDrawer}
            style={[StyleSheet.absoluteFill, styles.drawerScrim]}
          />
          <Animated.View
            style={[
              styles.drawer,
              { width: drawerWidth, transform: [{ translateX: drawerTranslateX }] },
            ]}
          >
            <SafeAreaView edges={['top', 'bottom', 'left']} style={styles.drawerContent}>
              {/* Drawer Brand Header */}
              <View style={styles.drawerHeading}>
                <Image
                  source={require('../../assets/app-logo.png')}
                  style={styles.drawerLogo}
                  resizeMode="contain"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close navigation menu"
                  onPress={closeDrawer}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={22} color={palette.primaryDark} />
                </Pressable>
              </View>

              {/* User Account Snippet */}
              {user ? (
                <View style={styles.userSnippet}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.avatarInitial}>
                      {(user.displayName || user.username || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {user.displayName || user.username}
                    </Text>
                    <Text style={styles.userHandle} numberOfLines={1}>
                      @{user.username}
                    </Text>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    closeDrawer();
                    router.push('/sign-in');
                  }}
                  style={styles.guestSnippet}
                >
                  <View style={styles.guestAvatar}>
                    <Ionicons name="person-outline" size={18} color={palette.primary} />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>Sign in to Libra Hub</Text>
                    <Text style={styles.userHandle}>Sync shelf and preferences</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={palette.muted} />
                </Pressable>
              )}

              <View style={styles.divider} />

              {/* Navigation Items (Settings, Downloads — Home & tabs excluded per user request) */}
              <View style={styles.menuItemsList}>
                <DrawerItem
                  icon="cloud-download-outline"
                  label="Downloads"
                  badge="Offline"
                  onPress={() => {
                    closeDrawer();
                    router.navigate('/downloads');
                  }}
                />
                <DrawerItem
                  icon="settings-outline"
                  label="Settings"
                  onPress={() => {
                    closeDrawer();
                    router.navigate('/settings');
                  }}
                />
              </View>

              {/* Spacer */}
              <View style={{ flex: 1 }} />

              <View style={styles.divider} />

              {/* Bottom Area: Sign Out / Sign In */}
              {user ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleLogout}
                  style={styles.logoutButton}
                >
                  <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                  <Text style={styles.logoutText}>Log Out</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    closeDrawer();
                    router.push('/sign-in');
                  }}
                  style={styles.signInButton}
                >
                  <Ionicons name="log-in-outline" size={20} color={palette.primary} />
                  <Text style={styles.signInText}>Sign In / Register</Text>
                </Pressable>
              )}
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

function HeaderIcon({
  name,
  label,
  onPress,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.iconButton}
      hitSlop={6}
    >
      <Ionicons name={name} size={20} color={palette.primaryDark} />
    </Pressable>
  );
}

function DrawerItem({
  icon,
  label,
  badge,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.drawerItem}>
      <View style={styles.drawerItemLeft}>
        <Ionicons name={icon} size={20} color={palette.primary} />
        <Text style={styles.drawerItemText}>{label}</Text>
      </View>
      {badge ? (
        <View style={styles.badgePill}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerLogoIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
  },
  appName: {
    color: palette.primaryDark,
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 2,
  },
  iconButton: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchField: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 18,
  },
  searchFieldExpanded: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DCEDE2',
  },
  searchToggle: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    paddingHorizontal: 2,
    color: palette.textLight,
    fontSize: 12,
  },
  drawerOverlay: {
    flex: 1,
  },
  blurFallback: {
    backgroundColor: 'rgba(255,255,255,0.84)',
  },
  drawerScrim: {
    backgroundColor: 'rgba(15,26,20,0.12)',
  },
  drawer: {
    height: '100%',
    backgroundColor: '#F7FAF8',
    borderRightWidth: 1,
    borderRightColor: '#DCEDE2',
    elevation: 18,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  drawerHeading: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  drawerLogo: {
    width: 130,
    height: 42,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.sm,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.textLight,
  },
  userHandle: {
    fontSize: 12,
    color: palette.muted,
  },
  guestSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.sm,
  },
  guestAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#DCEDE2',
    marginVertical: spacing.sm,
  },
  menuItemsList: {
    gap: 4,
  },
  drawerItem: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: 'transparent',
  },
  drawerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  drawerItemText: {
    color: palette.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  badgePill: {
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.primaryDark,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#FDECEC',
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#E8F5EE',
  },
  signInText: {
    color: palette.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
