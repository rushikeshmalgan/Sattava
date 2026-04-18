import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddLogModal from '../../components/AddLogModal';
import { Colors } from '../../constants/Colors';
import { BlurView } from 'expo-blur';

// Tab config: [route name, active icon, inactive icon, label, emoji]
const TAB_CONFIG = [
  ['home',      'home',            'home-outline',            'Home',     '🏠'],
  ['diet',      'restaurant',      'restaurant-outline',      'Diet',     '🍛'],
  ['analytics', 'stats-chart',     'stats-chart-outline',     'Insights', '📊'],
  ['profile',   'person',         'person-outline',           'Profile',  '👤'],
] as const;

/**
 * SwasthBharat Custom Tab Bar
 * 4 tabs: Home | Diet | [+FAB] | Insights | Profile
 * Layout: [Home] [Diet] [FAB] [Insights] [Profile]
 */
function CustomTabBar({ state, descriptors, navigation, onAddPress }: any) {
  const insets = useSafeAreaInsets();

  const renderTab = (route: any, index: number) => {
    const isFocused = state.index === index;
    const config = TAB_CONFIG.find(([name]) => name === route.name);
    if (!config) return null;
    const [, activeIcon, inactiveIcon, label] = config;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
    };

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
      >
        <Ionicons
          name={isFocused ? activeIcon : inactiveIcon}
          size={22}
          color={isFocused ? Colors.PRIMARY : Colors.TEXT_MUTED}
        />
        <Text style={[styles.tabLabel, { color: isFocused ? Colors.PRIMARY : Colors.TEXT_MUTED }]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.absoluteContainer}>
      {/* Blur backdrop */}
      <BlurView
        intensity={85}
        tint="light"
        style={[styles.blurBackground, { height: 75 + insets.bottom }]}
      />

      {/* Floating pill bar */}
      <View style={[styles.floatingBarWrapper, { bottom: insets.bottom + 10 }]}>
        <View style={styles.floatingBar}>
          {/* Left tabs: Home, Diet */}
          {state.routes.slice(0, 2).map((route: any, index: number) => renderTab(route, index))}

          {/* Center FAB */}
          <Pressable
            style={({ pressed }) => [styles.fabButton, pressed && styles.fabPressed]}
            onPress={onAddPress}
          >
            <View style={styles.fabInner}>
              <Ionicons name="add" size={28} color="white" />
            </View>
          </Pressable>

          {/* Right tabs: Insights, Profile */}
          {state.routes.slice(2).map((route: any, index: number) => renderTab(route, index + 2))}
        </View>
      </View>

      {/* System nav mask */}
      <View style={[styles.systemMask, { height: insets.bottom }]} />
    </View>
  );
}

import { useUser } from '@clerk/clerk-expo';

export default function TabLayout() {
  const { user } = useUser();
  const [isAddModalVisible, setIsAddModalVisible] = React.useState(false);

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar
            {...props}
            onAddPress={() => setIsAddModalVisible(true)}
          />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="home"      options={{ title: 'Home' }} />
        <Tabs.Screen name="diet"      options={{ title: 'Diet' }} />
        <Tabs.Screen name="analytics" options={{ title: 'Insights' }} />
        <Tabs.Screen name="profile"   options={{ title: 'Profile' }} />
      </Tabs>

      <AddLogModal
        isVisible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        userId={user?.id}
      />
    </>
  );
}

const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  blurBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  floatingBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 3,
  },
  floatingBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 36,
    height: 68,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 153, 51, 0.2)',  // subtle saffron border
  },
  systemMask: {
    width: '100%',
    backgroundColor: Colors.BACKGROUND,
    zIndex: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 3,
  },
  tabItemPressed: {
    opacity: 0.75,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  fabButton: {
    marginHorizontal: 6,
  },
  fabInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  fabPressed: {
    transform: [{ scale: 0.92 }],
  },
});
