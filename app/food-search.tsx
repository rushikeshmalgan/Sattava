import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { FoodSearchItem, searchFoods } from '../services/fatSecretService';
import { addFoodLog } from '../services/logService';

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
    const [results, setResults] = useState<FoodSearchItem[]>([]);
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
            const data = await searchFoods(searchQuery);
            setResults(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch results');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddFood = async (food: FoodSearchItem) => {
        if (!user?.id) {
            Alert.alert('Error', 'Please sign in to log food.');
            return;
        }
        if (addingId) return; // prevent double-taps

        setAddingId(food.food_id);
        try {
            const desc = food.food_description || '';
            const calories = parseMacro(desc, 'Calories');
            const carbs = parseMacro(desc, 'Carbs');
            const protein = parseMacro(desc, 'Protein');
            const fat = parseMacro(desc, 'Fat');

            // Extract serving size: "Per 100g - Calories..." -> "Per 100g"
            const servingSize = desc.split('-')[0]?.trim() || '1 serving';

            const dateString = new Date().toISOString().split('T')[0];
            await addFoodLog(user.id, dateString, {
                id: food.food_id,
                name: food.food_name,
                calories,
                carbs,
                protein,
                fat,
                servingSize,
            });

            Alert.alert('Added!', `${food.food_name} (${calories} kcal) logged successfully.`, [
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

    const renderItem = ({ item }: { item: FoodSearchItem }) => {
        // Extract basic data from food_description: "Per 1 apple - Calories: 95kcal | Fat: 0.31g | Carbs: 25.13g | Protein: 0.47g"
        // Let's just show it as is, or split by '-'
        const descriptionParts = item.food_description ? item.food_description.split('-') : [];
        const servingSize = descriptionParts[0] ? descriptionParts[0].trim() : '';
        const caloriesEtc = descriptionParts[1] ? descriptionParts[1].trim() : item.food_description;

        return (
            <View style={styles.card}>
                <View style={styles.cardContent}>
                    <Text style={styles.foodName} numberOfLines={1}>{item.food_name}</Text>
                    {item.brand_name && (
                        <Text style={styles.brandName}>{item.brand_name}</Text>
                    )}
                    <View style={styles.detailsRow}>
                        <Text style={styles.servingSize} numberOfLines={1}>{servingSize}</Text>
                    </View>
                    <Text style={styles.caloriesText} numberOfLines={1}>{caloriesEtc}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.addButton, addingId === item.food_id && { opacity: 0.6 }]}
                    onPress={() => handleAddFood(item)}
                    disabled={addingId !== null}
                >
                    {addingId === item.food_id
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
                            keyExtractor={(item) => item.food_id.toString()}
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
        backgroundColor: '#F3F4F6',
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
        backgroundColor: '#F3F4F6',
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
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    cardContent: {
        flex: 1,
        marginRight: 16,
    },
    foodName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.TEXT_MAIN,
        marginBottom: 4,
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
