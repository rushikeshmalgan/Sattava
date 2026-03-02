import { useAuth, useUser } from '@clerk/clerk-expo';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function Profile() {
    const { user } = useUser();
    const { signOut } = useAuth();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>{user?.fullName || 'User'}</Text>

            <TouchableOpacity style={styles.signOutButton} onPress={() => signOut()}>
                <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.BACKGROUND,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.TEXT_MAIN,
    },
    subtitle: {
        fontSize: 18,
        color: Colors.TEXT_MUTED,
        marginTop: 8,
        marginBottom: 40,
    },
    signOutButton: {
        backgroundColor: Colors.ERROR,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    signOutText: {
        color: 'white',
        fontWeight: '600',
    },
});
