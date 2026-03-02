import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function Analytics() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Analytics</Text>
            <Text style={styles.subtitle}>Track your progress over time.</Text>
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
        fontSize: 16,
        color: Colors.TEXT_MUTED,
        marginTop: 8,
    },
});
