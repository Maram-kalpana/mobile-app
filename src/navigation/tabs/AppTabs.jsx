import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileScreen } from '../../screens/profile/ProfileScreen';
import { SettingsScreen } from '../../screens/settings/SettingsScreen';
import { HomeStack } from '../home/HomeStack';

const Tab = createBottomTabNavigator();

// ── Reusable logo component for header right ──
const HeaderLogo = () => (
  <Image
    source={require('../../../assets/sruthika_final_logo.png')}
    style={styles.headerLogo}
    resizeMode="contain"
  />
);

export function AppTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',          // ✅ white bottom bar
          borderTopColor: '#e5e7eb',        // light border
          height: 115 + insets.bottom,       // extra height for safe area
          paddingBottom: insets.bottom + 8, // push content up above gesture bar
          paddingTop: 8,
          // Uncomment below to lift the whole bar further up as a "floating" bar:
          // position: 'absolute',
          // marginHorizontal: 12,
          // marginBottom: insets.bottom + 10,
          // borderRadius: 16,
          // borderTopWidth: 0,
          // elevation: 4,
          // shadowColor: '#000',
          // shadowOpacity: 0.1,
          // shadowOffset: { width: 0, height: 2 },
          // shadowRadius: 6,
        },
        tabBarActiveTintColor: '#2563eb',   // blue active
        tabBarInactiveTintColor: '#9ca3af', // gray inactive
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-variant" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#0b1213' },
          headerTintColor: '#e9f2f2',
          title: 'Profile',
          headerRight: () => <HeaderLogo />,
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-circle" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#0b1213' },
          headerTintColor: '#e9f2f2',
          title: 'Settings',
          headerRight: () => <HeaderLogo />,
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cog" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerLogo: {
    width: 72,
    height: 36,
    marginRight: 4,
  },
});