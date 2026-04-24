import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { generateMealCombo, MealCombo } from '../services/mealComboService';
import { addFoodLog } from '../services/logService';
import { useUser } from '@clerk/clerk-expo';
import OrderHealthyCard from '../components/OrderHealthyCard';

export default function ComboBuilderScreen() {
    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useUser();

    const [targetCal, setTargetCal] = useState('400');
    const [prioritizeProtein, setPrioritizeProtein] = useState(false);
    const [combos, setCombos] = useState<MealCombo[]>([]);
    const [loading, setLoading] = useState(false);
    const [loggingIndex, setLoggingIndex] = useState<number | null>(null);

    const handleBuild = () => {
        const cals = parseInt(targetCal);
        if (isNaN(cals) || cals < 100 || cals > 2000) {
            Alert.alert('Invalid Target', 'Please enter a target between 100 and 2000 kcal.');
            return;
        }

        setLoading(true);
        setTimeout(() => {
            const results = generateMealCombo(cals, prioritizeProtein);
            setCombos(results);
            setLoading(false);
        }, 500);
    };

    const handleLogCombo = async (combo: MealCombo, index: number) => {
        if (!user?.id) return;
        setLoggingIndex(index);
        const dateStr = new Date().toISOString().split('T')[0];
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        try {
            // Log Main
            await addFoodLog(user.id, dateStr, {
                id: combo.main.id + '-' + Date.now(), name: combo.main.name, calories: combo.main.calories, carbs: combo.main.carbs, protein: combo.main.protein, fat: combo.main.fat, fiber: combo.main.fiber, servingSize: '1 serving'
            });
            // Log Side
            await addFoodLog(user.id, dateStr, {
                id: combo.side.id + '-' + Date.now(), name: combo.side.name, calories: combo.side.calories, carbs: combo.side.carbs, protein: combo.side.protein, fat: combo.side.fat, fiber: combo.side.fiber, servingSize: '1 serving'
            });
            // Log Extra
            if (combo.extra) {
                await addFoodLog(user.id, dateStr, {
                    id: combo.extra.id + '-' + Date.now(), name: combo.extra.name, calories: combo.extra.calories, carbs: combo.extra.carbs, protein: combo.extra.protein, fat: combo.extra.fat, fiber: combo.extra.fiber, servingSize: '1 serving'
                });
            }

            Alert.alert('Success', 'Meal combo logged successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to log combo.');
        } finally {
            setLoggingIndex(null);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>AI Meal Combo Builder</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Target Calories</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
                        <Ionicons name="flame" size={20} color={theme.primary} style={{ marginRight: 10 }} />
                        <TextInput
                            style={[styles.input, { color: theme.text }]}
                            value={targetCal}
                            onChangeText={setTargetCal}
                            keyboardType="numeric"
                            placeholder="e.g. 400"
                            placeholderTextColor={theme.textMuted}
                        />
                        <Text style={{ color: theme.textMuted, fontWeight: '600' }}>kcal</Text>
                    </View>

                    <View style={styles.switchRow}>
                        <View>
                            <Text style={[styles.switchTitle, { color: theme.text }]}>Maximize Protein</Text>
                            <Text style={[styles.switchSub, { color: theme.textMuted }]}>Sort combos by highest protein yield</Text>
                        </View>
                        <Switch
                            value={prioritizeProtein}
                            onValueChange={setPrioritizeProtein}
                            trackColor={{ false: theme.border, true: theme.primary }}
                            thumbColor="#fff"
                        />
                    </View>

                    <TouchableOpacity style={[styles.buildBtn, { backgroundColor: theme.primary }]} onPress={handleBuild}>
                        <Ionicons name="color-wand" size={18} color="#fff" />
                        <Text style={styles.buildBtnText}>Generate Combos</Text>
                    </TouchableOpacity>
                </View>

                {loading && (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={[styles.loadingText, { color: theme.textMuted }]}>Assembling perfect meals...</Text>
                    </View>
                )}

                {!loading && combos.length > 0 && (
                    <View style={styles.resultsSection}>
                        <Text style={[styles.resultsTitle, { color: theme.text }]}>Top Combinations</Text>
                        
                        {Array.isArray(combos) && combos.map((combo, idx) => (
                            <View key={idx} style={[styles.comboCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
                                <View style={styles.comboHeader}>
                                    <View>
                                        <Text style={[styles.comboCal, { color: theme.primary }]}>{Math.round(combo.totalCalories)} kcal</Text>
                                        <Text style={[styles.comboMacros, { color: theme.textMuted }]}>
                                            P: {Math.round(combo.totalProtein)}g • C: {Math.round(combo.totalCarbs)}g • F: {Math.round(combo.totalFat)}g
                                        </Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={[styles.logBtn, { backgroundColor: theme.primary }]}
                                        onPress={() => handleLogCombo(combo, idx)}
                                        disabled={loggingIndex !== null}
                                    >
                                        {loggingIndex === idx ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={styles.logBtnText}>Log Meal</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.divider} />

                                <View style={styles.itemsList}>
                                    <View style={styles.foodItem}>
                                        <Text style={[styles.foodDot, { color: theme.text }]}>•</Text>
                                        <Text style={[styles.foodName, { color: theme.text }]}>{combo.main.name}</Text>
                                    </View>
                                    <View style={styles.foodItem}>
                                        <Text style={[styles.foodDot, { color: theme.text }]}>•</Text>
                                        <Text style={[styles.foodName, { color: theme.text }]}>{combo.side.name}</Text>
                                    </View>
                                    {combo.extra && (
                                        <View style={styles.foodItem}>
                                            <Text style={[styles.foodDot, { color: theme.text }]}>•</Text>
                                            <Text style={[styles.foodName, { color: theme.text }]}>{combo.extra.name}</Text>
                                        </View>
                                    )}
                                </View>
                                
                                <OrderHealthyCard suggestion={combo.main.name} type="ingredients" />
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { padding: 8, marginLeft: -8 },
    title: { fontSize: 18, fontWeight: '700' },
    scrollContent: { padding: 16, paddingBottom: 100 },
    card: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 24 },
    label: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, marginBottom: 24 },
    input: { flex: 1, fontSize: 18, fontWeight: '700' },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    switchTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    switchSub: { fontSize: 13 },
    buildBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8 },
    buildBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    loadingBox: { alignItems: 'center', marginTop: 40 },
    loadingText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
    resultsSection: { marginTop: 8 },
    resultsTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
    comboCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
    comboHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    comboCal: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
    comboMacros: { fontSize: 12, fontWeight: '600' },
    logBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    logBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    divider: { height: 1, backgroundColor: 'rgba(150,150,150,0.2)', marginVertical: 12 },
    itemsList: { gap: 8 },
    foodItem: { flexDirection: 'row', alignItems: 'center' },
    foodDot: { fontSize: 16, marginRight: 8, fontWeight: 'bold' },
    foodName: { fontSize: 15, fontWeight: '500' }
});
