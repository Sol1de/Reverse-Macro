import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'nativewind';

export default function TabLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const active = isDark ? '#fafafa' : '#0a0a0a';
  const inactive = isDark ? '#a1a1a1' : '#737373';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: {
          backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
          borderTopColor: isDark ? '#262626' : '#e5e5e5',
        },
      }}
    >
      <Tabs.Screen
        name="my-plans"
        options={{
          title: 'My plans',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="new-plan"
        options={{
          title: 'New plan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Reached from My plans; hidden from the tab bar but keeps it visible. */}
      <Tabs.Screen name="plan-detail" options={{ href: null }} />
    </Tabs>
  );
}
