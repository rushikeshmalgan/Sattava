import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { getLocalDishes, deleteDishLocally, GharKaKhanaDish } from '../../services/dishService';
import { addActivityLog } from '../../services/userService';

const SavedDishesScreen = () => {
    const { user } = useUser();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    const [dishes, setDishes] = useState<GharKaKhanaDish[]>([]);
    const [loading, setLoading] = useState(true);
    const [loggingId, setLoggingId] = useState<string | null>(null);

    useEffect(() => {
        loadDishes();
    }, []);

    const loadDishes = async () => {
        try {
            setLoading(true);
            const savedDishes = await getLocalDishes();
            setDishes(savedDishes);
        } catch (error) {
            console.error('Error loading dishes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogRepeat = async (dish: GharKaKhanaDish) => {
        if (!user?.id) return;
        
        setLoggingId(dish.id);
        try {
            const dateString = new Date().toISOString().split('T')[0];
            const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            await addActivityLog(user.id, dateString, {
                id: Date.now().toString(),
                name: dish.name,
                calories: dish.calories || 0,
                time: timeString,
                type: 'food',
                createdAt: new Date(),
            });

            Alert.alert('Logged!', `${dish.name} has been added to your daily tracker.`, [
                { text: 'View Home', onPress: () => router.replace('/(tabs)/home') },
                { text: 'OK', style: 'cancel' }
            ]);
        } catch (error) {
            console.error('Error logging dish:', error);
            Alert.alert('Error', 'Failed to log dish. Please try again.');
        } finally {
            setLoggingId(null);
        }
    };

    const handleDelete = (dishId: string, dishName: string) => {
        Alert.alert(
            'Delete Dish',
            `Are you sure you want to delete "${dishName}" from your library?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive', 
                    onPress: async () => {
                        await deleteDishLocally(dishId);
                        loadDishes();
                    } 
                },
            ]
        );
    };

    const renderItem = ({ item }: { item: GharKaKhanaDish }) => (
        <View style={styles.dishCard}>
            <View style={styles.cardHeader}>
                {item.imageUri ? (
                    <Image source={{ uri: item.imageUri }} style={styles.dishImage} />
                ) : (
                    <View style={styles.placeholderImage}>
                        <Ionicons name="restaurant" size={30} color={Colors.TEXT_LIGHT} />
                    </View>
                )}
                <View style={styles.dishInfo}>
                    <Text style={styles.dishName}>{item.name}</Text>
                    <Text style={styles.dishMeta}>
                        {item.ingredients.length} ingredients • {item.calories || 'N/A'} kcal
                    </Text>
                </View>
            </View>

            <View style={styles.cardActions}>
                <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id, item.name)}
                >
                    <Ionicons name="trash-outline" size={20} color={Colors.SECONDARY} />
                    <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.logAgainButton, loggingId === item.id && { opacity: 0.7 }]}
                    onPress={() => handleLogRepeat(item)}
                    disabled={loggingId !== null}
                >
                    {loggingId === item.id ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <>
                            <Ionicons name="add-circle" size={20} color="white" />
                            <Text style={styles.logAgainText}>Log Today</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.mainContainer}>
            <View style={{ height: insets.top, backgroundColor: Colors.BACKGROUND }} />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={Colors.TEXT_MAIN} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Saved Dishes</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={Colors.PRIMARY} />
                </View>
            ) : dishes.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="folder-open-outline" size={60} color={Colors.TEXT_LIGHT} />
                    <Text style={styles.emptyTitle}>No saved dishes yet</Text>
                    <Text style={styles.emptySubtitle}>Dishes you create in "Ghar Ka Khana" will appear here.</Text>
                    <TouchableOpacity 
                        style={styles.createButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.createButtonText}>Create Your First Dish</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={dishes}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
};

export default SavedDishesScreen;

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: Colors.BACKGROUND,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.BORDER,
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
        fontWeight: 'bold',
        color: Colors.TEXT_MAIN,
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    dishCard: {
        backgroundColor: Colors.SURFACE_ELEVATED,
        borderRadius: 22,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: Colors.BORDER,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    dishImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
        marginRight: 15,
    },
    placeholderImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: Colors.SURFACE_DARK,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    dishInfo: {
        flex: 1,
    },
    dishName: {
        fontSize: 17,
        fontWeight: 'bold',
        color: Colors.TEXT_MAIN,
        marginBottom: 4,
    },
    dishMeta: {
        fontSize: 13,
        color: Colors.TEXT_MUTED,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: Colors.DIVIDER,
        paddingTop: 12,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    deleteText: {
        color: Colors.SECONDARY,
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    logAgainButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.PRIMARY,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        shadowColor: Colors.PRIMARY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    logAgainText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 6,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.TEXT_MAIN,
        marginTop: 20,
    },
    emptySubtitle: {
        fontSize: 14,
        color: Colors.TEXT_MUTED,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 30,
    },
    createButton: {
        backgroundColor: Colors.PRIMARY,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 15,
    },
    createButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
