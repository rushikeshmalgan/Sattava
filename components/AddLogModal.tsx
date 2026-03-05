import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';

import { addActivityLog } from '../services/userService';

interface AddLogModalProps {
    isVisible: boolean;
    onClose: () => void;
    userId: string | undefined;
}

import { useRouter } from 'expo-router';

const AddLogModal = ({ isVisible, onClose, userId }: AddLogModalProps) => {
    const router = useRouter();
    const options = [
        { id: 'exercise', title: 'Log Exercise', icon: 'fitness-outline', color: '#DC2626' },
        { id: 'water', title: 'Add 250ml Water', icon: 'water-outline', color: '#0284C7' },
        { id: 'food', title: 'Log Food', icon: 'search-outline', color: '#EA580C' },
        { id: 'scan', title: 'Scan Food', icon: 'scan-outline', color: '#10B981', isPremium: true },
    ];

    const handleOptionPress = async (id: string) => {
        if (!userId) {
            alert("Please sign in to log data");
            onClose();
            return;
        }

        const dateString = new Date().toISOString().split('T')[0];
        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (id === 'scan') {
            alert("Scan Food is a Premium Feature!");
        } else if (id === 'exercise') {
            onClose();
            router.push('/log-exercise');
            return;
        } else if (id === 'food') {
            onClose();
            router.push('/manual-food-log');
            return;
        } else if (id === 'water') {
            try {
                // Now using addActivityLog so it shows up in Recent Activity
                await addActivityLog(userId, dateString, {
                    id: Date.now().toString(),
                    name: 'Water Intake',
                    calories: 0,
                    time: timeString,
                    type: 'water',
                    amount: '0.25'
                });
                alert("Added 250ml Water!");
            } catch (error) {
                console.error("Failed to log water:", error);
                alert("Failed to log water.");
            }
        } else {
            console.log(`Selected option: ${id}`);
        }
        onClose();
    };

    return (
        <Modal
            transparent
            visible={isVisible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={styles.modalContainer}>
                    <View style={styles.grid}>
                        {options.map((option) => (
                            <TouchableOpacity
                                key={option.id}
                                style={styles.optionCard}
                                onPress={() => handleOptionPress(option.id)}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: `${option.color}15` }]}>
                                    <Ionicons name={option.icon as any} size={28} color={option.color} />
                                    {option.isPremium && (
                                        <View style={styles.premiumBadge}>
                                            <Ionicons name="star" size={10} color="#FFD700" />
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.optionTitle}>{option.title}</Text>
                                {option.isPremium && <Text style={styles.premiumLabel}>Premium</Text>}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
};

export default AddLogModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        padding: 24,
        paddingBottom: 130, 
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    optionCard: {
        width: '47.5%', 
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f5f5f5',
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        position: 'relative',
    },
    optionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
        textAlign: 'center',
    },
    premiumBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 4,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    premiumLabel: {
        fontSize: 10,
        color: Colors.PRIMARY,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginTop: 4,
    },
});
