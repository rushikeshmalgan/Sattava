import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { FoodSearchItem, searchFoods } from '../services/fatSecretService';
import { addFoodLog } from '../services/logService';
import { searchLocalIndianFoods } from '../services/localFoodService';
import { LocalIndianFood } from '../data/indianFoodsDatabase';

type UnifiedFoodItem = (FoodSearchItem & { isLocal?: boolean }) | (LocalIndianFood & { isLocal: true });

// Parses a value like "Calories: 95kcal" -> 95
const parseMacro = (description: string, key: string): number => {
    const regex = new RegExp(`${key}[:\\s]+([\\d.]+)`, 'i');
    const match = description?.match(regex);
    return match ? Math.round(parseFloat(match[1])) : 0;
};

const FoodSearchScreen = () => {
    const { user } = useUser();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UnifiedFoodItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [addingId, setAddingId] = useState<string | null>(null); // tracks which item is being added

    // Debounce search implementation
    useEffect(() => {
        if (query.trim().length >= 3) {
            const timeoutId = setTimeout(() => {
                performSearch(query.trim());
            }, 500); // 500ms debounce
            return () => clearTimeout(timeoutId);
        } else {
            setResults([]);
            setError(null);
        }
    }, [query]);

    const performSearch = async (searchQuery: string) => {
        try {
            setLoading(true);
            setError(null);

            // 1. Search Local CSV Data (Instant)
            const localRaw = searchLocalIndianFoods(searchQuery);
            const localResults = localRaw.map(item => ({
                ...item,
                isLocal: true,
                food_id: item.id,
                food_name: item.name,
            })) as UnifiedFoodItem[];

            // Show local results immediately!
            setResults(localResults);

            // If we have local results, we might not need the loading spinner anymore
            // but let's keep it if we expect online results.
            // Actually, let's stop the global loading if we have local hits to feel "fast".
            if (localResults.length > 0) {
                setLoading(false);
            }

            // 2. Search FatSecret (Online) - Background
            try {
                const onlineData = await searchFoods(searchQuery);
                // Combine: Local first (always at top), then Online
                setResults([...localResults, ...onlineData]);
            } catch (apiErr) {
                console.warn('[FoodSearch] API Search failed:', apiErr);
                // If API fails but we have local results, don't show error to user
                if (localResults.length === 0) {
                    throw apiErr;
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch results');
            // If error happens and we already have local results, maybe don't clear them?
            // But per logic above, catches only happen if locals are 0.
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddFood = async (food: UnifiedFoodItem) => {
        if (!user?.id) {
            Alert.alert('Error', 'Please sign in to log food.');
            return;
        }
        if (addingId) return; // prevent double-taps

        const foodId = 'isLocal' in food ? food.id : food.food_id;
        const foodName = 'isLocal' in food ? food.name : food.food_name;

        setAddingId(foodId);
        try {
            let calories = 0, carbs = 0, protein = 0, fat = 0, servingSize = '1 serving';

            if ('isLocal' in food && food.isLocal) {
                // It's a CSV local item
                calories = food.calories;
                carbs = food.carbs;
                protein = food.protein;
                fat = food.fat;
                servingSize = food.servingSize;
            } else {
                // It's a FatSecret item
                const desc = (food as FoodSearchItem).food_description || '';
                calories = parseMacro(desc, 'Calories');
                carbs = parseMacro(desc, 'Carbs');
                protein = parseMacro(desc, 'Protein');
                fat = parseMacro(desc, 'Fat');
                servingSize = desc.split('-')[0]?.trim() || '1 serving';
            }

            const dateString = new Date().toISOString().split('T')[0];
            await addFoodLog(user.id, dateString, {
                id: foodId,
                name: foodName,
                calories,
                carbs,
                protein,
                fat,
                servingSize,
            });

            Alert.alert('Added!', `${foodName} (${calories} kcal) logged successfully.`, [
                { text: 'Go Home', onPress: () => router.replace('/(tabs)/home') },
                { text: 'Keep Searching', style: 'cancel' },
            ]);
        } catch (err) {
            console.error('Failed to log food:', err);
            Alert.alert('Error', 'Failed to log food. Please try again.');
        } finally {
            setAddingId(null);
        }
    };

    const renderItem = ({ item }: { item: UnifiedFoodItem }) => {
        let name = '', brand = '', serving = '', calDesc = '', isLocal = false, id = '';

        if ('isLocal' in item && item.isLocal) {
            name = item.name;
            serving = item.servingSize;
            calDesc = `Calories: ${item.calories}kcal | P: ${item.protein}g | C: ${item.carbs}g | F: ${item.fat}g`;
            isLocal = true;
            id = item.id;
        } else {
            const fsItem = item as FoodSearchItem;
            name = fsItem.food_name;
            brand = fsItem.brand_name || '';
            const descriptionParts = fsItem.food_description ? fsItem.food_description.split('-') : [];
            serving = descriptionParts[0] ? descriptionParts[0].trim() : '';
            calDesc = descriptionParts[1] ? descriptionParts[1].trim() : fsItem.food_description;
            id = fsItem.food_id;
        }

        return (
            <View style={styles.card}>
                <View style={styles.cardContent}>
                    <View style={styles.nameRow}>
                        <Text style={styles.foodName} numberOfLines={1}>{name}</Text>
                        {isLocal && (
                            <View style={styles.localBadge}>
                                <Text style={styles.localBadgeText}>Indian</Text>
                            </View>
                        )}
                    </View>
                    {brand !== '' && (
                        <Text style={styles.brandName}>{brand}</Text>
                    )}
                    <View style={styles.detailsRow}>
                        <Text style={styles.servingSize} numberOfLines={1}>{serving}</Text>
                    </View>
                    <Text style={styles.caloriesText} numberOfLines={1}>{calDesc}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.addButton, addingId === id && { opacity: 0.6 }]}
                    onPress={() => handleAddFood(item)}
                    disabled={addingId !== null}
                >
                    {addingId === id
                        ? <ActivityIndicator size="small" color="#FFFFFF" />
                        : <Ionicons name="add" size={24} color="#FFFFFF" />
                    }
                </TouchableOpacity>
            </View>
        );
    };

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
                        style={styles.searchInput}
                        placeholder="Search for a food..."
                        placeholderTextColor={Colors.TEXT_MUTED}
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                        clearButtonMode="while-editing"
                        returnKeyType="search"
                    />
                </View>

                {/* Status / Results */}
                <View style={styles.contentContainer}>
                    {loading && (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color={Colors.PRIMARY} />
                            <Text style={styles.loadingText}>Searching Database...</Text>
                        </View>
                    )}

                    {!loading && error && (
                        <View style={styles.centerContainer}>
                            <Ionicons name="alert-circle-outline" size={48} color={Colors.ERROR} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {!loading && !error && query.trim().length >= 3 && results.length === 0 && (
                        <View style={styles.centerContainer}>
                            <Ionicons name="restaurant-outline" size={48} color={Colors.TEXT_MUTED} />
                            <Text style={styles.emptyText}>No results found for "{query}"</Text>
                        </View>
                    )}

                    {!loading && !error && (
                        <FlatList
                            data={results}
                            keyExtractor={(item) => ('isLocal' in item ? item.id : item.food_id).toString()}
                            renderItem={renderItem}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        />
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default FoodSearchScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.BACKGROUND,
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
        backgroundColor: Colors.BACKGROUND,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.SURFACE_DARK,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
    },
    headerRight: {
        width: 40, // To balance the back button
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.SURFACE,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: Colors.TEXT_MAIN,
        height: '100%',
    },
    contentContainer: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.SURFACE_ELEVATED,
        borderRadius: 20,
        padding: 16,
        marginVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: Colors.BORDER,
    },
    cardContent: {
        flex: 1,
        marginRight: 16,
    },
    foodName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.TEXT_MAIN,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    localBadge: {
        backgroundColor: Colors.PRIMARY + '20', // transparent primary
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
        borderWidth: 1,
        borderColor: Colors.PRIMARY + '40',
    },
    localBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.PRIMARY,
        textTransform: 'uppercase',
    },
    brandName: {
        fontSize: 12,
        color: Colors.PRIMARY,
        fontWeight: '600',
        marginBottom: 4,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    servingSize: {
        fontSize: 13,
        color: Colors.TEXT_MUTED,
        fontWeight: '500',
    },
    caloriesText: {
        fontSize: 13,
        color: Colors.TEXT_MUTED,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.PRIMARY,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: Colors.TEXT_MUTED,
    },
    errorText: {
        marginTop: 12,
        fontSize: 14,
        color: Colors.ERROR,
        textAlign: 'center',
    },
    emptyText: {
        marginTop: 12,
        fontSize: 15,
        color: Colors.TEXT_MUTED,
        textAlign: 'center',
    },
});
