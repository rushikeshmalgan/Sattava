import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';

/**
 * Custom Tab Bar Component for the Floating Effect
 */
function CustomTabBar({ state, descriptors, navigation }: any) {
    return (
        <View style={styles.tabBarContainer}>
            <View style={styles.floatingBar}>
                {state.routes.map((route: any, index: number) => {
                    const { options } = descriptors[route.key];
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
                {/* Floating rounded '+' button at the end */}
                <TouchableOpacity
                    style={styles.fabButton}
                    onPress={() => console.log('Add Action')}
                >
                    <Ionicons name="add" size={30} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function TabLayout() {
    return (
        <Tabs
            tabBar={(props) => <CustomTabBar {...props} />}
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
    );
}

const styles = StyleSheet.create({
    tabBarContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 30 : 20,
        left: 20,
        right: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
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
