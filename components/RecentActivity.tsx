import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';

export interface Activity {
    id: string;
    name: string;
    calories: number;
    time: string;
    type: 'food' | 'exercise' | 'water' | 'cardio' | 'weight' | 'manual';
    amount?: string;
    intensity?: string;
    duration?: number;
}

interface RecentActivityProps {
    activities: Activity[];
}

const RecentActivity = ({ activities }: RecentActivityProps) => {
    const getActivityIcon = (activity: Activity) => {
        if (activity.type === 'water') return 'water';
        if (activity.type === 'food' || activity.type === 'manual') return 'restaurant';
        const name = (activity.name || '').toLowerCase();
        if (activity.type === 'cardio' || name.includes('cardio')) return 'walk';
        if (activity.type === 'weight' || name.includes('weight')) return 'barbell';
        return 'fitness';
    };

    const getActivityColor = (activity: Activity) => {
        if (activity.type === 'water') return '#0284C7';
        if (activity.type === 'food' || activity.type === 'manual') return '#10B981';
        const name = (activity.name || '').toLowerCase();
        if (activity.type === 'cardio' || name.includes('cardio')) return '#3B82F6';
        if (activity.type === 'weight' || name.includes('weight')) return '#EF4444';
        return Colors.PRIMARY;
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Recent Activity</Text>

            {activities.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                        <Ionicons name="clipboard-outline" size={40} color={Colors.PRIMARY} />
                    </View>
                    <Text style={styles.emptyText}>No activity found for today</Text>
                    <Text style={styles.emptySubtext}>Tap the + button to log your first activity!</Text>
                </View>
            ) : (
                <View style={styles.activityList}>
                    {activities.map((activity) => {
                        const isExercise = ['cardio', 'weight', 'manual', 'exercise'].includes(activity.type);
                        const icon = getActivityIcon(activity);
                        const color = getActivityColor(activity);
                        if (isExercise) {
                            return (
                                <View key={activity.id} style={styles.activityCard}>
                                    <View style={[styles.bigIconContainer, { backgroundColor: `${color}15` }]}>
                                        <Ionicons
                                            name={icon as any}
                                            size={32}
                                            color={color}
                                        />
                                    </View>
                                    <View style={styles.activityContent}>
                                        <View style={styles.exerciseHeader}>
                                            <Text style={styles.activityName}>{activity.name || ''}</Text>
                                            <Text style={styles.logTimeTopRight}>{activity.time || ''}</Text>
                                        </View>
                                        <View style={styles.caloriesRow}>
                                            <Ionicons name="flame" size={16} color="#FF6347" />
                                            <Text style={styles.caloriesValueText}>
                                                {activity.calories || 0} Calories
                                            </Text>
                                        </View>
                                        <View style={styles.verticalStats}>
                                            {activity.intensity ? (
                                                <Text style={styles.statsText}>Intensity: {activity.intensity}</Text>
                                            ) : null}
                                            {activity.duration ? (
                                                <Text style={styles.statsText}>Duration: {activity.duration} min</Text>
                                            ) : null}
                                        </View>
                                    </View>
                                </View>
                            );
                        }
                        return (
                            <View key={activity.id} style={styles.activityCard}>
                                <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                                    <Ionicons
                                        name={icon as any}
                                        size={24}
                                        color={color}
                                    />
                                </View>
                                <View style={styles.activityContent}>
                                    <View style={styles.activityHeader}>
                                        <Text style={styles.activityName}>{activity.name || ''}</Text>
                                        <Text style={styles.activityTime}>{activity.time || ''}</Text>
                                    </View>
                                    <Text style={styles.caloriesText}>
                                        {activity.type === 'water' ? (activity.amount || '') : `${activity.calories || 0} Calories`}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
};

export default RecentActivity;

const styles = StyleSheet.create({
    container: {
        marginTop: 10,
        marginBottom: 24,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
        marginBottom: 15,
    },
    emptyState: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${Colors.PRIMARY}10`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.TEXT_MUTED,
        textAlign: 'center',
        marginTop: 5,
    },
    activityList: {
        gap: 12,
    },
    activityCard: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f5f5f5',
    },
    activityItem: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        marginBottom: 8,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    bigIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    activityContent: {
        flex: 1,
        justifyContent: 'center',
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    exerciseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    activityName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
    },
    activityTime: {
        fontSize: 12,
        color: Colors.TEXT_MUTED,
    },
    logTimeTopRight: {
        fontSize: 12,
        color: Colors.TEXT_MUTED,
        fontWeight: '500',
    },
    caloriesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 6,
    },
    caloriesValueText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
    },
    verticalStats: {
        gap: 2,
    },
    statsText: {
        fontSize: 12,
        color: Colors.TEXT_MUTED,
        fontWeight: '500',
    },
    statsLine: {
        fontSize: 12,
        color: Colors.TEXT_MUTED,
        fontWeight: '500',
    },
    caloriesText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.TEXT_MUTED,
        marginBottom: 2,
    },
    extraInfo: {
        fontSize: 12,
        color: Colors.TEXT_MUTED,
        fontWeight: '500',
    },
});
