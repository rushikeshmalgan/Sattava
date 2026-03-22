import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { addExerciseLog } from '../../services/logService';

const ManualCaloriesScreen = () => {
    const { user } = useUser();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [calories, setCalories] = useState('');
    const [isLogging, setIsLogging] = useState(false);

    const handleLog = async () => {
        if (!user?.id) return;

        if (!calories || isNaN(Number(calories))) {
            alert("Please enter a valid number for calories");
            return;
        }

        setIsLogging(true);
        try {
            const dateString = new Date().toISOString().split('T')[0];

            await addExerciseLog(user.id, dateString, {
                id: Date.now().toString(),
                type: 'manual',
                name: 'Manual Exercise',
                duration: 0, // Manual entry might not have duration
                calories: Number(calories),
                intensity: 'N/A'
            });

            // Redirect home
            router.replace('/(tabs)/home');
        } catch (error) {
            console.error('Failed to log exercise:', error);
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
                    <Text style={styles.headerTitle}>Manual Entry</Text>
                </View>

                <View style={styles.container}>
                    <View style={styles.content}>
                        <View style={styles.fireIconContainer}>
                            <Ionicons name="flame" size={80} color="#FF6347" />
                        </View>

                        <Text style={styles.label}>Calories Burned</Text>

                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="0"
                                value={calories}
                                onChangeText={setCalories}
                                keyboardType="numeric"
                                autoFocus={true}
                                placeholderTextColor={Colors.TEXT_MUTED}
                            />
                            <Text style={styles.unitText}>Calories</Text>
                        </View>
                    </View>

                    <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                        <TouchableOpacity
                            style={[styles.logButton, isLogging && { opacity: 0.7 }]}
                            onPress={handleLog}
                            disabled={isLogging}
                        >
                            {isLogging ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.logButtonText}>Log Workout</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            <View style={[styles.systemMask, { height: insets.bottom }]} />
        </View>
    );
};

export default ManualCaloriesScreen;

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
        paddingTop: 30,
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingTop: 40,
    },
    fireIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFF5F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    label: {
        fontSize: 17,
        fontWeight: '600',
        color: Colors.TEXT_MAIN,
        marginBottom: 10,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'baseline',
        borderBottomWidth: 2,
        borderBottomColor: Colors.PRIMARY,
        paddingBottom: 5,
        marginBottom: 20,
    },
    input: {
        fontSize: 38,
        fontWeight: 'bold',
        color: Colors.TEXT_MAIN,
        minWidth: 100,
        textAlign: 'center',
    },
    unitText: {
        fontSize: 22,
        fontWeight: '600',
        color: Colors.TEXT_MUTED,
        marginLeft: 10,
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
