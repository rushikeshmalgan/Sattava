import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';

interface AddLogModalProps {
    isVisible: boolean;
    onClose: () => void;
    userId: string | undefined;
}

import { useRouter } from 'expo-router';

const AddLogModal = ({ isVisible, onClose, userId }: AddLogModalProps) => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const options = [
        { id: 'exercise', title: 'Log Exercise', icon: 'walk', color: '#DC2626' },
        { id: 'water', title: 'Add Water Intake', icon: 'water-outline', color: '#0284C7' },
        { id: 'food', title: 'Add Food', icon: 'restaurant', color: '#EA580C' },
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
            router.push('/log');
            return;
        } else if (id === 'food') {
            onClose();
            router.push('/food-search');
            return;
        } else if (id === 'water') {
            onClose();
            router.push('/log/water-intake');
            return;
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
                <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 90 }]}>
                    <View style={styles.handle} />
                    <Text style={styles.modalTitle}>Quick Actions</Text>
                    <View style={styles.grid}>
                        {options.map((option) => (
                            <Pressable
                                key={option.id}
                                style={({ pressed }) => [
                                    styles.optionCard,
                                    pressed && styles.optionCardPressed,
                                ]}
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
                            </Pressable>
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
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: '#FFFFFF',
    },
    handle: {
        width: 42,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#D1D5DB',
        alignSelf: 'center',
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
        textAlign: 'center',
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    optionCard: {
        flexBasis: '47%',
        flexGrow: 1,
        maxWidth: '48%',
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
    optionCardPressed: {
        transform: [{ scale: 0.97 }],
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
