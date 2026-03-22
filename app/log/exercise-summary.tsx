import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { addExerciseLog } from '../../services/logService';

const ExerciseSummaryScreen = () => {
    const { user } = useUser();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { calories, title, type, intensity, duration } = useLocalSearchParams() as {
        calories: string;
        title: string;
        type: 'cardio' | 'weight' | 'manual';
        intensity: string;
        duration: string;
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleLog = async () => {
        if (!user?.id) return;

        setIsSaving(true);
        try {
            const dateString = new Date().toISOString().split('T')[0];

            await addExerciseLog(user.id, dateString, {
                id: Date.now().toString(),
                type: type,
                name: title,
                duration: Number(duration),
                calories: Number(calories),
                intensity: intensity
            });

            // Redirect home
            router.replace('/(tabs)/home');
        } catch (error) {
            console.error('Failed to log exercise:', error);
            alert('Failed to save workout. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={styles.mainContainer}>
            <View style={{ height: insets.top, backgroundColor: Colors.BACKGROUND }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.TEXT_MAIN} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Summary</Text>
            </View>

            <View style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.fireIconContainer}>
                        <Ionicons name="flame" size={100} color="#FF6347" />
                    </View>

                    <Text style={styles.label}>Your Workout Burned</Text>

                    <View style={styles.caloriesContainer}>
                        <Text style={styles.caloriesValue}>{calories}</Text>
                        <Text style={styles.unitText}>Calories</Text>
                    </View>

                    <View style={styles.infoLineContainer}>
                        <Text style={styles.infoLineText}>
                            {type === 'cardio' ? 'Cardio' : 'Weight Lifting'} • {duration} min • {intensity}
                        </Text>
                    </View>
                </View>

                <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                    <TouchableOpacity
                        style={[styles.logButton, isSaving && { opacity: 0.7 }]}
                        onPress={handleLog}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.logButtonText}>Log Workout</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.systemMask, { height: insets.bottom }]} />
        </View>
    );
};

export default ExerciseSummaryScreen;

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
        backgroundColor: '#fff',
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
    container: {
        flex: 1,
        justifyContent: 'space-between',
        paddingTop: 20,
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingTop: 40,
    },
    fireIconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#FFF5F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    label: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.TEXT_MAIN,
        marginBottom: 10,
    },
    caloriesContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 40,
    },
    caloriesValue: {
        fontSize: 64,
        fontWeight: '900',
        color: Colors.TEXT_MAIN,
    },
    unitText: {
        fontSize: 24,
        fontWeight: '600',
        color: Colors.TEXT_MUTED,
        marginLeft: 10,
    },
    infoLineContainer: {
        marginTop: -10,
    },
    infoLineText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.TEXT_MUTED,
    },
    footer: {
        padding: 20,
    },
    logButton: {
        backgroundColor: Colors.PRIMARY,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
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
