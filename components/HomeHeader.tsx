import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';

export default function HomeHeader() {
    const { user } = useUser();

    return (
        <View style={styles.container}>
            <View style={styles.userInfo}>
                <Image
                    source={{ uri: user?.imageUrl }}
                    style={styles.profileImage}
                />
                <View style={styles.textContainer}>
                    <Text style={styles.welcomeText}>Welcome</Text>
                    <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.notificationButton}>
                <Ionicons name="notifications-outline" size={24} color={Colors.TEXT_MAIN} />
                <View style={styles.notificationBadge} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 25,
        backgroundColor: Colors.BACKGROUND,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileImage: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: Colors.SURFACE,
    },
    textContainer: {
        marginLeft: 12,
    },
    welcomeText: {
        fontSize: 14,
        color: Colors.TEXT_MUTED,
        fontWeight: '500',
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
    },
    notificationButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.SURFACE,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.ERROR,
        borderWidth: 1.5,
        borderColor: Colors.SURFACE,
    },
});
