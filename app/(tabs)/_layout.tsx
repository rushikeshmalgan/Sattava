import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddLogModal from '../../components/AddLogModal';
import { Colors } from '../../constants/Colors';

import { BlurView } from 'expo-blur';

/**
 * Custom Tab Bar Component
 */
function CustomTabBar({ state, descriptors, navigation, onAddPress }: any) {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.absoluteContainer}>
            {/* Full-width Blur Layer for scrolling content */}
            <BlurView
                intensity={80}
                tint="light"
                style={[styles.blurBackground, { height: 70 + 20 + insets.bottom }]}
            />

            {/* Floating Bar Container */}
            <View style={[styles.floatingBarWrapper, { bottom: insets.bottom + 10 }]}>
                <View style={styles.floatingBar}>
                    {state.routes.map((route: any, index: number) => {
                        const isFocused = state.index === index;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        let iconName: any;
                        if (route.name === 'home') iconName = isFocused ? 'home' : 'home-outline';
                        else if (route.name === 'analytics') iconName = isFocused ? 'stats-chart' : 'stats-chart-outline';
                        else if (route.name === 'profile') iconName = isFocused ? 'person' : 'person-outline';

                        return (
                            <TouchableOpacity
                                key={route.key}
                                onPress={onPress}
                                style={styles.tabItem}
                            >
                                <Ionicons
                                    name={iconName}
                                    size={24}
                                    color={isFocused ? Colors.PRIMARY : Colors.TEXT_MUTED}
                                />
                            </TouchableOpacity>
                        );
                    })}
                    <TouchableOpacity
                        style={styles.fabButton}
                        onPress={onAddPress}
                    >
                        <Ionicons name="add" size={30} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Solid System Navigation Mask - to hide content behind 3-button navigation */}
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
                screenOptions={{
                    headerShown: false,
                }}
            >
                <Tabs.Screen
                    name="home"
                    options={{
                        title: 'Home',
                    }}
                />
                <Tabs.Screen
                    name="analytics"
                    options={{
                        title: 'Analytics',
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Profile',
                    }}
                />
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
        zIndex: 1, // Above screen content but below the tab bar and system mask
    },
    floatingBarWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        zIndex: 3, // Above everything
    },
    floatingBar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 35,
        height: 70,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        // Elevation for Android
        elevation: 5,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    systemMask: {
        width: '100%',
        backgroundColor: Colors.BACKGROUND, // Solid background for system navigation area
        zIndex: 2, // Above blur background to hide text, but below floating bar items if they overlap
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    fabButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.PRIMARY,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
        marginRight: 5,
        // Add shadow to FAB
        shadowColor: Colors.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
});
