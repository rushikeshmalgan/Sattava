import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/Colors';
import { SegmentedHalfCircleProgress } from './SegmentedHalfCircleProgress';
import { useTheme } from '../context/ThemeContext';
import { ThemeType } from '../constants/theme';
import { getDietScoreInsight } from '../services/geminiVisionService';

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
const CaloriesCard = React.memo(({
    target,
    consumed,
    burned,
    onEdit,
    macros
}: CaloriesCardProps) => {
    const { theme } = useTheme();
    const [insight, setInsight] = React.useState<string | null>(null);
    const [loadingInsight, setLoadingInsight] = React.useState(false);

    const handleGetInsight = async () => {
        setLoadingInsight(true);
        try {
            const text = await getDietScoreInsight(
                { calories: consumed, protein: 60 - macros.protein, carbs: 250 - macros.carbs, fat: 70 - macros.fat },
                { calories: target, protein: 60, carbs: 250, fat: 70 }
            );
            setInsight(text);
        } catch (error) {
            setInsight("Great job today! Keep tracking to reach your goals.");
        } finally {
            setLoadingInsight(false);
        }
    };

    const styles = getStyles(theme);

    // Progress is calculated based on consumed calories only (not net of burned)
    // This accounts for the full dietary intake regardless of exercise
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
                    value={Math.round(remaining)}
                    label="Remaining"
                />
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Consumed</Text>
                    <Text style={styles.statValue}>{Math.round(consumed)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Burned</Text>
                    <Text style={[styles.statValue, { color: Colors.SECONDARY }]}>{Math.round(burned)}</Text>
                </View>
            </View>

            <View style={styles.macrosContainer}>
                <View style={styles.macroCard}>
                    <Ionicons name="restaurant-outline" size={24} color={Colors.PRIMARY} />
                    <Text style={styles.macroValue}>{Math.round(macros.carbs)}g</Text>
                    <Text style={styles.macroLabel}>Carbs Left</Text>
                </View>

                <View style={styles.macroCard}>
                    <Ionicons name="barbell-outline" size={24} color={Colors.SECONDARY} />
                    <Text style={styles.macroValue}>{Math.round(macros.protein)}g</Text>
                    <Text style={styles.macroLabel}>Proteins Left</Text>
                </View>

                <View style={styles.macroCard}>
                    <Ionicons name="leaf-outline" size={24} color={theme.macroFat || theme.accent} />
                    <Text style={styles.macroValue}>{Math.round(macros.fat)}g</Text>
                    <Text style={styles.macroLabel}>Fats Left</Text>
                </View>
            </View>

            <View style={styles.insightSection}>
                <TouchableOpacity 
                    style={[styles.insightButton, { backgroundColor: theme.primary + '20' }]} 
                    onPress={handleGetInsight}
                    disabled={loadingInsight}
                >
                    {loadingInsight ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                        <>
                            <Ionicons name="sparkles" size={16} color={theme.primary} />
                            <Text style={[styles.insightButtonText, { color: theme.primary }]}>Why this score today?</Text>
                        </>
                    )}
                </TouchableOpacity>

                {insight && (
                    <View style={styles.insightTextContainer}>
                        <Text style={styles.insightText}>{insight}</Text>
                    </View>
                )}
            </View>
        </View>
    );
});

export default CaloriesCard;

const getStyles = (theme: ThemeType) => StyleSheet.create({
    card: {
        backgroundColor: theme.card,
        borderRadius: 22,
        padding: 24,
        marginVertical: 5,
        ...theme.shadow,
        borderWidth: 1,
        borderColor: theme.border,
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
        color: theme.text,
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
        color: theme.textMuted,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.text,
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: theme.border,
    },
    macrosContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 20,
    },
    macroCard: {
        flex: 1,
        backgroundColor: theme.background,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    macroLabel: {
        fontSize: 11,
        color: theme.textMuted,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    macroValue: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.text,
    },
    insightSection: {
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: theme.border,
    },
    insightButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 8,
    },
    insightButtonText: {
        fontSize: 13,
        fontWeight: '700',
    },
    insightTextContainer: {
        marginTop: 12,
        padding: 12,
        backgroundColor: theme.background,
        borderRadius: 12,
    },
    insightText: {
        fontSize: 13,
        lineHeight: 18,
        color: theme.text,
        fontStyle: 'italic',
    },
});
