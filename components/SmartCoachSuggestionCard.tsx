import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/Colors';

interface SmartCoachSuggestionCardProps {
    onPress: () => void;
    suggestion?: string;
}

export default function SmartCoachSuggestionCard({ onPress, suggestion }: SmartCoachSuggestionCardProps) {
    const { theme, isDark } = useTheme();

    return (
        <TouchableOpacity 
            style={[styles.container, { backgroundColor: isDark ? theme.card : '#F0FDF4', borderColor: isDark ? theme.border : '#86EFAC' }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.header}>
                <View style={[styles.iconBox, { backgroundColor: theme.primary }]}>
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.title, { color: theme.primary }]}>Smart Coach</Text>
            </View>

            <Text style={[styles.message, { color: theme.text }]}>
                {suggestion || "Based on your day so far, eat something light & protein rich. Tap to see my suggestions!"}
            </Text>

            <View style={styles.footer}>
                <Text style={[styles.footerText, { color: theme.primary }]}>Get Suggestions</Text>
                <Ionicons name="arrow-forward" size={14} color={theme.primary} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    iconBox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 14,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    message: {
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '500',
        marginBottom: 14,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerText: {
        fontSize: 13,
        fontWeight: '700',
    },
});
