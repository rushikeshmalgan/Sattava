import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeType } from '../constants/theme';
import { getFoodSuggestions, Mood, Preference, SuggestionResult } from '../services/foodSuggestionService';
import { Colors } from '../constants/Colors';
import { addFoodLog } from '../services/logService';
import { useUser } from '@clerk/clerk-expo';
import OrderHealthyCard from './OrderHealthyCard';

interface Props {
    visible: boolean;
    onClose: () => void;
    theme: ThemeType;
    userGoal: string;
}

export default function SuggestFoodModal({ visible, onClose, theme, userGoal }: Props) {
    const { user } = useUser();
    const [preference, setPreference] = useState<Preference>('Veg');
    const [mood, setMood] = useState<Mood>('Light');
    const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [loggingId, setLoggingId] = useState<string | null>(null);

    const handleSuggest = async () => {
        setLoading(true);
        try {
            const results = await getFoodSuggestions(
                (userGoal as any) || 'Maintain Weight',
                preference,
                mood
            );
            setSuggestions(results);
        } catch (error) {
            console.error("Suggestion error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogFood = async (result: SuggestionResult) => {
        if (!user?.id) return;
        setLoggingId(result.food.id);
        const dateStr = new Date().toISOString().split('T')[0];
        try {
            await addFoodLog(user.id, dateStr, {
                id: result.food.id,
                name: result.food.name,
                calories: result.food.calories,
                carbs: result.food.carbs,
                protein: result.food.protein,
                fat: result.food.fat,
                fiber: result.food.fiber,
                servingSize: '1 serving',
            });
            onClose();
        } catch (error) {
            console.error('Error logging suggested food:', error);
        } finally {
            setLoggingId(null);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.text }]}>What should I eat?</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={theme.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Dietary Preference</Text>
                        <View style={styles.chipRow}>
                            {['Veg', 'Non-Veg'].map((opt) => (
                                <TouchableOpacity
                                    key={opt}
                                    style={[
                                        styles.chip,
                                        { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
                                        preference === opt && { backgroundColor: theme.primary, borderColor: theme.primary },
                                    ]}
                                    onPress={() => setPreference(opt as Preference)}
                                >
                                    <Text style={[styles.chipText, { color: theme.text }, preference === opt && { color: '#fff' }]}>
                                        {opt}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.label, { color: theme.textSecondary, marginTop: 16 }]}>How are you feeling?</Text>
                        <View style={styles.chipRow}>
                            {['Light', 'Heavy', 'Cheat'].map((opt) => (
                                <TouchableOpacity
                                    key={opt}
                                    style={[
                                        styles.chip,
                                        { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
                                        mood === opt && { backgroundColor: theme.primary, borderColor: theme.primary },
                                    ]}
                                    onPress={() => setMood(opt as Mood)}
                                >
                                    <Text style={[styles.chipText, { color: theme.text }, mood === opt && { color: '#fff' }]}>
                                        {opt}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity 
                            style={[styles.suggestBtn, { backgroundColor: theme.primary }]} 
                            onPress={handleSuggest}
                        >
                            <Ionicons name="sparkles" size={18} color="#fff" />
                            <Text style={styles.suggestBtnText}>Generate Suggestions</Text>
                        </TouchableOpacity>

                        {loading && (
                            <View style={styles.loadingBox}>
                                <ActivityIndicator size="large" color={theme.primary} />
                                <Text style={[styles.loadingText, { color: theme.textMuted }]}>Generating AI suggestions...</Text>
                            </View>
                        )}

                        {!loading && suggestions.length > 0 && (
                            <View style={styles.resultsContainer}>
                                <Text style={[styles.resultsTitle, { color: theme.text }]}>Smart Picks for You</Text>
                                {suggestions.map((res, i) => (
                                    <View key={i} style={[styles.resultCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
                                        <View style={styles.resultHeader}>
                                            <Text style={[styles.foodName, { color: theme.text }]}>{res.food.name}</Text>
                                            <Text style={[styles.foodCal, { color: theme.primary }]}>{Math.round(res.food.calories)} kcal</Text>
                                        </View>
                                        <View style={styles.macroRow}>
                                            <Text style={[styles.macroText, { color: theme.macroProtein }]}>P: {res.food.protein}g</Text>
                                            <Text style={[styles.macroText, { color: theme.macroCarbs }]}>C: {res.food.carbs}g</Text>
                                            <Text style={[styles.macroText, { color: theme.macroFat }]}>F: {res.food.fat}g</Text>
                                        </View>
                                        <View style={[styles.reasonBox, { backgroundColor: theme.primary + '15' }]}>
                                            <Ionicons name="bulb" size={14} color={theme.primary} style={{ marginRight: 6 }} />
                                            <Text style={[styles.reasonText, { color: theme.primary }]}>{res.reason}</Text>
                                        </View>
                                        <TouchableOpacity 
                                            style={[styles.logBtn, { backgroundColor: theme.primary }]}
                                            onPress={() => handleLogFood(res)}
                                            disabled={loggingId === res.food.id}
                                        >
                                            {loggingId === res.food.id ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Text style={styles.logBtnText}>Log this</Text>
                                            )}
                                        </TouchableOpacity>
                                        
                                        <OrderHealthyCard suggestion={res.food.name} type="meal" />
                                        <OrderHealthyCard suggestion={res.food.name} type="ingredients" />
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%', borderWidth: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: '800' },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
    chipText: { fontSize: 14, fontWeight: '600' },
    suggestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, marginTop: 24, gap: 8 },
    suggestBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    loadingBox: { alignItems: 'center', marginTop: 40, paddingBottom: 40 },
    loadingText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
    resultsContainer: { marginTop: 24, paddingBottom: 20 },
    resultsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
    resultCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
    resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    foodName: { fontSize: 16, fontWeight: '700', flex: 1, paddingRight: 8 },
    foodCal: { fontSize: 15, fontWeight: '700' },
    macroRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    macroText: { fontSize: 12, fontWeight: '700' },
    reasonBox: { flexDirection: 'row', padding: 10, borderRadius: 8, marginBottom: 16, alignItems: 'center' },
    reasonText: { fontSize: 13, fontWeight: '600', flex: 1 },
    logBtn: { padding: 12, borderRadius: 12, alignItems: 'center' },
    logBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' }
});
