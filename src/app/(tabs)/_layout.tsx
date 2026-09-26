import React from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ColorValue, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadows, typography } from '../../constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const tabIcon =
  (active: IconName, inactive: IconName) =>
  ({ color, focused }: { color: ColorValue; focused: boolean }) => <Ionicons name={focused ? active : inactive} size={22} color={color} />;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Forms inside tabs (AI chat, search) need the space; the bar returns when the keyboard closes.
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: [styles.tabBar, { height: 58 + bottomInset, paddingBottom: bottomInset }],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home, hospital dashboard',
          tabBarIcon: tabIcon('home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          tabBarAccessibilityLabel: 'Patients, patient directory',
          tabBarIcon: tabIcon('people', 'people-outline'),
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: 'Billing',
          tabBarAccessibilityLabel: 'Billing and invoices',
          tabBarIcon: tabIcon('receipt', 'receipt-outline'),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI Assistant',
          tabBarAccessibilityLabel: 'MediOS AI Assistant',
          tabBarIcon: tabIcon('hardware-chip', 'hardware-chip-outline'),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarAccessibilityLabel: 'More features and settings',
          tabBarIcon: tabIcon('grid', 'grid-outline'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 6,
    ...shadows.md,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeights.medium,
    marginTop: 2,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
});
