import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { palette } from '../../theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { display: 'none' },
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: '#6F7F76',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            index: 'home-outline',
            discover: 'compass-outline',
            library: 'library-outline',
            profile: 'person-outline',
          };

          return <Ionicons name={icons[route.name] ?? 'home-outline'} size={size} color={String(color ?? palette.primary)} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="library" options={{ title: 'My library' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
