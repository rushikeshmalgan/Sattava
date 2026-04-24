import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

interface StreakRewardsCardProps {
    streak: number;
}

const REWARDS = [
    { days: 3, label: "AI Diet Report" },
    { days: 5, label: "Healthy Combos" },
    { days: 7, label: "Smart Coach" },
    { days: 14, label: "Weekly PDF" },
];

export default function StreakRewardsCard({ streak }: StreakRewardsCardProps) {
    const { theme, isDark } = useTheme();

    const nextReward = REWARDS.find(r => r.days > streak) || REWARDS[REWARDS.length - 1];
    
    return (
        <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.header}>
                <View style={styles.streakBadge}>
                    <Ionicons name="flame" size={24} color="#F97316" />
                    <Text style={styles.streakText}>{streak} Day Streak</Text>
                </View>
            </View>

            {nextReward.days > streak ? (
                <View style={[styles.rewardBox, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                    <Ionicons name="gift" size={20} color={theme.primary} />
                    <View style={styles.rewardTextContainer}>
                        <Text style={[styles.rewardTitle, { color: theme.text }]}>
                            Reward unlocks at {nextReward.days} days
                        </Text>
                        <Text style={[styles.rewardSubtitle, { color: theme.textMuted }]}>
                            {nextReward.label}
                        </Text>
                    </View>
                </View>
            ) : (
                <LinearGradient colors={[theme.primary, theme.primary + '80']} style={styles.rewardBox}>
                    <Ionicons name="trophy" size={20} color="#FFFFFF" />
                    <View style={styles.rewardTextContainer}>
                        <Text style={[styles.rewardTitle, { color: '#FFFFFF' }]}>
                            All Rewards Unlocked!
                        </Text>
                        <Text style={[styles.rewardSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
                            You are a champion.
                        </Text>
                    </View>
                </LinearGradient>
            )}
        </View>
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
        marginBottom: 12,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    streakText: {
        fontSize: 20,
        fontWeight: '800',
        color: '#F97316',
        letterSpacing: -0.5,
    },
    rewardBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    rewardTextContainer: {
        flex: 1,
    },
    rewardTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    rewardSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
});
