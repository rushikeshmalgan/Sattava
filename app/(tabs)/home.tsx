import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CaloriesCard from '../../components/CaloriesCard';
import HomeHeader from '../../components/HomeHeader';
import RecentActivity, { Activity } from '../../components/RecentActivity';
import WaterIntakeCard from '../../components/WaterIntakeCard';
import WeeklyCalendar from '../../components/WeeklyCalendar';
import { Colors } from '../../constants/Colors';
import { db } from '../../firebaseConfig';
import { addActivityLog, updateUserTargets } from '../../services/userService';

export default function Home() {
    const { user } = useUser();
    const [selectedDate, setSelectedDate] = useState(new Date());

    const [targets, setTargets] = useState({
        calories: 2000,
        carbs: 250,
        protein: 150,
        fat: 70,
        water: 2.0
    });

    const [consumed, setConsumed] = useState({
        calories: 0, // This is consumed calories
        caloriesBurned: 0,
        carbs: 0,
        protein: 0,
        fat: 0,
        water: 0
    });

    const [activities, setActivities] = useState<Activity[]>([]);

    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editableTargets, setEditableTargets] = useState({
        calories: targets.calories,
        carbs: targets.carbs.toString(),
        protein: targets.protein.toString(),
        fat: targets.fat.toString(),
        water: targets.water.toString()
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!user?.id) return;

        // Listen for user profile targets
        const userDocRef = doc(db, 'users', user.id);
        const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const plan = data.generatedPlan;
                if (plan) {
                    const newTargets = {
                        calories: plan.dailyCalories || 2000,
                        carbs: parseInt(plan.macros?.carbs) || 250,
                        protein: parseInt(plan.macros?.protein) || 150,
                        fat: parseInt(plan.macros?.fats) || 70,
                        water: parseFloat(plan.waterIntake) || 2.0
                    };
                    setTargets(newTargets);
                }
            }
        });

        // Listen for consumption for selected date
        const dateString = selectedDate.toISOString().split('T')[0];
        const logDocRef = doc(db, 'users', user.id, 'dailyLogs', dateString);
        const unsubscribeLogs = onSnapshot(logDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setConsumed({
                    calories: data.consumedCalories || 0,   // ✅ FIXED
                    caloriesBurned: data.caloriesBurned || 0,
                    carbs: data.totalCarbs || 0,
                    protein: data.totalProtein || 0,
                    fat: data.totalFat || 0,
                    water: data.totalWater || 0,
                });
                const logs = data.logs || [];
                // Sort by createdAt (newest first) or fallback to reverse order of insertion
                const sortedLogs = [...logs].reverse();
                setActivities(sortedLogs);
            } else {
                // If log doesn't exist, create it with default values
                try {
                    await setDoc(logDocRef, {
                        consumedCalories: 0,
                        caloriesBurned: 0,
                        totalCarbs: 0,
                        totalProtein: 0,
                        totalFat: 0,
                        totalWater: 0,
                        waterIntake: 0,
                        logs: [],
                        createdAt: new Date(),
                    });
                    // Note: onSnapshot will fire again once the document is created
                } catch (error) {
                    console.error("Error creating default daily log:", error);
                }
            }
        });

        return () => {
            unsubscribeUser();
            unsubscribeLogs();
        };
    }, [user?.id, selectedDate]);

    const handleEditPress = () => {
        setEditableTargets({
            calories: targets.calories,
            carbs: targets.carbs.toString(),
            protein: targets.protein.toString(),
            fat: targets.fat.toString(),
            water: (targets.water * 1000).toString()
        });
        setIsEditModalVisible(true);
    };

    const handleSaveTargets = async () => {
        if (!user?.id) return;

        // Basic validation
        if (isNaN(Number(editableTargets.calories)) ||
            isNaN(parseInt(editableTargets.carbs)) ||
            isNaN(parseInt(editableTargets.protein)) ||
            isNaN(parseInt(editableTargets.fat)) ||
            isNaN(parseFloat(editableTargets.water))) {
            alert("Please enter valid numbers");
            return;
        }

        setIsSaving(true);
        try {
            // Update Goals (Always update goals set in profile)
            await updateUserTargets(user.id, {
                calories: Number(editableTargets.calories),
                macros: {
                    carbs: `${editableTargets.carbs}g`,
                    protein: `${editableTargets.protein}g`,
                    fats: `${editableTargets.fat}g`
                },
                waterIntake: `${parseFloat(editableTargets.water) / 1000}L`
            });

            setIsEditModalVisible(false);
        } catch (error) {
            console.error("Failed to update targets:", error);
            alert("Failed to save changes. Please check your connection.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddWater = async () => {
        if (!user?.id) return;

        const dateString = selectedDate.toISOString().split('T')[0];
        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        try {
            await addActivityLog(user.id, dateString, {
                id: Date.now().toString(),
                name: 'Water Intake',
                calories: 0,
                time: timeString,
                type: 'water',
                amount: '250ml'
            });
        } catch (error) {
            console.error("Failed to quickly add water:", error);
        }
    };

    const insets = useSafeAreaInsets();
    const TAB_BAR_HEIGHT = 70;
    const TAB_BAR_OFFSET = 10;
    const TOTAL_BOTTOM_SPACE = insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_OFFSET + 20;

    return (
        <View style={styles.mainContainer}>
            {/* Solid status bar mask to hide content behind system indicators */}
            <View style={{ height: insets.top, backgroundColor: Colors.BACKGROUND }} />

            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: TOTAL_BOTTOM_SPACE }
                ]}
            >
                <HomeHeader />
                <WeeklyCalendar
                    selectedDate={selectedDate}
                    onDateSelect={(date) => setSelectedDate(date)}
                />
                <View style={styles.content}>
                    <CaloriesCard
                        consumed={consumed.calories}
                        burned={consumed.caloriesBurned}
                        target={targets.calories}
                        onEdit={handleEditPress}
                        macros={{
                            carbs: Math.max(targets.carbs - consumed.carbs, 0),
                            protein: Math.max(targets.protein - consumed.protein, 0),
                            fat: Math.max(targets.fat - consumed.fat, 0)
                        }}
                    />
                    <WaterIntakeCard
                        drunkMl={consumed.water}
                        targetMl={targets.water * 1000}
                        onEdit={handleEditPress}
                        onAddWater={handleAddWater}
                    />
                    <RecentActivity activities={activities} />
                </View>
            </ScrollView>

            {/* Edit Goals Modal */}
            <Modal
                transparent
                visible={isEditModalVisible}
                animationType="slide"
                onRequestClose={() => setIsEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.keyboardView}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Edit Daily Targets</Text>
                                <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={Colors.TEXT_MUTED} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                                <View style={styles.inputGroup}>
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Daily Calories Goal</Text>
                                        <View style={styles.inputWrapper}>
                                            <Ionicons name="flame-outline" size={20} color={Colors.PRIMARY} style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.input}
                                                value={editableTargets.calories.toString()}
                                                onChangeText={(text) => setEditableTargets({ ...editableTargets, calories: Number(text) || 0 })}
                                                keyboardType="numeric"
                                                placeholder="e.g. 2000"
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Daily Water Goal (ml)</Text>
                                        <View style={styles.inputWrapper}>
                                            <Ionicons name="water-outline" size={20} color="#0284C7" style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.input}
                                                value={editableTargets.water}
                                                onChangeText={(text) => setEditableTargets({ ...editableTargets, water: text })}
                                                keyboardType="numeric"
                                                placeholder="e.g. 2000"
                                            />
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.macroSection}>
                                    <Text style={styles.sectionTitle}>Macros</Text>
                                    <View style={styles.macroGrid}>
                                        {/* Protein */}
                                        <View style={styles.macroBox}>
                                            <View style={styles.macroIconLabel}>
                                                <Ionicons name="barbell-outline" size={18} color="#DC2626" />
                                                <Text style={styles.macroBoxLabel}>Protein</Text>
                                            </View>
                                            <View style={styles.macroInputWrapper}>
                                                <TextInput
                                                    style={styles.macroInput}
                                                    value={editableTargets.protein}
                                                    onChangeText={(text) => setEditableTargets({ ...editableTargets, protein: text })}
                                                    keyboardType="numeric"
                                                    placeholder="0"
                                                />
                                                <Text style={styles.unitText}>g</Text>
                                            </View>
                                        </View>

                                        {/* Fats */}
                                        <View style={styles.macroBox}>
                                            <View style={styles.macroIconLabel}>
                                                <Ionicons name="water-outline" size={18} color="#0284C7" />
                                                <Text style={styles.macroBoxLabel}>Fats</Text>
                                            </View>
                                            <View style={styles.macroInputWrapper}>
                                                <TextInput
                                                    style={styles.macroInput}
                                                    value={editableTargets.fat}
                                                    onChangeText={(text) => setEditableTargets({ ...editableTargets, fat: text })}
                                                    keyboardType="numeric"
                                                    placeholder="0"
                                                />
                                                <Text style={styles.unitText}>g</Text>
                                            </View>
                                        </View>

                                        {/* Carbs */}
                                        <View style={styles.macroBox}>
                                            <View style={styles.macroIconLabel}>
                                                <Ionicons name="nutrition-outline" size={18} color="#EA580C" />
                                                <Text style={styles.macroBoxLabel}>Carbs</Text>
                                            </View>
                                            <View style={styles.macroInputWrapper}>
                                                <TextInput
                                                    style={styles.macroInput}
                                                    value={editableTargets.carbs}
                                                    onChangeText={(text) => setEditableTargets({ ...editableTargets, carbs: text })}
                                                    keyboardType="numeric"
                                                    placeholder="0"
                                                />
                                                <Text style={styles.unitText}>g</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.cancelButton]}
                                        onPress={() => setIsEditModalVisible(false)}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.saveButton]}
                                        onPress={handleSaveTargets}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <ActivityIndicator color="white" size="small" />
                                        ) : (
                                            <Text style={styles.saveButtonText}>Save Changes</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: Colors.BACKGROUND,
    },
    container: {
        flex: 1,
        backgroundColor: Colors.BACKGROUND,
    },
    scrollContent: {
        flexGrow: 1,      // ✅ Ensure children can fill up the space
        paddingBottom: 40,
        paddingHorizontal: 15,
        paddingTop: 10,
    },
    content: {
        flex: 1,
        marginTop: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.TEXT_MAIN,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.TEXT_MUTED,
        marginTop: 5,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    keyboardView: {
        width: '100%',
    },
    modalContent: {
        backgroundColor: Colors.BACKGROUND,
        borderRadius: 24,
        padding: 24,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.TEXT_MAIN,
    },
    inputLabel: {
        fontSize: 14,
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
        borderColor: '#f0f0f0',
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
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
        marginBottom: 10,
    },
    modalButton: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#e0e0e0', // Gray as requested
    },
    saveButton: {
        backgroundColor: Colors.PRIMARY,
    },
    cancelButtonText: {
        color: Colors.TEXT_MUTED,
        fontWeight: '600',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    modalScrollContent: {
        paddingBottom: 20,
    },
    inputGroup: {
        gap: 20,
        marginBottom: 25,
    },
    inputContainer: {
        gap: 8,
    },
    macroSection: {
        marginTop: 5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
        marginBottom: 15,
    },
    macroGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    macroBox: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    macroIconLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    macroBoxLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.TEXT_MUTED,
        textTransform: 'uppercase',
    },
    macroInputWrapper: {
        width: '100%',
        height: 50,
        backgroundColor: Colors.SURFACE,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    macroInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
        textAlign: 'center',
    },
    unitText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.TEXT_MUTED,
    },
});
