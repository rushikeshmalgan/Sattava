import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { db } from '../../firebaseConfig';

const GOAL_OPTIONS = ['Lose Weight', 'Maintain Weight', 'Gain Weight'];
const ACTIVITY_LEVEL_OPTIONS = ['2-3 Days / Week', '3-4 Days / Week', '5-6 Days / Week'];

export default function Profile() {
    const { user } = useUser();
    const { signOut } = useAuth();
    const insets = useSafeAreaInsets();
    const [userPlan, setUserPlan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showNameModal, setShowNameModal] = useState(false);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [tempName, setTempName] = useState('');
    const [editingGoal, setEditingGoal] = useState(false);
    const [editingActivity, setEditingActivity] = useState(false);
    const [tempGoal, setTempGoal] = useState('');
    const [tempActivity, setTempActivity] = useState('');
    const [isSavingName, setIsSavingName] = useState(false);
    const [isSavingGoal, setIsSavingGoal] = useState(false);
    const [isSavingActivity, setIsSavingActivity] = useState(false);

    const currentName =
        userPlan?.userProfile?.name || userPlan?.physicalProfile?.name || user?.fullName || 'User';
    const currentGoal = userPlan?.userProfile?.goal || userPlan?.physicalProfile?.goal || '';
    const currentActivityLevel =
        userPlan?.userProfile?.activityLevel || userPlan?.physicalProfile?.activityLevel || '';
    const isPlanStale = Boolean(userPlan?.generatedPlanStale);

    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        const docRef = doc(db, 'users', user.id);
        const unsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    setUserPlan(docSnap.data());
                } else {
                    setUserPlan(null);
                }
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching user plan:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user?.id]);

    const handleSaveGoal = async () => {
        if (!user?.id || !tempGoal) return;
        setIsSavingGoal(true);
        try {
            const docRef = doc(db, 'users', user.id);
            await updateDoc(docRef, {
                'userProfile.goal': tempGoal,
                generatedPlanStale: true,
                lastUpdated: new Date(),
            });
            setUserPlan((prev: any) => ({
                ...prev,
                userProfile: { ...prev?.userProfile, goal: tempGoal },
                generatedPlanStale: true,
            }));
            setEditingGoal(false);
            Alert.alert('Success', 'Goal updated successfully!');
        } catch (error) {
            console.error("Error updating goal:", error);
            Alert.alert('Error', 'Failed to update goal');
        } finally {
            setIsSavingGoal(false);
        }
    };

    const handleSaveName = async () => {
        const trimmedName = tempName.trim();
        if (!user?.id || !trimmedName) {
            Alert.alert('Required', 'Please enter a valid name');
            return;
        }

        setIsSavingName(true);
        try {
            const docRef = doc(db, 'users', user.id);
            await updateDoc(docRef, {
                'userProfile.name': trimmedName,
                lastUpdated: new Date(),
            });

            setUserPlan((prev: any) => ({
                ...prev,
                userProfile: { ...prev?.userProfile, name: trimmedName },
            }));

            setShowNameModal(false);
            Alert.alert('Success', 'Name updated successfully!');
        } catch (error) {
            console.error('Error updating name:', error);
            Alert.alert('Error', 'Failed to update name');
        } finally {
            setIsSavingName(false);
        }
    };

    const handleSaveActivity = async () => {
        if (!user?.id || !tempActivity) return;
        setIsSavingActivity(true);
        try {
            const docRef = doc(db, 'users', user.id);
            await updateDoc(docRef, {
                'userProfile.activityLevel': tempActivity,
                generatedPlanStale: true,
                lastUpdated: new Date(),
            });
            setUserPlan((prev: any) => ({
                ...prev,
                userProfile: { ...prev?.userProfile, activityLevel: tempActivity },
                generatedPlanStale: true,
            }));
            setEditingActivity(false);
            Alert.alert('Success', 'Activity level updated successfully!');
        } catch (error) {
            console.error("Error updating activity level:", error);
            Alert.alert('Error', 'Failed to update activity level');
        } finally {
            setIsSavingActivity(false);
        }
    };

    const openGoalModal = () => {
        setTempGoal(currentGoal);
        setEditingGoal(false);
        setShowGoalModal(true);
    };

    const openActivityModal = () => {
        setTempActivity(currentActivityLevel);
        setEditingActivity(false);
        setShowActivityModal(true);
    };

    const openNameModal = () => {
        setTempName(currentName);
        setShowNameModal(true);
    };

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                {
                    text: 'Sign Out',
                    onPress: () => signOut(),
                    style: 'destructive',
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.PRIMARY} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[
                styles.scrollContent,
                { paddingTop: insets.top + 16, paddingBottom: 140 + insets.bottom },
            ]}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.pageTitle}>Profile</Text>
            </View>

            {/* User Info Card */}
            <View style={styles.card}>
                <View style={styles.userInfoHeader}>
                    <View style={styles.userInitials}>
                        <Text style={styles.initialsText}>
                            {user?.firstName?.charAt(0) || 'U'}
                            {user?.lastName?.charAt(0) || 'S'}
                        </Text>
                    </View>
                    <View style={styles.userDetails}>
                        <Text style={styles.userName}>{currentName}</Text>
                        <Text style={styles.userEmail}>{user?.primaryEmailAddress?.emailAddress || 'No email'}</Text>
                    </View>
                </View>
            </View>

            {/* Daily Targets Section */}
            {userPlan?.generatedPlan && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Daily Targets</Text>
                    {isPlanStale && (
                        <View style={styles.staleBanner}>
                            <Ionicons name="alert-circle-outline" size={16} color={Colors.ERROR} />
                            <Text style={styles.staleText}>Your nutrition plan may be outdated after goal/activity changes.</Text>
                        </View>
                    )}
                    <View style={styles.card}>
                        <View style={styles.targetRow}>
                            <View style={styles.targetItem}>
                                <Ionicons name="flame-outline" size={20} color={Colors.PRIMARY} />
                                <View style={styles.targetContent}>
                                    <Text style={styles.targetLabel}>Daily Calories</Text>
                                    <Text style={styles.targetValue}>
                                        {userPlan.generatedPlan.dailyCalories || '—'} kcal
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.targetRow, { borderTopWidth: 1, borderTopColor: Colors.DIVIDER }]}>
                            <View style={styles.macroGroup}>
                                <View style={styles.macroItem}>
                                    <Text style={styles.macroLabel}>Protein</Text>
                                    <Text style={styles.macroValue}>
                                        {userPlan.generatedPlan.macros?.protein || '—'}g
                                    </Text>
                                </View>
                                <View style={[styles.macroItem, { borderLeftWidth: 1, borderLeftColor: Colors.DIVIDER }]}>
                                    <Text style={styles.macroLabel}>Carbs</Text>
                                    <Text style={styles.macroValue}>
                                        {userPlan.generatedPlan.macros?.carbs || '—'}g
                                    </Text>
                                </View>
                                <View style={[styles.macroItem, { borderLeftWidth: 1, borderLeftColor: Colors.DIVIDER }]}>
                                    <Text style={styles.macroLabel}>Fats</Text>
                                    <Text style={styles.macroValue}>
                                        {userPlan.generatedPlan.macros?.fats || '—'}g
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.targetRow, { borderTopWidth: 1, borderTopColor: Colors.DIVIDER }]}>
                            <View style={styles.targetItem}>
                                <Ionicons name="water-outline" size={20} color={Colors.PRIMARY} />
                                <View style={styles.targetContent}>
                                    <Text style={styles.targetLabel}>Daily Water Intake</Text>
                                    <Text style={styles.targetValue}>
                                        {userPlan.generatedPlan.waterIntake || '—'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            )}

            {/* Profile Settings Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Settings</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.settingRow} onPress={openNameModal}>
                        <View style={styles.settingContent}>
                            <Ionicons name="person-outline" size={20} color={Colors.TEXT_MAIN} />
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingLabel}>Name</Text>
                                <Text style={styles.settingValue}>{currentName}</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={Colors.TEXT_MUTED} />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.settingRow} onPress={openGoalModal}>
                        <View style={styles.settingContent}>
                            <Ionicons name="flag-outline" size={20} color={Colors.TEXT_MAIN} />
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingLabel}>Your Goal</Text>
                                <Text style={styles.settingValue}>
                                    {currentGoal || 'Not set'}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={Colors.TEXT_MUTED} />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.settingRow} onPress={openActivityModal}>
                        <View style={styles.settingContent}>
                            <Ionicons name="flash-outline" size={20} color={Colors.TEXT_MAIN} />
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingLabel}>Activity Level</Text>
                                <Text style={styles.settingValue}>
                                    {currentActivityLevel || 'Not set'}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={Colors.TEXT_MUTED} />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.settingRow} onPress={() => setShowPlanModal(true)}>
                        <View style={styles.settingContent}>
                            <Ionicons name="document-text-outline" size={20} color={Colors.TEXT_MAIN} />
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingLabel}>View Nutrition Plan</Text>
                                <Text style={styles.settingValue}>Personalized meal guide</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={Colors.TEXT_MUTED} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Account Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.card}>
                    <TouchableOpacity
                        style={[styles.settingRow, styles.dangerRow]}
                        onPress={handleSignOut}
                    >
                        <View style={styles.settingContent}>
                            <Ionicons name="log-out-outline" size={20} color={Colors.ERROR} />
                            <View style={styles.settingTextContainer}>
                                <Text style={[styles.settingLabel, { color: Colors.ERROR }]}>Sign Out</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Name Modal */}
            <Modal visible={showNameModal} animationType="slide" onRequestClose={() => setShowNameModal(false)}>
                <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowNameModal(false)}>
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Change Name</Text>
                        <View style={{ width: 60 }} />
                    </View>
                    <View style={styles.nameModalBody}>
                        <Text style={styles.modalLabel}>Display Name</Text>
                        <TextInput
                            style={styles.nameInput}
                            value={tempName}
                            onChangeText={setTempName}
                            placeholder="Enter your name"
                            placeholderTextColor={Colors.TEXT_MUTED}
                            maxLength={50}
                            autoCapitalize="words"
                        />
                        <View style={styles.buttonGroup}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowNameModal(false)}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveButton} onPress={handleSaveName} disabled={isSavingName}>
                                {isSavingName ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark" size={18} color="white" />
                                        <Text style={styles.saveButtonText}>Save</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Goal Modal */}
            <Modal
                visible={showGoalModal}
                animationType="slide"
                onRequestClose={() => {
                    setEditingGoal(false);
                    setShowGoalModal(false);
                }}
            >
                <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowGoalModal(false)}>
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Your Goal</Text>
                        <View style={{ width: 60 }} />
                    </View>
                    <ScrollView style={styles.modalContent}>
                        <View style={styles.modalCardContent}>
                            {!editingGoal ? (
                                <>
                                    <Ionicons name="flag-outline" size={48} color={Colors.PRIMARY} style={{ marginBottom: 16 }} />
                                    <Text style={styles.modalLabel}>Current Goal</Text>
                                    <Text style={styles.modalValueLarge}>{currentGoal || 'Not set'}</Text>
                                    <Text style={styles.modalDescription}>
                                        Your fitness goal guides your personalized nutrition plan and daily calorie targets.
                                    </Text>
                                    {currentGoal && (
                                        <View style={styles.detailsList}>
                                            <View style={styles.detailItem}>
                                                <Ionicons name="information-circle-outline" size={18} color={Colors.PRIMARY} />
                                                <Text style={styles.detailText}>This goal was set during your onboarding process.</Text>
                                            </View>
                                            <View style={styles.detailItem}>
                                                <Ionicons name="bulb-outline" size={18} color={Colors.PRIMARY} />
                                                <Text style={styles.detailText}>Your plan can be regenerated with a new goal by completing the onboarding again.</Text>
                                            </View>
                                        </View>
                                    )}
                                    <TouchableOpacity style={styles.editButton} onPress={() => setEditingGoal(true)}>
                                        <Ionicons name="pencil" size={18} color="white" />
                                        <Text style={styles.editButtonText}>Edit Goal</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.modalLabel}>Select Your Goal</Text>
                                    <View style={styles.optionsContainer}>
                                        {GOAL_OPTIONS.map((option) => (
                                            <TouchableOpacity
                                                key={option}
                                                style={[
                                                    styles.optionCard,
                                                    tempGoal === option && styles.selectedOptionCard,
                                                ]}
                                                onPress={() => setTempGoal(option)}
                                            >
                                                <View style={styles.optionContent}>
                                                    <Ionicons
                                                        name={
                                                            option === 'Lose Weight'
                                                                ? 'trending-down-outline'
                                                                : option === 'Maintain Weight'
                                                                ? 'swap-horizontal-outline'
                                                                : 'trending-up-outline'
                                                        }
                                                        size={28}
                                                        color={tempGoal === option ? Colors.PRIMARY : Colors.TEXT_MUTED}
                                                    />
                                                    <Text
                                                        style={[
                                                            styles.optionText,
                                                            tempGoal === option && styles.selectedOptionText,
                                                        ]}
                                                    >
                                                        {option}
                                                    </Text>
                                                </View>
                                                {tempGoal === option && (
                                                    <Ionicons name="checkmark-circle" size={24} color={Colors.PRIMARY} />
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <View style={styles.buttonGroup}>
                                        <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingGoal(false)}>
                                            <Text style={styles.cancelButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveGoal} disabled={isSavingGoal}>
                                            {isSavingGoal ? (
                                                <ActivityIndicator size="small" color="white" />
                                            ) : (
                                                <>
                                                    <Ionicons name="checkmark" size={18} color="white" />
                                                    <Text style={styles.saveButtonText}>Save</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Activity Level Modal */}
            <Modal
                visible={showActivityModal}
                animationType="slide"
                onRequestClose={() => {
                    setEditingActivity(false);
                    setShowActivityModal(false);
                }}
            >
                <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowActivityModal(false)}>
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Activity Level</Text>
                        <View style={{ width: 60 }} />
                    </View>
                    <ScrollView style={styles.modalContent}>
                        <View style={styles.modalCardContent}>
                            {!editingActivity ? (
                                <>
                                    <Ionicons name="flash-outline" size={48} color={Colors.PRIMARY} style={{ marginBottom: 16 }} />
                                    <Text style={styles.modalLabel}>Current Activity Level</Text>
                                    <Text style={styles.modalValueLarge}>{currentActivityLevel || 'Not set'}</Text>
                                    <Text style={styles.modalDescription}>
                                        Your activity level determines your daily calorie expenditure and macro distribution.
                                    </Text>
                                    {currentActivityLevel && (
                                        <View style={styles.detailsList}>
                                            <View style={styles.detailItem}>
                                                <Ionicons name="information-circle-outline" size={18} color={Colors.PRIMARY} />
                                                <Text style={styles.detailText}>Higher activity levels increase your daily calorie allowance.</Text>
                                            </View>
                                            <View style={styles.detailItem}>
                                                <Ionicons name="bulb-outline" size={18} color={Colors.PRIMARY} />
                                                <Text style={styles.detailText}>Adjust your activity during logging for accurate calorie tracking.</Text>
                                            </View>
                                        </View>
                                    )}
                                    <TouchableOpacity style={styles.editButton} onPress={() => setEditingActivity(true)}>
                                        <Ionicons name="pencil" size={18} color="white" />
                                        <Text style={styles.editButtonText}>Edit Activity Level</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.modalLabel}>Select Your Activity Level</Text>
                                    <View style={styles.optionsContainer}>
                                        {ACTIVITY_LEVEL_OPTIONS.map((option) => (
                                            <TouchableOpacity
                                                key={option}
                                                style={[
                                                    styles.optionCard,
                                                    tempActivity === option && styles.selectedOptionCard,
                                                ]}
                                                onPress={() => setTempActivity(option)}
                                            >
                                                <View style={styles.optionContent}>
                                                    <Ionicons
                                                        name="flame-outline"
                                                        size={28}
                                                        color={tempActivity === option ? Colors.PRIMARY : Colors.TEXT_MUTED}
                                                    />
                                                    <Text
                                                        style={[
                                                            styles.optionText,
                                                            tempActivity === option && styles.selectedOptionText,
                                                        ]}
                                                    >
                                                        {option}
                                                    </Text>
                                                </View>
                                                {tempActivity === option && (
                                                    <Ionicons name="checkmark-circle" size={24} color={Colors.PRIMARY} />
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <View style={styles.buttonGroup}>
                                        <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingActivity(false)}>
                                            <Text style={styles.cancelButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveActivity} disabled={isSavingActivity}>
                                            {isSavingActivity ? (
                                                <ActivityIndicator size="small" color="white" />
                                            ) : (
                                                <>
                                                    <Ionicons name="checkmark" size={18} color="white" />
                                                    <Text style={styles.saveButtonText}>Save</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Nutrition Plan Modal */}
            <Modal visible={showPlanModal} animationType="slide" onRequestClose={() => setShowPlanModal(false)}>
                <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowPlanModal(false)}>
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Nutrition Plan</Text>
                        <View style={{ width: 60 }} />
                    </View>
                    <ScrollView style={styles.modalContent}>
                        <View style={styles.modalCardContent}>
                            <Ionicons name="document-text-outline" size={48} color={Colors.PRIMARY} style={{ marginBottom: 16 }} />
                            <Text style={styles.modalLabel}>Your Personalized Plan</Text>
                            
                            {userPlan?.generatedPlan ? (
                                <>
                                    <View style={styles.planCard}>
                                        <Text style={styles.planSectionTitle}>Daily Calorie Goal</Text>
                                        <Text style={styles.planValue}>{userPlan.generatedPlan.dailyCalories} kcal</Text>
                                    </View>

                                    <View style={styles.planCard}>
                                        <Text style={styles.planSectionTitle}>Macro Targets</Text>
                                        <View style={styles.macroRow}>
                                            <View style={styles.macroBox}>
                                                <Text style={styles.macroBoxLabel}>Protein</Text>
                                                <Text style={styles.macroBoxValue}>{userPlan.generatedPlan.macros?.protein || 0}g</Text>
                                            </View>
                                            <View style={styles.macroBox}>
                                                <Text style={styles.macroBoxLabel}>Carbs</Text>
                                                <Text style={styles.macroBoxValue}>{userPlan.generatedPlan.macros?.carbs || 0}g</Text>
                                            </View>
                                            <View style={styles.macroBox}>
                                                <Text style={styles.macroBoxLabel}>Fats</Text>
                                                <Text style={styles.macroBoxValue}>{userPlan.generatedPlan.macros?.fats || 0}g</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.planCard}>
                                        <Text style={styles.planSectionTitle}>Daily Water Intake</Text>
                                        <Text style={styles.planValue}>{userPlan.generatedPlan.waterIntake}</Text>
                                    </View>

                                    <View style={styles.tipsSection}>
                                        <Text style={styles.tipsTitle}>Pro Tips:</Text>
                                        <View style={styles.tipItem}>
                                            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.PRIMARY} />
                                            <Text style={styles.tipText}>Log your meals consistently to track progress</Text>
                                        </View>
                                        <View style={styles.tipItem}>
                                            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.PRIMARY} />
                                            <Text style={styles.tipText}>Adjust calories based on weekly progress</Text>
                                        </View>
                                        <View style={styles.tipItem}>
                                            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.PRIMARY} />
                                            <Text style={styles.tipText}>Stay hydrated throughout the day</Text>
                                        </View>
                                    </View>
                                </>
                            ) : (
                                <Text style={styles.noDataText}>No plan generated yet. Complete onboarding to create your personalized plan.</Text>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.BACKGROUND,
    },
    scrollContent: {
        paddingHorizontal: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.BACKGROUND,
    },
    header: {
        marginBottom: 24,
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
    },
    card: {
        backgroundColor: Colors.SURFACE_ELEVATED,
        borderRadius: 22,
        overflow: 'hidden',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: Colors.BORDER,
    },
    userInfoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    userInitials: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: Colors.PRIMARY,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    initialsText: {
        fontSize: 20,
        fontWeight: '700',
        color: 'white',
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.TEXT_MAIN,
    },
    userEmail: {
        fontSize: 14,
        color: Colors.TEXT_MUTED,
        marginTop: 4,
    },
    section: {
        marginBottom: 24,
    },
    staleBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${Colors.ERROR}18`,
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginBottom: 10,
        gap: 8,
    },
    staleText: {
        color: Colors.ERROR,
        fontSize: 12,
        flex: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.TEXT_MUTED,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    targetRow: {
        padding: 16,
    },
    targetItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    targetContent: {
        marginLeft: 12,
        flex: 1,
    },
    targetLabel: {
        fontSize: 14,
        color: Colors.TEXT_MUTED,
    },
    targetValue: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.TEXT_MAIN,
        marginTop: 2,
    },
    macroGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    macroItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    macroLabel: {
        fontSize: 12,
        color: Colors.TEXT_MUTED,
        marginBottom: 4,
    },
    macroValue: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.PRIMARY,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.DIVIDER || '#E5E7EB',
        marginHorizontal: 16,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    settingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.TEXT_MAIN,
    },
    settingValue: {
        fontSize: 13,
        color: Colors.TEXT_MUTED,
        marginTop: 2,
    },
    dangerRow: {
        borderBottomWidth: 0,
    },
    footerSpace: {
        height: 40,
    },
    
    /* Modal Styles */
    modalContainer: {
        flex: 1,
        backgroundColor: Colors.BACKGROUND,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.DIVIDER || '#E5E7EB',
        backgroundColor: Colors.SURFACE,
    },
    modalCloseText: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.PRIMARY,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.TEXT_MAIN,
    },
    modalContent: {
        flex: 1,
    },
    modalCardContent: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 32,
        paddingBottom: 20,
    },
    modalLabel: {
        fontSize: 14,
        color: Colors.TEXT_MUTED,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    modalValueLarge: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
        marginBottom: 16,
        textAlign: 'center',
    },
    modalDescription: {
        fontSize: 14,
        color: Colors.TEXT_MUTED,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    detailsList: {
        width: '100%',
        marginTop: 16,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        paddingHorizontal: 12,
    },
    detailText: {
        fontSize: 13,
        color: Colors.TEXT_MAIN,
        marginLeft: 8,
        flex: 1,
        lineHeight: 18,
    },
    planCard: {
        backgroundColor: Colors.SURFACE_ELEVATED,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        width: '100%',
        borderWidth: 1,
        borderColor: Colors.BORDER,
    },
    planSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.TEXT_MUTED,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    planValue: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.PRIMARY,
    },
    macroRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    macroBox: {
        flex: 1,
        backgroundColor: Colors.BACKGROUND,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 8,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    macroBoxLabel: {
        fontSize: 12,
        color: Colors.TEXT_MUTED,
        marginBottom: 4,
    },
    macroBoxValue: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.PRIMARY,
    },
    tipsSection: {
        backgroundColor: Colors.SURFACE_ELEVATED,
        borderRadius: 20,
        padding: 16,
        marginTop: 8,
        borderWidth: 1,
        borderColor: Colors.BORDER,
    },
    tipsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.TEXT_MAIN,
        marginBottom: 12,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    tipText: {
        fontSize: 13,
        color: Colors.TEXT_MAIN,
        marginLeft: 8,
        flex: 1,
        lineHeight: 18,
    },
    noDataText: {
        fontSize: 16,
        color: Colors.TEXT_MUTED,
        textAlign: 'center',
        marginTop: 20,
        lineHeight: 22,
    },
    editButton: {
        backgroundColor: Colors.PRIMARY,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginTop: 24,
    },
    editButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    optionsContainer: {
        width: '100%',
        marginTop: 20,
    },
    optionCard: {
        backgroundColor: Colors.SURFACE_ELEVATED,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 2,
        borderColor: Colors.DIVIDER || '#E5E7EB',
    },
    selectedOptionCard: {
        borderColor: Colors.PRIMARY,
        backgroundColor: `${Colors.PRIMARY}10`,
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.TEXT_MAIN,
        marginLeft: 12,
    },
    selectedOptionText: {
        color: Colors.PRIMARY,
        fontWeight: '600',
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: Colors.TEXT_MUTED,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.TEXT_MAIN,
    },
    saveButton: {
        flex: 1,
        backgroundColor: Colors.PRIMARY,
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 6,
    },
    nameModalBody: {
        paddingHorizontal: 16,
        paddingTop: 24,
    },
    nameInput: {
        backgroundColor: Colors.SURFACE,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.DIVIDER || '#E5E7EB',
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: Colors.TEXT_MAIN,
        marginTop: 8,
    },
});
