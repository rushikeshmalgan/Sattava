import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { addFoodLog } from '../services/logService';
import { searchAllFoods, UnifiedFoodResult } from '../services/foodSearchService';
import { getHealthyAlternative } from '../constants/HealthyAlternatives';
import { useTheme } from '../context/ThemeContext';
import { ThemeType } from '../constants/theme';
import PortionSelectorModal from '../components/PortionSelectorModal';
import { showSmartToast } from '../components/SmartToast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import * as Haptics from 'expo-haptics';

const FoodSearchScreen = () => {
    const { user } = useUser();
    const router = useRouter();
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ query?: string }>();
    const inputRef = useRef<TextInput>(null);

    const [query, setQuery] = useState(params.query ?? '');
    const [results, setResults] = useState<UnifiedFoodResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [addingId, setAddingId] = useState<string | null>(null);
    const [selectedFoodForPortion, setSelectedFoodForPortion] = useState<UnifiedFoodResult | null>(null);
    const alternative = getHealthyAlternative(query);

    // Auto-search when navigated with a pre-filled query (from meal plan)
    useEffect(() => {
        if (params.query && params.query.trim().length >= 2) {
            performSearch(params.query.trim());
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Debounced search on manual typing
    useEffect(() => {
        if (query.trim().length >= 3) {
            const id = setTimeout(() => performSearch(query.trim()), 500);
            return () => clearTimeout(id);
        } else {
            setResults([]);
            setError(null);
        }
    }, [query]);

    const performSearch = async (searchQuery: string) => {
        try {
            setLoading(true);
            setError(null);

            await searchAllFoods(searchQuery, (partial) => {
                // Show local results immediately while online request is in flight
                setResults(partial);
                if (partial.length > 0) setLoading(false);
            }).then((all) => {
                setResults(all);
            });
        } catch (err: any) {
            setError(err.message || 'Failed to fetch results');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectFood = (food: UnifiedFoodResult) => {
        if (!user?.id) {
            Alert.alert('Error', 'Please sign in to log food.');
            return;
        }
        if (food.calories <= 0) {
            Alert.alert(
                'Nutrition Data Unavailable',
                `We couldn't find nutrition details for "${food.name}". Please search for a more specific item or log it manually.`
            );
            return;
        }
        setSelectedFoodForPortion(food);
    };

    const handleAddFood = async (multiplier: number, portionUnit: string) => {
        if (!user?.id || !selectedFoodForPortion) return;
        
        const food = selectedFoodForPortion;
        setAddingId(food.id);
        setSelectedFoodForPortion(null);
        if (food.calories <= 0) {
            Alert.alert(
                'Nutrition Data Unavailable',
                `We couldn't find nutrition details for "${food.name}". Please search for a more specific item or log it manually.`
            );
            setAddingId(null);
            return;
        }

        const dateString = new Date().toISOString().split('T')[0];
        const loggedCalories = Math.round(food.calories * multiplier);
        const loggedProtein = Math.round(food.protein * multiplier * 10) / 10;
        
        const logData = async () => {
            try {
                await addFoodLog(user.id!, dateString, {
                    id: food.id,
                    name: food.name,
                    calories: loggedCalories,
                    carbs: Math.round(food.carbs * multiplier * 10) / 10,
                    protein: loggedProtein,
                    fat: Math.round(food.fat * multiplier * 10) / 10,
                    fiber: food.fiber !== undefined ? Math.round(food.fiber * multiplier * 10) / 10 : undefined,
                    servingSize: `${multiplier} x ${portionUnit}`,
                });

                // Micro-dopamine!
                const message = loggedProtein >= 15 
                    ? `Nice choice! High protein 💪` 
                    : `${food.name} logged (${loggedCalories} kcal)`;
                
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showSmartToast({ message, icon: 'checkmark-circle' });
                
                // No notifications needed
                router.replace('/(tabs)/home');
            } catch {
                Alert.alert('Error', 'Failed to log food. Please try again.');
            } finally {
                setAddingId(null);
            }
        };

        if (loggedCalories >= 2000) {
            Alert.alert(
                "Unrealistic Entry Detected",
                `Logging ${loggedCalories} kcal at once. Are you bluffing or just extremely hungry? The coach is watching.`,
                [
                    { text: "Cancel", style: "cancel", onPress: () => setAddingId(null) },
                    { text: "I Really Ate This", onPress: logData }
                ]
            );
        } else if (loggedCalories >= 1200) {
            Alert.alert(
                "Bulk Entry Detected",
                "This looks like a massive entry. Please log mindfully.",
                [
                    { text: "Cancel", style: "cancel", onPress: () => setAddingId(null) },
                    { text: "Log Anyway", onPress: logData }
                ]
            );
        } else {
            await logData();
        }
    };

    const renderItem = ({ item }: { item: UnifiedFoodResult }) => {
        const isAdding = addingId === item.id;
        return (
            <View style={styles.card}>
                <View style={styles.cardContent}>
                    <View style={styles.nameRow}>
                        <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
                        {item.source === 'local' && (
                            <View style={styles.localBadge}>
                                <Text style={styles.localBadgeText}>Indian</Text>
                            </View>
                        )}
                    </View>
                    {!!item.brand && (
                        <Text style={styles.brandName}>{item.brand}</Text>
                    )}
                    <Text style={styles.servingText} numberOfLines={1}>{item.servingSize}</Text>
                    <Text style={styles.macroText} numberOfLines={1}>
                        {item.calories > 0
                            ? `${item.calories} kcal · P ${item.protein}g · C ${item.carbs}g · F ${item.fat}g${item.fiber !== undefined ? ` · Fiber ${item.fiber}g` : ''}`
                            : 'Nutrition data unavailable'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[
                        styles.addButton,
                        isAdding && { opacity: 0.6 },
                        item.calories <= 0 && styles.addButtonDisabled,
                    ]}
                    onPress={() => handleSelectFood(item)}
                    disabled={addingId !== null}
                >
                    {isAdding
                        ? <ActivityIndicator size="small" color="#FFFFFF" />
                        : <Ionicons name="add" size={24} color="#FFFFFF" />
                    }
                </TouchableOpacity>
            </View>
        );
    };

    const showHint = query.trim().length > 0 && query.trim().length < 3;

    return (
        <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex1}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color={Colors.TEXT_MAIN} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Search Food</Text>
                    <View style={styles.headerRight} />
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={Colors.TEXT_MUTED} style={styles.searchIcon} />
                    <TextInput
                        ref={inputRef}
                        style={styles.searchInput}
                        placeholder="Search Indian or packaged foods…"
                        placeholderTextColor={Colors.TEXT_MUTED}
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                        clearButtonMode="while-editing"
                        returnKeyType="search"
                    />
                </View>

                {/* Healthy Alternative Suggestion */}
                {alternative && (
                    <View style={[styles.alternativeBanner, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
                        <View style={styles.alternativeIcon}>
                            <Ionicons name="sparkles" size={18} color={theme.primary} />
                        </View>
                        <View style={styles.alternativeTextContent}>
                            <Text style={[styles.alternativeTitle, { color: theme.text }]}>
                                Try <Text style={{ color: theme.primary, fontWeight: '800' }}>{alternative.suggestion}</Text> instead?
                            </Text>
                            <Text style={[styles.alternativeReason, { color: theme.textMuted }]}>{alternative.reason}</Text>
                        </View>
                        <TouchableOpacity 
                            style={[styles.alternativeAction, { backgroundColor: theme.primary }]}
                            onPress={() => setQuery(alternative.suggestion)}
                        >
                            <Text style={styles.alternativeActionText}>Swap</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Content */}
                <View style={styles.contentContainer}>
                    {/* Short query hint */}
                    {showHint && (
                        <View style={styles.centerContainer}>
                            <Ionicons name="search-outline" size={40} color={Colors.TEXT_MUTED} />
                            <Text style={styles.hintText}>Type at least 3 characters to search…</Text>
                        </View>
                    )}

                    {/* Loading */}
                    {loading && !showHint && (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color={Colors.PRIMARY} />
                            <Text style={styles.loadingText}>Searching database…</Text>
                        </View>
                    )}

                    {/* Error */}
                    {!loading && error && (
                        <View style={styles.centerContainer}>
                            <Ionicons name="alert-circle-outline" size={48} color={Colors.ERROR} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* Empty */}
                    {!loading && !error && !showHint && query.trim().length >= 3 && results.length === 0 && (
                        <View style={styles.centerContainer}>
                            <Ionicons name="restaurant-outline" size={48} color={Colors.TEXT_MUTED} />
                            <Text style={styles.emptyText}>No results found for "{query}"</Text>
                            <Text style={styles.emptySubtext}>Try a different spelling or a more common name</Text>
                        </View>
                    )}

                    {/* Results */}
                    {!error && !showHint && (
                        <FlatList
                            data={results}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        />
                    )}
                </View>
            </KeyboardAvoidingView>

            <PortionSelectorModal 
                visible={selectedFoodForPortion !== null}
                food={selectedFoodForPortion}
                theme={theme}
                onClose={() => setSelectedFoodForPortion(null)}
                onLog={handleAddFood}
            />
        </SafeAreaView>
    );
};

export default FoodSearchScreen;

const getStyles = (theme: ThemeType) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    flex1: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: theme.background,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.card,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.text,
    },
    headerRight: {
        width: 40,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.card,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: theme.border,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: theme.text,
        height: '100%',
    },
    alternativeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
    },
    alternativeIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    alternativeTextContent: {
        flex: 1,
        marginRight: 8,
    },
    alternativeTitle: {
        fontSize: 13,
        fontWeight: '600',
    },
    alternativeReason: {
        fontSize: 11,
        marginTop: 2,
        lineHeight: 14,
    },
    alternativeAction: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    alternativeActionText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '700',
    },
    contentContainer: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        gap: 12,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.card,
        borderRadius: 20,
        padding: 16,
        marginVertical: 6,
        ...theme.shadow,
        borderWidth: 1,
        borderColor: theme.border,
    },
    cardContent: {
        flex: 1,
        marginRight: 12,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
        gap: 6,
    },
    foodName: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.text,
        flex: 1,
    },
    localBadge: {
        backgroundColor: theme.primary + '20',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: theme.primary + '40',
    },
    localBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: theme.primary,
        textTransform: 'uppercase',
    },
    brandName: {
        fontSize: 12,
        color: theme.primary,
        fontWeight: '600',
        marginBottom: 2,
    },
    servingText: {
        fontSize: 12,
        color: theme.textMuted,
        marginBottom: 2,
    },
    macroText: {
        fontSize: 12,
        color: theme.textMuted,
    },
    addButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonDisabled: {
        backgroundColor: theme.textMuted,
    },
    hintText: {
        fontSize: 14,
        color: theme.textMuted,
        textAlign: 'center',
    },
    loadingText: {
        fontSize: 14,
        color: theme.textMuted,
        textAlign: 'center',
    },
    errorText: {
        fontSize: 14,
        color: theme.error,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 15,
        color: theme.textMuted,
        textAlign: 'center',
        fontWeight: '600',
    },
    emptySubtext: {
        fontSize: 13,
        color: theme.textMuted,
        textAlign: 'center',
        opacity: 0.7,
    },
});
