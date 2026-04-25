import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { computeAchievements, ALL_ACHIEVEMENTS } from '../components/AchievementSection';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AchievementsScreen() {
    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    // Mock stats for demo purposes
    const [userStats, setUserStats] = React.useState({
        streak: 5,
        mealsLogged: 32,
        hitWaterGoal: true,
        maxStepsInDay: 12000,
        hasUsedAIChat: true,
        bestDietScore: 85,
    });

    React.useEffect(() => {
        const checkGodMode = async () => {
            const godMode = await AsyncStorage.getItem('demoGodMode');
            if (godMode === 'true') {
                setUserStats({
                    streak: 15,
                    mealsLogged: 100,
                    hitWaterGoal: true,
                    maxStepsInDay: 20000,
                    hasUsedAIChat: true,
                    bestDietScore: 100,
                });
            }
        };
        checkGodMode();
    }, []);

    const unlockedSet = computeAchievements(userStats) || new Set();
    const unlockedCount = unlockedSet?.size || 0;
    const achievementsList = Array.isArray(ALL_ACHIEVEMENTS) ? ALL_ACHIEVEMENTS : [];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Trophy Room</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Ionicons name="trophy" size={32} color="#F59E0B" />
                    <View style={styles.statsText}>
                        <Text style={[styles.statsTitle, { color: theme.text }]}>
                            {unlockedCount} / {achievementsList.length} Unlocked
                        </Text>
                        <Text style={[styles.statsSub, { color: theme.textMuted }]}>
                            Keep logging to unlock more badges!
                        </Text>
                    </View>
                </View>

                <View style={styles.grid}>
                    {achievementsList.map(achievement => {
                        const isUnlocked = unlockedSet.has(achievement.id);
                        return (
                            <View key={achievement.id} style={[styles.badgeCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                {isUnlocked ? (
                                    <LinearGradient
                                        colors={achievement.gradient as [string, string]}
                                        style={styles.badgeInner}
                                    >
                                        <Ionicons name={achievement.icon as any} size={32} color="#FFFFFF" />
                                    </LinearGradient>
                                ) : (
                                    <View style={[styles.badgeInner, styles.badgeLocked, { backgroundColor: theme.border }]}>
                                        <Ionicons name="lock-closed" size={24} color={theme.textLight} />
                                    </View>
                                )}
                                
                                <Text style={[styles.badgeLabel, { color: isUnlocked ? theme.text : theme.textMuted }]}>
                                    {achievement.label}
                                </Text>
                                <Text style={[styles.badgeDesc, { color: theme.textMuted }]}>
                                    {achievement.desc}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(150,150,150,0.1)',
    },
    backBtn: {
        padding: 8,
        marginLeft: -8,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    statsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 24,
        gap: 16,
    },
    statsText: {
        flex: 1,
    },
    statsTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    statsSub: {
        fontSize: 13,
        fontWeight: '500',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    badgeCard: {
        width: '47%',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    badgeInner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    badgeLocked: {
        opacity: 0.4,
    },
    badgeLabel: {
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 4,
    },
    badgeDesc: {
        fontSize: 11,
        textAlign: 'center',
        lineHeight: 14,
    },
});
