import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Colors } from '../constants/Colors';
import { UserProfileData } from '../utils/storage';

const TOTAL_STEPS = 5;

export default function Onboarding() {
    const router = useRouter();
    const { user } = useUser();
    const [currentStep, setCurrentStep] = useState(1);

    const [gender, setGender] = useState('');
    const [goal, setGoal] = useState('');
    const [activityLevel, setActivityLevel] = useState('');
    const [birthDay, setBirthDay] = useState('');
    const [birthMonth, setBirthMonth] = useState('');
    const [birthYear, setBirthYear] = useState('');
    const [heightFeet, setHeightFeet] = useState('');
    const [heightInches, setHeightInches] = useState('');
    const [weightKg, setWeightKg] = useState('');

    const isValidBirthdate = (): boolean => {
        const day = Number(birthDay);
        const month = Number(birthMonth);
        const year = Number(birthYear);
        const currentYear = new Date().getFullYear();

        if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
            return false;
        }

        if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > currentYear) {
            return false;
        }

        const date = new Date(year, month - 1, day);
        return (
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day
        );
    };

    const handleNext = async () => {
        if (currentStep === 1 && !gender) return Alert.alert("Required", "Please select a gender");
        if (currentStep === 2 && !goal) return Alert.alert("Required", "Please select a goal");
        if (currentStep === 3 && !activityLevel) return Alert.alert("Required", "Please select an activity level");
        if (currentStep === 4 && (!birthDay || !birthMonth || !birthYear)) return Alert.alert("Required", "Please enter your full birthdate");
        if (currentStep === 4 && !isValidBirthdate()) {
            return Alert.alert("Invalid Date", "Please enter a valid birthdate (DD/MM/YYYY).");
        }

        if (currentStep < TOTAL_STEPS) {
            setCurrentStep(currentStep + 1);
        } else {
            if (!heightFeet || !heightInches || !weightKg) {
                return Alert.alert("Required", "Please enter your full height and weight");
            }
            await completeOnboarding();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const completeOnboarding = async () => {
        if (!user?.id) return;

        const profileData: UserProfileData = {
            gender,
            goal,
            activityLevel,
            birthdate: {
                day: birthDay,
                month: birthMonth,
                year: birthYear,
            },
            heightFeet,
            heightInches,
            weightKg,
        };

        try {
            await setDoc(
                doc(db, 'users', user.id),
                {
                    physicalProfile: profileData,
                    updatedAt: new Date(),
                },
                { merge: true }
            );

            router.replace({
                pathname: '/generating-profile',
                params: { data: JSON.stringify(profileData) },
            });
        } catch (error) {
            console.error('Failed to save onboarding data:', error);
            Alert.alert('Error', 'Failed to save your profile. Please try again.');
        }
    };

    const renderProgressBar = () => {
        const progress = (currentStep / TOTAL_STEPS) * 100;
        return (
            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
        );
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Tell us about yourself</Text>
                        <Text style={styles.stepSubtitle}>To give you a better experience we need to know your gender</Text>

                        <View style={styles.genderContainer}>
                            <TouchableOpacity
                                style={[styles.genderCard, gender === 'Male' && styles.selectedCard]}
                                onPress={() => setGender('Male')}
                            >
                                <Ionicons
                                    name="male"
                                    size={48}
                                    color={gender === 'Male' ? Colors.PRIMARY : Colors.TEXT_MUTED}
                                />
                                <Text style={[styles.genderText, gender === 'Male' && styles.selectedText]}>Male</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.genderCard, gender === 'Female' && styles.selectedCard]}
                                onPress={() => setGender('Female')}
                            >
                                <Ionicons
                                    name="female"
                                    size={48}
                                    color={gender === 'Female' ? Colors.PRIMARY : Colors.TEXT_MUTED}
                                />
                                <Text style={[styles.genderText, gender === 'Female' && styles.selectedText]}>Female</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.genderCard, gender === 'Other' && styles.selectedCard]}
                                onPress={() => setGender('Other')}
                            >
                                <Ionicons
                                    name="person"
                                    size={48}
                                    color={gender === 'Other' ? Colors.PRIMARY : Colors.TEXT_MUTED}
                                />
                                <Text style={[styles.genderText, gender === 'Other' && styles.selectedText]}>Other</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );

            case 2:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>What is your goal?</Text>
                        <Text style={styles.stepSubtitle}>This helps us tailor your daily calorie recommendations.</Text>

                        <View style={styles.listContainer}>
                            {['Lose Weight', 'Maintain Weight', 'Gain Weight'].map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[styles.listCard, goal === item && styles.selectedCard]}
                                    onPress={() => setGoal(item)}
                                >
                                    <Ionicons
                                        name="locate-outline"
                                        size={32}
                                        color={goal === item ? Colors.PRIMARY : Colors.TEXT_MUTED}
                                    />
                                    <Text style={[styles.listText, goal === item && styles.selectedText]}>{item}</Text>
                                    {goal === item && <Ionicons name="checkmark-circle" size={24} color={Colors.PRIMARY} style={styles.checkIcon} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );

            case 3:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Activity Level</Text>
                        <Text style={styles.stepSubtitle}>How often do you exercise?</Text>

                        <View style={styles.listContainer}>
                            {['2-3 Days / Week', '3-4 Days / Week', '5-6 Days / Week'].map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[styles.listCard, activityLevel === item && styles.selectedCard]}
                                    onPress={() => setActivityLevel(item)}
                                >
                                    <Ionicons
                                        name="flame"
                                        size={32}
                                        color={activityLevel === item ? Colors.PRIMARY : Colors.TEXT_MUTED}
                                    />
                                    <Text style={[styles.listText, activityLevel === item && styles.selectedText]}>{item}</Text>
                                    {activityLevel === item && <Ionicons name="checkmark-circle" size={24} color={Colors.PRIMARY} style={styles.checkIcon} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );

            case 4:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>When were you born?</Text>
                        <Text style={styles.stepSubtitle}>Age is important for calculating metabolic rate.</Text>

                        <View style={styles.dateRow}>
                            <View style={styles.dateInputWrapper}>
                                <Text style={styles.inputLabel}>DD</Text>
                                <TextInput
                                    style={styles.dateInput}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                    placeholder="DD"
                                    placeholderTextColor={Colors.TEXT_MUTED}
                                    value={birthDay}
                                    onChangeText={setBirthDay}
                                />
                            </View>
                            <View style={styles.dateInputWrapper}>
                                <Text style={styles.inputLabel}>MM</Text>
                                <TextInput
                                    style={styles.dateInput}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                    placeholder="MM"
                                    placeholderTextColor={Colors.TEXT_MUTED}
                                    value={birthMonth}
                                    onChangeText={setBirthMonth}
                                />
                            </View>
                            <View style={[styles.dateInputWrapper, { flex: 2 }]}>
                                <Text style={styles.inputLabel}>YYYY</Text>
                                <TextInput
                                    style={styles.dateInput}
                                    keyboardType="number-pad"
                                    maxLength={4}
                                    placeholder="YYYY"
                                    placeholderTextColor={Colors.TEXT_MUTED}
                                    value={birthYear}
                                    onChangeText={setBirthYear}
                                />
                            </View>
                        </View>
                    </View>
                );

            case 5:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Your Measurements</Text>
                        <Text style={styles.stepSubtitle}>Almost there! Just a few more details.</Text>

                        <View style={styles.measurementSection}>
                            <Text style={styles.sectionTitle}>Height</Text>
                            <View style={styles.dateRow}>
                                <View style={styles.dateInputWrapper}>
                                    <Text style={styles.inputLabel}>Feet</Text>
                                    <TextInput
                                        style={styles.dateInput}
                                        keyboardType="number-pad"
                                        maxLength={1}
                                        placeholder="Ft"
                                        placeholderTextColor={Colors.TEXT_MUTED}
                                        value={heightFeet}
                                        onChangeText={setHeightFeet}
                                    />
                                </View>
                                <View style={styles.dateInputWrapper}>
                                    <Text style={styles.inputLabel}>Inches</Text>
                                    <TextInput
                                        style={styles.dateInput}
                                        keyboardType="number-pad"
                                        maxLength={2}
                                        placeholder="In"
                                        placeholderTextColor={Colors.TEXT_MUTED}
                                        value={heightInches}
                                        onChangeText={setHeightInches}
                                    />
                                </View>
                            </View>

                            <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Weight</Text>
                            <View style={styles.dateInputWrapper}>
                                <Text style={styles.inputLabel}>Kilograms</Text>
                                <View style={styles.weightInputContainer}>
                                    <Ionicons
                                        name="barbell"
                                        size={24}
                                        color={Colors.TEXT_MUTED}
                                        style={{ marginRight: 10 }}
                                    />
                                    <TextInput
                                        style={[styles.dateInput, { flex: 1, backgroundColor: 'transparent', height: '100%', marginBottom: 0 }]}
                                        keyboardType="number-pad"
                                        maxLength={3}
                                        placeholder="Kg"
                                        placeholderTextColor={Colors.TEXT_MUTED}
                                        value={weightKg}
                                        onChangeText={setWeightKg}
                                    />
                                    <Text style={styles.kgSuffix}>kg</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                );
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        {currentStep > 1 && <Ionicons name="arrow-back" size={28} color={Colors.TEXT_MAIN} />}
                    </TouchableOpacity>
                    <Text style={styles.headerText}>Step {currentStep} of {TOTAL_STEPS}</Text>
                    <View style={{ width: 44 }} />
                </View>

                {renderProgressBar()}

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {renderStepContent()}
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                        <Text style={styles.nextButtonText}>
                            {currentStep === TOTAL_STEPS ? 'Complete Profile' : 'Continue'}
                        </Text>
                    </TouchableOpacity>
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.BACKGROUND,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.TEXT_MAIN,
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: Colors.SURFACE,
        marginHorizontal: 24,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 30,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.PRIMARY,
        borderRadius: 3,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
    },
    stepContainer: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
        marginBottom: 10,
    },
    stepSubtitle: {
        fontSize: 16,
        color: Colors.TEXT_MUTED,
        marginBottom: 40,
        lineHeight: 24,
    },
    genderContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 20,
    },
    genderCard: {
        width: 140,
        height: 140,
        backgroundColor: Colors.SURFACE,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedCard: {
        backgroundColor: `${Colors.PRIMARY}15`, 
        borderColor: Colors.PRIMARY,
    },
    genderText: {
        marginTop: 12,
        fontSize: 18,
        fontWeight: '600',
        color: Colors.TEXT_MUTED,
    },
    selectedText: {
        color: Colors.PRIMARY,
    },
    listContainer: {
        gap: 16,
    },
    listCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.SURFACE,
        padding: 20,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    listText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.TEXT_MUTED,
        marginLeft: 16,
        flex: 1,
    },
    checkIcon: {
        marginLeft: 'auto',
    },
    dateRow: {
        flexDirection: 'row',
        gap: 16,
    },
    dateInputWrapper: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.TEXT_MUTED,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    dateInput: {
        backgroundColor: Colors.SURFACE,
        height: 60,
        borderRadius: 12,
        fontSize: 24,
        fontWeight: '600',
        color: Colors.TEXT_MAIN,
        textAlign: 'center',
        marginBottom: 20,
    },
    weightInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.SURFACE,
        height: 60,
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    kgSuffix: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.TEXT_MUTED,
    },
    measurementSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.TEXT_MAIN,
        marginBottom: 16,
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'ios' ? 0 : 24,
        paddingTop: 16,
        backgroundColor: Colors.BACKGROUND,
    },
    nextButton: {
        backgroundColor: Colors.PRIMARY,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    nextButtonText: {
        color: Colors.TEXT_INVERSE,
        fontSize: 18,
        fontWeight: '600',
    },
});
