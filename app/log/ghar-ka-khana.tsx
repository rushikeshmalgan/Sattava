import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { saveDishLocally, Ingredient } from '../../services/dishService';
import { addActivityLog } from '../../services/userService';

const GharKaKhanaScreen = () => {
    const { user } = useUser();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [dishName, setDishName] = useState('');
    const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', quantity: '' }]);
    const [calories, setCalories] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleAddIngredient = () => {
        setIngredients([...ingredients, { name: '', quantity: '' }]);
    };

    const handleRemoveIngredient = (index: number) => {
        if (ingredients.length > 1) {
            const newIngredients = [...ingredients];
            newIngredients.splice(index, 1);
            setIngredients(newIngredients);
        }
    };

    const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
        const newIngredients = [...ingredients];
        newIngredients[index][field] = value;
        setIngredients(newIngredients);
    };

    const handleAddPhoto = async () => {
        Alert.alert(
            'Add Photo',
            'Take a photo or choose from gallery',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Take Photo', onPress: handleLaunchCamera },
                { text: 'Choose from Gallery', onPress: handleLaunchGallery },
            ]
        );
    };

    const handleLaunchCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleLaunchGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Media library permission is required to choose photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSaveDish = async () => {
        if (!dishName.trim()) {
            Alert.alert('Error', 'Please enter a dish name.');
            return;
        }

        const validIngredients = ingredients.filter(ing => ing.name.trim() !== '');
        if (validIngredients.length === 0) {
            Alert.alert('Error', 'Please add at least one ingredient.');
            return;
        }

        setIsSaving(true);
        try {
            const dishId = Date.now().toString();
            const dishData = {
                id: dishId,
                name: dishName,
                ingredients: validIngredients,
                calories: calories ? Number(calories) : undefined,
                imageUri: imageUri || undefined,
                createdAt: new Date().toISOString(),
            };

            // 1. Save locally
            await saveDishLocally(dishData);

            // 2. Log to tracker (Firestore)
            if (user?.id) {
                const dateString = new Date().toISOString().split('T')[0];
                const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                await addActivityLog(user.id, dateString, {
                    id: dishId,
                    name: dishName,
                    calories: Number(calories) || 0,
                    time: timeString,
                    type: 'food',
                    createdAt: new Date(),
                });
            }

            Alert.alert('Success', 'Dish saved and logged successfully!', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/home') }
            ]);
        } catch (error) {
            console.error('Error saving dish:', error);
            Alert.alert('Error', 'Failed to save dish. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={styles.mainContainer}>
            <View style={{ height: insets.top, backgroundColor: Colors.BACKGROUND }} />
            
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={Colors.TEXT_MAIN} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Ghar Ka Khana</Text>
                    </View>
                    <TouchableOpacity 
                        onPress={() => router.push('/log/saved-dishes' as any)}
                        style={styles.savedButton}
                    >
                        <Ionicons name="journal-outline" size={20} color={Colors.PRIMARY} />
                        <Text style={styles.savedButtonText}>My Dishes</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.card}>
                        <Text style={styles.label}>Dish Name*</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="restaurant" size={20} color={Colors.PRIMARY} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter dish name"
                                value={dishName}
                                onChangeText={setDishName}
                                placeholderTextColor={Colors.TEXT_MUTED}
                            />
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Ingredients Section</Text>
                    <View style={styles.card}>
                        {ingredients.map((ingredient, index) => (
                            <View key={index} style={styles.ingredientRow}>
                                <View style={[styles.inputWrapper, { flex: 2, marginRight: 8 }]}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ingredient name"
                                        value={ingredient.name}
                                        onChangeText={(text) => updateIngredient(index, 'name', text)}
                                        placeholderTextColor={Colors.TEXT_MUTED}
                                    />
                                </View>
                                <View style={[styles.inputWrapper, { flex: 1, marginRight: 8 }]}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Qty"
                                        value={ingredient.quantity}
                                        onChangeText={(text) => updateIngredient(index, 'quantity', text)}
                                        placeholderTextColor={Colors.TEXT_MUTED}
                                    />
                                </View>
                                <TouchableOpacity 
                                    onPress={() => handleRemoveIngredient(index)}
                                    style={styles.removeButton}
                                >
                                    <Ionicons name="close-circle" size={24} color={Colors.SECONDARY} />
                                </TouchableOpacity>
                            </View>
                        ))}

                        <TouchableOpacity style={styles.addButton} onPress={handleAddIngredient}>
                            <Ionicons name="add-circle-outline" size={20} color={Colors.PRIMARY} />
                            <Text style={styles.addButtonText}>Add Ingredient</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.label}>Calories (Optional)</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="flame-outline" size={20} color={Colors.SECONDARY} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter total calories"
                                value={calories}
                                onChangeText={setCalories}
                                keyboardType="numeric"
                                placeholderTextColor={Colors.TEXT_MUTED}
                            />
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.label}>Photo Section</Text>
                        {imageUri ? (
                            <View style={styles.imagePreviewContainer}>
                                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                                <TouchableOpacity 
                                    style={styles.changePhotoOverlay} 
                                    onPress={handleAddPhoto}
                                >
                                    <Ionicons name="camera" size={24} color="white" />
                                    <Text style={styles.changePhotoText}>Change Photo</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.photoUploadBox} onPress={handleAddPhoto}>
                                <Ionicons name="camera-outline" size={40} color={Colors.TEXT_LIGHT} />
                                <Text style={styles.photoUploadText}>Add Photo</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                    <TouchableOpacity
                        style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
                        onPress={handleSaveDish}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Dish</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <View style={[styles.systemMask, { height: insets.bottom }]} />
        </View>
    );
};

export default GharKaKhanaScreen;

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
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    savedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.PRIMARY_LIGHT,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    savedButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.PRIMARY,
        marginLeft: 6,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.SURFACE,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.TEXT_MAIN,
    },
    scrollContent: {
        padding: 20,
    },
    card: {
        backgroundColor: Colors.SURFACE_ELEVATED,
        borderRadius: 22,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: Colors.BORDER,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.TEXT_MAIN,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.TEXT_MAIN,
        marginBottom: 12,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.SURFACE,
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: Colors.BORDER,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: Colors.TEXT_MAIN,
    },
    ingredientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    removeButton: {
        padding: 4,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginTop: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.PRIMARY,
        borderStyle: 'dashed',
    },
    addButtonText: {
        color: Colors.PRIMARY,
        fontWeight: '600',
        marginLeft: 8,
    },
    photoUploadBox: {
        height: 160,
        backgroundColor: Colors.SURFACE,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: Colors.BORDER,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoUploadText: {
        marginTop: 12,
        color: Colors.TEXT_LIGHT,
        fontSize: 16,
        fontWeight: '600',
    },
    imagePreviewContainer: {
        height: 200,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    changePhotoOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
    },
    changePhotoText: {
        color: 'white',
        fontWeight: '600',
        marginLeft: 8,
    },
    footer: {
        padding: 20,
        backgroundColor: Colors.BACKGROUND,
        borderTopWidth: 1,
        borderTopColor: Colors.BORDER,
    },
    saveButton: {
        backgroundColor: Colors.PRIMARY,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    systemMask: {
        width: '100%',
        backgroundColor: Colors.BACKGROUND,
    },
});
