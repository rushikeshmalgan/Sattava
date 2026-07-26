import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
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
import { db } from '../../firebaseConfig';

import { Animated } from 'react-native';

const MET_VALUES: any = {
    cardio: { Low: 5, Medium: 8, High: 11 },
    weight: { Low: 3, Medium: 5, High: 7 }
};

const ExerciseDetailsScreen = () => {
    const { user } = useUser();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { title, description, type } = useLocalSearchParams();

    const [intensity, setIntensity] = useState<'Low' | 'Medium' | 'High'>('Medium');
    const [duration, setDuration] = useState('30');
    const [manualDuration, setManualDuration] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const [containerWidth, setContainerWidth] = useState(0);
    const animatedLeft = React.useRef(new Animated.Value(0)).current;

    const durationOptions = ['15', '30', '60', '90'];

    // Update animated value whenever intensity changes
    React.useEffect(() => {
        if (containerWidth > 0) {
            const segmentWidth = containerWidth / 3;
            let target = 0;
            if (intensity === 'Low') target = 0;
            if (intensity === 'Medium') target = segmentWidth;
            if (intensity === 'High') target = segmentWidth * 2;
            
            Animated.spring(animatedLeft, {
                toValue: target,
                useNativeDriver: false,
                tension: 50,
                friction: 8
            }).start();
        }
    }, [intensity, containerWidth]);

    const handleContinue = async () => {
        if (!user?.id) return;

        const finalDuration = Number(manualDuration || duration);
        if (isNaN(finalDuration) || finalDuration <= 0) {
            alert("Please enter a valid duration");
            return;
        }

        setIsSaving(true);
        try {
            // 1. Fetch User Profile for Weight
            const userDoc = await getDoc(doc(db, 'users', user.id));
            if (!userDoc.exists()) {
                throw new Error("User profile not found");
            }

            const profile = userDoc.data().physicalProfile;
            const weight = Number(profile?.weightKg) || 70; // Default to 70kg if not set

            // 2. Determine MET value
            const workoutType = (type as string) === 'cardio' ? 'cardio' : 'weight';
            const met = MET_VALUES[workoutType][intensity];

            // 3. New Formula: Calories = Duration * (MET * 3.5 * Weight) / 200
            const caloriesBurned = Math.round(finalDuration * (met * 3.5 * weight) / 200);

            // 4. Navigate to Summary Screen
            router.push({
                pathname: '/log/exercise-summary',
                params: {
                    calories: caloriesBurned,
                    title,
                    type: workoutType,
                    intensity,
                    duration: finalDuration
                }
            });
        } catch (error) {
            console.error('Failed to calculate workout:', error);
            alert('Something went wrong. Please try again.');
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
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={Colors.TEXT_MAIN} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.titleSection}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.description}>{description}</Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Intensity of Workout</Text>
                        <View 
                            style={styles.segmentedControl}
                            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
                        >
                            <Animated.View style={[
                                styles.activeSegmentBackground,
                                {
                                    width: containerWidth / 3,
                                    left: animatedLeft
                                }
                            ]} />
                            
                            <TouchableOpacity 
                                style={styles.segment} 
                                onPress={() => setIntensity('Low')}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.segmentText,
                                    intensity === 'Low' && styles.segmentTextSelected
                                ]}>Low</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.segment} 
                                onPress={() => setIntensity('Medium')}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.segmentText,
                                    intensity === 'Medium' && styles.segmentTextSelected
                                ]}>Medium</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.segment} 
                                onPress={() => setIntensity('High')}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.segmentText,
                                    intensity === 'High' && styles.segmentTextSelected
                                ]}>High</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Duration</Text>
                        <View style={styles.chipsRow}>
                            {durationOptions.map((opt) => (
                                <TouchableOpacity
                                    key={opt}
                                    onPress={() => {
                                        setDuration(opt);
                                        setManualDuration('');
                                    }}
                                    style={[
                                        styles.chip,
                                        duration === opt && !manualDuration && styles.chipSelected
                                    ]}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        duration === opt && !manualDuration && styles.chipTextSelected
                                    ]}>
                                        {opt} min
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.manualLabel}>Enter manually (min)</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="time-outline" size={20} color={Colors.PRIMARY} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 45"
                                value={manualDuration}
                                onChangeText={(text) => {
                                    setManualDuration(text);
                                    setDuration('');
                                }}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                    <TouchableOpacity
                        style={[styles.continueButton, isSaving && { opacity: 0.7 }]}
                        onPress={handleContinue}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.continueButtonText}>Continue</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <View style={[styles.systemMask, { height: insets.bottom }]} />
        </View>
    );
};

export default ExerciseDetailsScreen;

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: Colors.BACKGROUND,
    },
    header: {
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
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    titleSection: {
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.TEXT_MAIN,
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        color: Colors.TEXT_MUTED,
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
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.TEXT_MAIN,
        marginBottom: 20,
    },
    segmentedControl: {
        flexDirection: 'row',
        height: 50,
        backgroundColor: Colors.SURFACE_DARK,
        borderRadius: 14,
        position: 'relative',
        padding: 4,
    },
    activeSegmentBackground: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        backgroundColor: Colors.SURFACE,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    segment: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.TEXT_MUTED,
    },
    segmentTextSelected: {
        color: Colors.PRIMARY,
        fontWeight: '700',
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    chip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: Colors.SURFACE_DARK,
        borderWidth: 1,
        borderColor: Colors.BORDER,
    },
    chipSelected: {
        backgroundColor: `${Colors.PRIMARY}15`,
        borderColor: Colors.PRIMARY,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.TEXT_MUTED,
    },
    chipTextSelected: {
        color: Colors.PRIMARY,
    },
    manualLabel: {
        fontSize: 14,
        color: Colors.TEXT_MUTED,
        marginBottom: 8,
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
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: Colors.BACKGROUND,
        borderTopWidth: 1,
        borderTopColor: Colors.BORDER,
    },
    systemMask: {
        width: '100%',
        backgroundColor: Colors.BACKGROUND,
    },
    continueButton: {
        backgroundColor: Colors.PRIMARY,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    continueButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
