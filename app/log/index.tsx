import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';

const LogExerciseScreen = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const options = [
        {
            id: 'cardio',
            title: 'Cardio',
            description: 'Cardio, Walking, Cycling etc',
            icon: 'walk',
            color: '#3B82F6'
        },
        {
            id: 'weight',
            title: 'Weight Lifting',
            description: 'Gym, Machine etc',
            icon: 'barbell-outline',
            color: '#EF4444'
        },
        {
            id: 'manual',
            title: 'Manual',
            description: 'Enter calories Burn Manually',
            icon: 'fitness',
            color: '#10B981'
        }
    ];

    const handleOptionPress = (option: typeof options[0]) => {
        if (option.id === 'manual') {
            router.push('/log/manual-exercise');
            return;
        }

        router.push({
            pathname: '/log/exercise-details',
            params: {
                title: option.title,
                description: option.description,
                type: option.id
            }
        });
    };

    return (
        <View style={styles.mainContainer}>
            {/* Solid status bar mask */}
            <View style={{ height: insets.top, backgroundColor: Colors.BACKGROUND }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.TEXT_MAIN} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Log Exercise</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.optionsContainer}>
                    {options.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            style={styles.optionCard}
                            onPress={() => handleOptionPress(option)}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: `${option.color}15` }]}>
                                <Ionicons name={option.icon as any} size={28} color={option.color} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.optionTitle}>{option.title}</Text>
                                <Text style={styles.optionDescription}>{option.description}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={Colors.TEXT_MUTED} />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Solid System Navigation Mask */}
            <View style={[styles.systemMask, { height: insets.bottom }]} />
        </View>
    );
};

export default LogExerciseScreen;

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
    scrollContent: {
        padding: 20,
    },
    optionsContainer: {
        gap: 16,
    },
    systemMask: {
        width: '100%',
        backgroundColor: Colors.BACKGROUND,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f5f5f5',
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.TEXT_MAIN,
        marginBottom: 4,
    },
    optionDescription: {
        fontSize: 14,
        color: Colors.TEXT_MUTED,
    },
});
