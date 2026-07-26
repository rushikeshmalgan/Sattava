import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeType } from '../constants/theme';
import { UnifiedFoodResult } from '../services/foodSearchService';

interface Props {
    visible: boolean;
    food: UnifiedFoodResult | null;
    theme: ThemeType;
    onClose: () => void;
    onLog: (multiplier: number, portionName: string) => void;
}

export default function PortionSelectorModal({ visible, food, theme, onClose, onLog }: Props) {
    const [quantity, setQuantity] = useState('1');
    const [portionUnit, setPortionUnit] = useState('serving');

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
    logBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
