import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Ingredient {
    name: string;
    quantity: string;
}

export interface GharKaKhanaDish {
    id: string;
    name: string;
    ingredients: Ingredient[];
    calories?: number;
    imageUri?: string;
    createdAt: string;
}

const DISHES_KEY = '@ghar_ka_khana_dishes';

export const saveDishLocally = async (dish: GharKaKhanaDish): Promise<void> => {
    try {
        const existingDishesJson = await AsyncStorage.getItem(DISHES_KEY);
        const existingDishes: GharKaKhanaDish[] = existingDishesJson ? JSON.parse(existingDishesJson) : [];
        
        const updatedDishes = [dish, ...existingDishes];
        await AsyncStorage.setItem(DISHES_KEY, JSON.stringify(updatedDishes));
    } catch (error) {
        console.error('Error saving dish locally:', error);
        throw error;
    }
};

export const getLocalDishes = async (): Promise<GharKaKhanaDish[]> => {
    try {
        const dishesJson = await AsyncStorage.getItem(DISHES_KEY);
        return dishesJson ? JSON.parse(dishesJson) : [];
    } catch (error) {
        console.error('Error getting local dishes:', error);
        return [];
    }
};

export const deleteDishLocally = async (dishId: string): Promise<void> => {
    try {
        const existingDishesJson = await AsyncStorage.getItem(DISHES_KEY);
        const existingDishes: GharKaKhanaDish[] = existingDishesJson ? JSON.parse(existingDishesJson) : [];
        
        const updatedDishes = existingDishes.filter(d => d.id !== dishId);
        await AsyncStorage.setItem(DISHES_KEY, JSON.stringify(updatedDishes));
    } catch (error) {
        console.error('Error deleting dish locally:', error);
        throw error;
    }
};
