import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { SegmentedHalfCircleProgress } from './SegmentedHalfCircleProgress';

interface CaloriesCardProps {
    consumed: number;
    burned: number;
    target: number;
    onEdit: () => void;
    macros: {
        carbs: number;
        protein: number;
        fat: number;
    };
}
const CaloriesCard = ({
    target,
    consumed,
    burned,
    onEdit,
    macros
}: CaloriesCardProps) => {

    // Net consumed is what's actually taken in minus what was burned
    const netConsumed = consumed - burned;
    // const progress =
    //     target > 0
    //         ? Math.min(Math.max(consumed / target, 0), 1)
    //         : 0;
    const remaining = target - consumed + burned;
    const progress = consumed / target;
    // Remaining = Target - Consumed + Burned
    // const remaining = Math.max(target - consumed + burned, 0);
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.title}>Calories</Text>
                <TouchableOpacity onPress={onEdit}>
                    <Ionicons
                        name="pencil"
                        size={18}
                        color={Colors.PRIMARY}
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.progressContainer}>
                <SegmentedHalfCircleProgress
                    progress={progress}
                    size={280}
                    strokeWidth={50}
                    segments={11}
                    gapAngle={1}
                    value={remaining}
                    label="Remaining"
                />
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Consumed</Text>
                    <Text style={styles.statValue}>{consumed}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Burned</Text>
                    <Text style={[styles.statValue, { color: '#FF6347' }]}>{burned}</Text>
                </View>
            </View>

            <View style={styles.macrosContainer}>
                <View style={styles.macroCard}>
                    <Ionicons name="restaurant-outline" size={24} color="#EA580C" />
                    <Text style={styles.macroValue}>{macros.carbs}g</Text>
                    <Text style={styles.macroLabel}>Carbs Left</Text>
                </View>

                <View style={styles.macroCard}>
                    <Ionicons name="barbell-outline" size={24} color="#DC2626" />
                    <Text style={styles.macroValue}>{macros.protein}g</Text>
                    <Text style={styles.macroLabel}>Proteins Left</Text>
                </View>

                <View style={styles.macroCard}>
                    <Ionicons name="water-outline" size={24} color="#0284C7" />
                    <Text style={styles.macroValue}>{macros.fat}g</Text>
                    <Text style={styles.macroLabel}>Fats Left</Text>
                </View>
            </View>
        </View>
    );
};

export default CaloriesCard;

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        marginVertical: 5,

        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 15,

        elevation: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
    },
    editText: {
        color: Colors.PRIMARY,
        fontWeight: '600',
        fontSize: 16,
    },
    progressContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        gap: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: Colors.TEXT_MUTED,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: '#f0f0f0',
    },
    macrosContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 20,
    },
    macroCard: {
        flex: 1,
        backgroundColor: `${Colors.PRIMARY}10`,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    macroLabel: {
        fontSize: 11,
        color: Colors.TEXT_MUTED,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    macroValue: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.TEXT_MAIN,
    },
});
