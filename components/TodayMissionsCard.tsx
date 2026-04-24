import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/Colors';

interface Mission {
    id: string;
    label: string;
    isCompleted: boolean;
    icon: any;
}

interface TodayMissionsCardProps {
    waterMl: number;
    calories: number;
    targetCalories: number;
    mealsLogged: number;
}

export default function TodayMissionsCard({ waterMl, calories, targetCalories, mealsLogged }: TodayMissionsCardProps) {
    const { theme, isDark } = useTheme();

    const missions: Mission[] = [
        {
            id: 'water',
            label: 'Drink 2L water',
            isCompleted: waterMl >= 2000,
            icon: 'water',
        },
        {
            id: 'calories',
            label: 'Stay within calorie goal',
            isCompleted: calories > 0 && calories <= targetCalories,
            icon: 'flame',
        },
        {
            id: 'meals',
            label: 'Log 3 meals',
            isCompleted: mealsLogged >= 3,
            icon: 'restaurant',
        }
    ];

    return (
        <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>Today's Missions</Text>
            
            <View style={styles.missionsList}>
                {missions.map(mission => (
                    <View key={mission.id} style={styles.missionRow}>
                        <View style={[styles.iconBox, { backgroundColor: mission.isCompleted ? theme.primary + '20' : theme.border }]}>
                            <Ionicons 
                                name={mission.icon} 
                                size={16} 
                                color={mission.isCompleted ? theme.primary : theme.textMuted} 
                            />
                        </View>
                        <Text style={[
                            styles.missionLabel, 
                            { color: mission.isCompleted ? theme.text : theme.textMuted },
                            mission.isCompleted && { textDecorationLine: 'line-through', opacity: 0.6 }
                        ]}>
                            {mission.label}
                        </Text>
                        {mission.isCompleted ? (
                            <Ionicons name="checkmark-circle" size={20} color={theme.primary} style={styles.checkIcon} />
                        ) : (
                            <Ionicons name="ellipse-outline" size={20} color={theme.border} style={styles.checkIcon} />
                        )}
                    </View>
                ))}
            </View>
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
    title: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 12,
    },
    missionsList: {
        gap: 12,
    },
    missionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    missionLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
    checkIcon: {
        marginLeft: 'auto',
    },
});
