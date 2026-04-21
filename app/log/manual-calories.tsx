import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { addActivityLog } from '../../services/userService';

const ManualFoodLogScreen = () => {
    const { user } = useUser();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [name, setName] = useState('');
    const [calories, setCalories] = useState('');
    const [protein, setProtein] = useState('');
    const [carbs, setCarbs] = useState('');
    const [fat, setFat] = useState('');

    const [isLogging, setIsLogging] = useState(false);

    const handleLog = async () => {
        if (!user?.id) return;

        if (!name) {
            alert("Please enter a name for the food");
            return;
        }

        if (!calories || isNaN(Number(calories))) {
            alert("Please enter a valid number for calories");
            return;
        }

        // Validate optional macro fields - only allow empty or valid numbers
        if (protein && isNaN(Number(protein))) {
            alert("Please enter a valid number for protein");
            return;
        }
        if (carbs && isNaN(Number(carbs))) {
            alert("Please enter a valid number for carbs");
            return;
        }
        if (fat && isNaN(Number(fat))) {
            alert("Please enter a valid number for fat");
            return;
        }

        setIsLogging(true);
        try {
            const dateString = new Date().toISOString().split('T')[0];
            const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            await addActivityLog(user.id, dateString, {
                id: Date.now().toString(),
                name: name,
                calories: Number(calories),
                time: timeString,
                type: 'food',
                macros: {
                    protein: Number(protein) || 0,
                    carbs: Number(carbs) || 0,
                    fat: Number(fat) || 0
                }
            });

            router.replace('/(tabs)/home');
        } catch (error) {
            console.error('Failed to log food:', error);
            alert('Failed to save log. Please try again.');
        } finally {
            setIsLogging(false);
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
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={Colors.TEXT_MAIN} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Manual Calories</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.card}>
                        <Text style={styles.label}>Food Name</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="restaurant" size={20} color={Colors.PRIMARY} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Chicken Salad"
                                value={name}
                                onChangeText={setName}
                                placeholderTextColor={Colors.TEXT_MUTED}
                            />
                        </View>

                        <Text style={styles.label}>Calories</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="flame-outline" size={20} color={Colors.SECONDARY} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="0"
                                value={calories}
                                onChangeText={setCalories}
                                keyboardType="numeric"
                                placeholderTextColor={Colors.TEXT_MUTED}
                            />
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Macros (Optional)</Text>

                    <View style={styles.macrosRow}>
                        <View style={styles.macroInputContainer}>
                            <Text style={styles.macroLabel}>Protein</Text>
                            <View style={styles.macroInputWrapper}>
                                <TextInput
                                    style={styles.macroInput}
                                    placeholder="0"
                                    value={protein}
                                    onChangeText={setProtein}
                                    keyboardType="numeric"
                                    placeholderTextColor={Colors.TEXT_MUTED}
                                />
                                <Text style={styles.unitText}>g</Text>
                            </View>
                        </View>

                        <View style={styles.macroInputContainer}>
                            <Text style={styles.macroLabel}>Carbs</Text>
                            <View style={styles.macroInputWrapper}>
                                <TextInput
                                    style={styles.macroInput}
                                    placeholder="0"
                                    value={carbs}
                                    onChangeText={setCarbs}
                                    keyboardType="numeric"
                                    placeholderTextColor={Colors.TEXT_MUTED}
                                />
                                <Text style={styles.unitText}>g</Text>
                            </View>
                        </View>

                        <View style={styles.macroInputContainer}>
                            <Text style={styles.macroLabel}>Fat</Text>
                            <View style={styles.macroInputWrapper}>
                                <TextInput
                                    style={styles.macroInput}
                                    placeholder="0"
                                    value={fat}
                                    onChangeText={setFat}
                                    keyboardType="numeric"
                                    placeholderTextColor={Colors.TEXT_MUTED}
                                />
                                <Text style={styles.unitText}>g</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                    <TouchableOpacity
                        style={[styles.logButton, isLogging && { opacity: 0.7 }]}
                        onPress={handleLog}
                        disabled={isLogging}
                    >
                        {isLogging ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.logButtonText}>Log Food</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <View style={[styles.systemMask, { height: insets.bottom }]} />
        </View>
    );
};

export default ManualFoodLogScreen;

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: Colors.BACKGROUND,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
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
        shadowOpacity: 0.25,
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
        shadowOpacity: 0.2,
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
        marginTop: 12,
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.TEXT_MAIN,
        marginBottom: 15,
        marginTop: 10,
    },
    macrosRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    macroInputContainer: {
        flex: 1,
    },
    macroLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.TEXT_MUTED,
        marginBottom: 8,
        textAlign: 'center',
    },
    macroInputWrapper: {
        backgroundColor: Colors.SURFACE,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.BORDER,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        height: 48,
    },
    macroInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
        textAlign: 'center',
    },
    unitText: {
        fontSize: 12,
        color: Colors.TEXT_MUTED,
        fontWeight: '600',
    },
    footer: {
        padding: 20,
        backgroundColor: Colors.BACKGROUND,
        borderTopWidth: 1,
        borderTopColor: Colors.BORDER,
    },
    logButton: {
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
    logButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    systemMask: {
        width: '100%',
        backgroundColor: Colors.BACKGROUND,
    },
});
