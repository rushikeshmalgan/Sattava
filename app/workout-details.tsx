import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { Colors } from '../constants/Colors';
import { addActivityLog } from '../services/userService';

const CALORIE_RATES = {
    Low: 5,
    Medium: 8,
    High: 12
};

const WorkoutDetailsScreen = () => {
    const { user } = useUser();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { title, description, type } = useLocalSearchParams();

    const [intensity, setIntensity] = useState<'Low' | 'Medium' | 'High'>('Medium');
    const [duration, setDuration] = useState('30');
    const [manualDuration, setManualDuration] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const durationOptions = ['15', '30', '60', '90'];

    const handleContinue = async () => {
        if (!user?.id) return;

        const finalDuration = Number(manualDuration || duration);
        if (isNaN(finalDuration) || finalDuration <= 0) {
            alert("Please enter a valid duration");
            return;
        }

        const caloriesBurned = Math.round(finalDuration * CALORIE_RATES[intensity]);

        setIsSaving(true);
        try {
            const dateString = new Date().toISOString().split('T')[0];
            const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            await addActivityLog(user.id, dateString, {
                id: Date.now().toString(),
                name: `${title} (${intensity})`,
                calories: caloriesBurned,
                time: timeString,
                type: 'exercise',
                amount: `${finalDuration} min`
            });

            router.replace('/(tabs)/home');
        } catch (error) {
            console.error('Failed to log workout:', error);
            alert('Failed to save workout. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const renderIntensityOption = (label: 'Low' | 'Medium' | 'High') => {
        const isSelected = intensity === label;
        return (
            <TouchableOpacity
                key={label}
                onPress={() => setIntensity(label)}
                style={[
                    styles.intensityOption,
                    isSelected && styles.intensityOptionSelected
                ]}
            >
                <Text style={[
                    styles.intensityText,
                    isSelected && styles.intensityTextSelected
                ]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
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
                        <View style={styles.intensityContainer}>
                            {renderIntensityOption('Low')}
                            {renderIntensityOption('Medium')}
                            {renderIntensityOption('High')}
                        </View>
                        <View style={styles.sliderTrack}>
                            <View style={[
                                styles.sliderThumb,
                                intensity === 'Low' && { left: '10%' },
                                intensity === 'Medium' && { left: '46%' },
                                intensity === 'High' && { left: '82%' },
                            ]} />
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

export default WorkoutDetailsScreen;

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: Colors.BACKGROUND,
    },
    safeArea: {
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
        backgroundColor: '#fff',
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
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.TEXT_MAIN,
        marginBottom: 20,
    },
    intensityContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    intensityOption: {
        paddingVertical: 8,
        paddingHorizontal: 15,
    },
    intensityOptionSelected: {
    },
    intensityText: {
        fontSize: 16,
        color: Colors.TEXT_MUTED,
        fontWeight: '600',
    },
    intensityTextSelected: {
        color: Colors.PRIMARY,
        fontWeight: 'bold',
    },
    sliderTrack: {
        height: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        position: 'relative',
        marginHorizontal: 10,
    },
    sliderThumb: {
        position: 'absolute',
        top: -6,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.PRIMARY,
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
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
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#F3F4F6',
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
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: Colors.BACKGROUND,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
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
