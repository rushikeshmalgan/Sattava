import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddLogModal from '../../components/AddLogModal';
import { Colors } from '../../constants/Colors';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '@clerk/clerk-expo';

// Tab config: [route name, active icon, inactive icon, label]
const TAB_CONFIG = [
  ['home',      'home',                 'home-outline',                'Home'    ],
  ['analytics', 'stats-chart',          'stats-chart-outline',         'Insights'],
  ['diet',      'nutrition',            'nutrition-outline',           'Diet'    ],
  ['chat',      'chatbubble-ellipses',  'chatbubble-ellipses-outline', 'Coach'   ],
  ['profile',   'person',              'person-outline',               'Profile' ],
] as const;

function CustomTabBar({ state, descriptors, navigation, onAddPress }: any) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  const renderTab = (route: any, index: number) => {
    const isFocused = state.index === index;
    const config = TAB_CONFIG.find(([name]) => name === route.name);
    if (!config) return null;
    const [, activeIcon, inactiveIcon, label] = config;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
    };

    // Animated dot indicator
    const isCoach = route.name === 'chat';

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        style={({ pressed }) => [styles.tabItem, pressed && { opacity: 0.7 }]}
      >
        <View style={styles.tabInner}>
          <Ionicons
            name={isFocused ? activeIcon : inactiveIcon}
            size={22}
            color={isFocused ? theme.primary : theme.textMuted}
          />
          {/* Active dot */}
          {isFocused && (
            <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />
          )}
          {/* Coach badge — makes it stand out */}
          {isCoach && !isFocused && (
            <View style={[styles.coachBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.coachBadgeText}>AI</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabLabel, { color: isFocused ? theme.primary : theme.textMuted }]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.absoluteContainer}>
      {/* Blur backdrop */}
      <BlurView
        intensity={isDark ? 40 : 85}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.blurBackground, { height: 75 + insets.bottom }]}
      />

      {/* Floating pill bar */}
      <View style={[styles.floatingBarWrapper, { bottom: insets.bottom + 10 }]}>
        <View
          style={[
            styles.floatingBar,
            {
              backgroundColor: isDark
                ? 'rgba(20, 31, 27, 0.96)'
                : 'rgba(255, 255, 255, 0.94)',
              borderColor: isDark
                ? 'rgba(52, 211, 153, 0.12)'
                : 'rgba(30, 125, 90, 0.08)',
            },
          ]}
        >
          {/* Left: Home, Insights */}
          {state.routes.slice(0, 2).map((route: any, index: number) => renderTab(route, index))}

          {/* Center FAB */}
          <Pressable
            style={({ pressed }) => [styles.fabButton, pressed && styles.fabPressed]}
            onPress={onAddPress}
          >
            <View style={[styles.fabInner, { backgroundColor: theme.primary }]}>
              <Ionicons name="add" size={28} color="white" />
            </View>
          </Pressable>

          {/* Right: Coach, Profile */}
          {state.routes.slice(2).map((route: any, index: number) => renderTab(route, index + 2))}
        </View>
      </View>

      {/* System nav mask */}
      <View
        style={[
          styles.systemMask,
          { height: insets.bottom, backgroundColor: isDark ? '#0A1210' : Colors.BACKGROUND },
        ]}
      />
    </View>
  );
}

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
        <Tabs.Screen name="home"      options={{ title: 'Home'     }} />
        <Tabs.Screen name="analytics" options={{ title: 'Insights' }} />
        <Tabs.Screen name="diet"      options={{ title: 'Diet'     }} />
        <Tabs.Screen name="chat"      options={{ title: 'Coach'    }} />
        <Tabs.Screen name="profile"   options={{ title: 'Profile'  }} />
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
    borderRadius: 36,
    height: 68,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
  },
  systemMask: {
    width: '100%',
    zIndex: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 2,
  },
  tabInner: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  activeDot: {
    position: 'absolute',
    bottom: -5,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  coachBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  coachBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  fabButton: {
    marginHorizontal: 6,
  },
  fabInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  fabPressed: {
    transform: [{ scale: 0.9 }],
  },
});
