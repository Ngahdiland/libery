import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useEffect, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBlurTarget } from '../context/BlurTargetContext';
import { palette, radii, spacing } from '../theme';

export function LibraryHeaderActions() {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { width } = useWindowDimensions();
  const blurTarget = useBlurTarget();
  const drawerWidth = Math.min(width * 0.4, 480);
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

  return (
    <>
      <View style={styles.headerRow}>
        <View style={styles.brand}>
          <HeaderIcon name="menu-outline" label="Open navigation menu" onPress={openDrawer} />
          <Text style={styles.appName}>Libery</Text>
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
              <View style={styles.drawerHeading}>
                <Text style={styles.drawerTitle}>Menu</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close navigation menu"
                  onPress={closeDrawer}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={22} color={palette.primaryDark} />
                </Pressable>
              </View>
              <DrawerItem
                icon="home-outline"
                label="Home"
                onPress={() => { closeDrawer(); router.navigate('/(tabs)'); }}
              />
              <DrawerItem
                icon="compass-outline"
                label="Discover"
                onPress={() => { closeDrawer(); router.navigate('/discover'); }}
              />
              <DrawerItem
                icon="library-outline"
                label="Library"
                onPress={() => { closeDrawer(); router.navigate('/library'); }}
              />
              <DrawerItem
                icon="cloud-download-outline"
                label="Downloads"
                onPress={() => { closeDrawer(); router.navigate('/downloads'); }}
              />
              <DrawerItem
                icon="person-outline"
                label="Profile"
                onPress={() => { closeDrawer(); router.navigate('/profile'); }}
              />
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
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.drawerItem}>
      <Ionicons name={icon} size={20} color={palette.primary} />
      <Text style={styles.drawerItemText}>{label}</Text>
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
  },
  appName: {
    color: palette.primaryDark,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginLeft: 2,
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
    paddingHorizontal: spacing.sm,
  },
  drawerHeading: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#DCEDE2',
    marginBottom: spacing.sm,
  },
  drawerTitle: {
    color: palette.textLight,
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
  },
  drawerItemText: {
    flexShrink: 1,
    color: palette.textLight,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
});
