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
import { Colors } from '../constants/Colors';
import { addActivityLog } from '../services/userService';

const ManualLogScreen = () => {
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
            const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            await addActivityLog(user.id, dateString, {
                id: Date.now().toString(),
                name: 'Manual Exercise',
                calories: Number(calories),
                time: timeString,
                type: 'exercise'
            });

            // Navigate back to home tab
            router.replace('/(tabs)/home');
        } catch (error) {
            console.error('Failed to log calories:', error);
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
                    <Text style={styles.headerTitle}>Manual Log</Text>
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
                            <Text style={styles.unitText}>kcal</Text>
                        </View>

                        <Text style={styles.infoText}>
                            Enter the estimated calories you've burned during your activity.
                        </Text>
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
                                <Text style={styles.logButtonText}>Log Calories</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            <View style={[styles.systemMask, { height: insets.bottom }]} />
        </View>
    );
};

export default ManualLogScreen;

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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        padding: 5,
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
        borderRadius: 70,
        backgroundColor: '#FFF5F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom:30,
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
    infoText: {
        fontSize: 14,
        color: Colors.TEXT_MUTED,
        textAlign: 'center',
        lineHeight: 20,
    },
    footer: {
        padding: 20,
    },
    systemMask: {
        width: '100%',
        backgroundColor: Colors.BACKGROUND,
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
});
