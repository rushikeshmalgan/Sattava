import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeType } from '../constants/theme';
import { UnifiedFoodResult } from '../services/foodSearchService';
import { validateFoodIntake, FoodValidationResult, ChatContext } from '../services/aiCoach';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

interface Props {
    visible: boolean;
    food: UnifiedFoodResult | null;
    theme: ThemeType;
    context: ChatContext | null;
    onClose: () => void;
    onLog: (multiplier: number, portionName: string) => void;
}

export default function PortionSelectorModal({ visible, food, theme: propsTheme, context, onClose, onLog }: Props) {
    const { theme, isDark } = useTheme();
    const [quantity, setQuantity] = useState('1');
    const [portionUnit, setPortionUnit] = useState('serving');
    const [validation, setValidation] = useState<FoodValidationResult | null>(null);

    useEffect(() => {
        if (food) {
            setQuantity('1');
            // Auto-detect common Indian portions
            const name = food.name.toLowerCase();
            if (name.includes('roti') || name.includes('chapati') || name.includes('paratha') || name.includes('naan')) {
                setPortionUnit('piece');
            } else if (name.includes('dal') || name.includes('sabzi') || name.includes('curry') || name.includes('paneer')) {
                setPortionUnit('katori (bowl)');
            } else if (name.includes('rice') || name.includes('pulao') || name.includes('biryani')) {
                setPortionUnit('plate');
            } else if (name.includes('milk') || name.includes('tea') || name.includes('coffee') || name.includes('juice') || name.includes('lassi')) {
                setPortionUnit('glass/cup');
            } else {
                // Default to whatever serving size is provided, or 'serving'
                setPortionUnit(food.servingSize || 'serving');
            }
        }
    }, [food]);

    useEffect(() => {
        if (food && context) {
            const result = validateFoodIntake(food, context, parseFloat(quantity) || 1);
            setValidation(result);
            
            // Trigger haptics based on health score
            if (result.score === 'Unhealthy') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } else if (result.score === 'Healthy') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        }
    }, [food, context, quantity]);

    if (!food) return null;

    const numQty = parseFloat(quantity) || 1;
    const totalCalories = Math.round(food.calories * numQty);
    const totalProtein = Math.round(food.protein * numQty * 10) / 10;
    const totalCarbs = Math.round(food.carbs * numQty * 10) / 10;
    const totalFat = Math.round(food.fat * numQty * 10) / 10;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.text }]}>Select Portion</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={theme.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.foodName, { color: theme.primary }]}>{food.name}</Text>
                    
                    <View style={styles.inputContainer}>
                        <View style={[styles.qtyBox, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
                            <TouchableOpacity onPress={() => setQuantity(Math.max(0.5, numQty - 0.5).toString())} style={styles.qtyBtn}>
                                <Ionicons name="remove" size={20} color={theme.text} />
                            </TouchableOpacity>
                            <TextInput 
                                style={[styles.qtyInput, { color: theme.text }]}
                                value={quantity}
                                onChangeText={setQuantity}
                                keyboardType="numeric"
                            />
                            <TouchableOpacity onPress={() => setQuantity((numQty + 0.5).toString())} style={styles.qtyBtn}>
                                <Ionicons name="add" size={20} color={theme.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.unitText, { color: theme.textSecondary }]}>× {portionUnit}</Text>
                    </View>

                    <View style={[styles.macroBox, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
                        <Text style={[styles.totalCal, { color: theme.text }]}>{totalCalories} kcal</Text>
                        <View style={styles.macroRow}>
                            <Text style={[styles.macroText, { color: theme.macroProtein }]}>P: {totalProtein}g</Text>
                            <Text style={[styles.macroText, { color: theme.macroCarbs }]}>C: {totalCarbs}g</Text>
                            <Text style={[styles.macroText, { color: theme.macroFat }]}>F: {totalFat}g</Text>
                        </View>
                    </View>

                    {/* Health Detection Popup */}
                    {validation && (
                        <Animated.View 
                            entering={FadeInDown.springify().damping(15)} 
                            exiting={FadeOutUp}
                            style={styles.validationWrapper}
                        >
                            <View style={[styles.validationContent, { borderColor: validation.color + '40', backgroundColor: validation.color + '08' }]}>
                                <View style={styles.validationBody}>
                                    <View style={styles.scoreRow}>
                                        <View style={[styles.scoreBadge, { backgroundColor: validation.color }]}>
                                            <Ionicons name={validation.icon as any} size={14} color="#FFF" />
                                            <Text style={styles.scoreText}>{validation.score}</Text>
                                        </View>
                                        <Text style={[styles.aiTitle, { color: theme.textSecondary }]}>Sattva Analysis</Text>
                                    </View>
                                    
                                    <Text style={[styles.validationReason, { color: theme.text }]}>
                                        {validation.reason}
                                    </Text>
                                    
                                    {validation.suggestion && (
                                        <View style={[styles.suggestionBox, { backgroundColor: theme.surfaceMuted }]}>
                                            <Text style={[styles.validationSuggestion, { color: theme.textSecondary }]}>
                                                💡 {validation.suggestion}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </Animated.View>
                    )}

                    <TouchableOpacity 
                        style={[styles.logBtn, { backgroundColor: theme.primary }]}
                        onPress={() => onLog(numQty, portionUnit)}
                    >
                        <Text style={styles.logBtnText}>Log {totalCalories} kcal</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 24, padding: 24, borderWidth: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 20, fontWeight: '800' },
    foodName: { fontSize: 18, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 },
    qtyBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1 },
    qtyBtn: { padding: 12 },
    qtyInput: { width: 40, textAlign: 'center', fontSize: 18, fontWeight: '700' },
    unitText: { fontSize: 16, fontWeight: '600' },
    macroBox: { padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 24, borderWidth: 1 },
    totalCal: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
    macroRow: { flexDirection: 'row', gap: 16 },
    macroText: { fontSize: 14, fontWeight: '700' },
    logBtn: { padding: 16, borderRadius: 16, alignItems: 'center' },
    logBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    validationWrapper: {
        marginBottom: 24,
        borderRadius: 20,
        overflow: 'hidden',
    },
    validationContent: {
        borderRadius: 20,
        borderWidth: 2,
        padding: 16,
    },
    validationBody: {
        gap: 12,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    scoreBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    scoreText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    aiTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
        opacity: 0.8,
    },
    validationReason: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 20,
    },
    suggestionBox: {
        padding: 12,
        borderRadius: 12,
    },
    validationSuggestion: {
        fontSize: 13,
        lineHeight: 18,
        fontStyle: 'italic',
    }
});
