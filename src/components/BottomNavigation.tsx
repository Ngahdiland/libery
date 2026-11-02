import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, radii, spacing } from '../theme';

const items = [
  { id: 'home', label: 'Home', path: '/(tabs)', icon: 'home-outline' },
  { id: 'discover', label: 'Discover', path: '/discover', icon: 'compass-outline' },
  { id: 'library', label: 'Library', path: '/library', icon: 'library-outline' },
  { id: 'profile', label: 'Profile', path: '/profile', icon: 'person-outline' },
] as const;

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const normalizedPath = pathname.replace(/^\/\(tabs\)/, '') || '/';
  const activeTab = normalizedPath === '/'
    ? 'home'
    : items.find((item) => item.path === normalizedPath || item.path === pathname)?.id;

  const closeQuickAdd = () => setIsQuickAddOpen(false);

  return (
    <>
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.navigation}>
          <TabButton item={items[0]} selected={activeTab === items[0].id} onPress={() => router.navigate(items[0].path)} />
          <TabButton item={items[1]} selected={activeTab === items[1].id} onPress={() => router.navigate(items[1].path)} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quick add"
            onPress={() => setIsQuickAddOpen(true)}
            style={styles.addTab}
          >
            <View style={styles.addButton}>
              <Ionicons name="add" size={23} color="#fff" />
            </View>
            <Text style={styles.label}>Add</Text>
          </Pressable>
          <TabButton item={items[2]} selected={activeTab === items[2].id} onPress={() => router.navigate(items[2].path)} />
          <TabButton item={items[3]} selected={activeTab === items[3].id} onPress={() => router.navigate(items[3].path)} />
        </View>
      </SafeAreaView>

      <Modal
        animationType="slide"
        onRequestClose={closeQuickAdd}
        transparent
        visible={isQuickAddOpen}
      >
        <View style={styles.quickAddOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close quick add"
            onPress={closeQuickAdd}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={['bottom']} style={styles.quickAddSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Quick add</Text>
            <QuickAddOption
              icon="search-outline"
              label="Find a book"
              onPress={() => {
                closeQuickAdd();
                router.push({ pathname: '/discover', params: { focusSearch: '1' } });
              }}
            />
            <QuickAddOption
              icon="book-outline"
              label="Create provider listing"
              onPress={() => {
                closeQuickAdd();
                router.push('/provider/create-book');
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

function TabButton({
  item,
  selected,
  onPress,
}: {
  item: (typeof items)[number];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.tab}
    >
      <Ionicons
        name={item.icon}
        size={21}
        color={selected ? palette.primary : palette.muted}
      />
      <Text style={[styles.label, selected && styles.selectedLabel]}>{item.label}</Text>
    </Pressable>
  );
}

function QuickAddOption({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.quickAddOption}>
      <Ionicons name={icon} size={20} color={palette.primary} />
      <Text style={styles.quickAddOptionText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={palette.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F5FAF6',
    borderTopWidth: 1,
    borderTopColor: '#DCEDE2',
  },
  navigation: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTab: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: palette.primary,
    marginBottom: 1,
  },
  label: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
  selectedLabel: {
    color: palette.primary,
    fontWeight: '800',
  },
  quickAddOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10,20,14,0.28)',
  },
  quickAddSheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: '#F7FAF8',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    borderRadius: 2,
    backgroundColor: '#B9C9C0',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    color: palette.textLight,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  quickAddOption: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#DCEDE2',
  },
  quickAddOptionText: {
    flex: 1,
    color: palette.textLight,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing.md,
  },
});
