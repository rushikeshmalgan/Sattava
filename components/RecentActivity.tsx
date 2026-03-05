import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';

export interface Activity {
    id: string;
    name: string;
    calories: number;
    time: string;
    type: 'food' | 'exercise' | 'water';
    amount?: string;
}

interface RecentActivityProps {
    activities: Activity[];
}

const RecentActivity = ({ activities }: RecentActivityProps) => {
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
                    {activities.map((activity) => (
                        <View key={activity.id} style={styles.activityItem}>
                            <View style={[styles.iconContainer,
                            activity.type === 'food' ? styles.foodIcon :
                                activity.type === 'exercise' ? styles.exerciseIcon : styles.waterIcon]}>
                                <Ionicons
                                    name={activity.type === 'food' ? 'restaurant' :
                                        activity.type === 'exercise' ? 'fitness' : 'water'}
                                    size={20}
                                    color="white"
                                />
                            </View>
                            <View style={styles.activityDetails}>
                                <Text style={styles.activityName}>{activity.name}</Text>
                                <Text style={styles.activityTime}>{activity.time}</Text>
                            </View>
                            <View style={styles.activityAmount}>
                                <Text style={styles.caloriesText}>
                                    {activity.type === 'food' ? `+${activity.calories} kcal` :
                                        activity.type === 'exercise' ? `-${activity.calories} kcal` :
                                            activity.amount}
                                </Text>
                            </View>
                        </View>
                    ))}
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
        // Shadow
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
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 15,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    foodIcon: { backgroundColor: '#EA580C' },
    exerciseIcon: { backgroundColor: '#DC2626' },
    waterIcon: { backgroundColor: '#0284C7' },
    activityDetails: {
        flex: 1,
    },
    activityName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.TEXT_MAIN,
    },
    activityTime: {
        fontSize: 12,
        color: Colors.TEXT_MUTED,
        marginTop: 2,
    },
    activityAmount: {
        alignItems: 'flex-end',
    },
    caloriesText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
    },
});
