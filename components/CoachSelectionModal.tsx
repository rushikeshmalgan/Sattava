import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export type CoachType = 'Strict' | 'Neutral' | 'Friendly';

interface CoachSelectionModalProps {
    isVisible: boolean;
    onSelect: (coach: CoachType) => void;
    onClose: () => void;
}

const COACHES: { id: CoachType; emoji: string; title: string; desc: string; color: string }[] = [
    { id: 'Friendly', emoji: '😊', title: 'Friendly & Supportive', desc: 'Positive encouragement, gentle nudges.', color: '#10B981' },
    { id: 'Neutral', emoji: '🙂', title: 'Neutral & Factual', desc: 'Direct, data-driven insights.', color: '#3B82F6' },
    { id: 'Strict', emoji: '💪', title: 'Strict & Disciplined', desc: 'No excuses, tough love.', color: '#EF4444' },
];

export default function CoachSelectionModal({ isVisible, onSelect, onClose }: CoachSelectionModalProps) {
    const { theme, isDark } = useTheme();
    const router = useRouter();
    const [isPro, setIsPro] = React.useState(false);

    React.useEffect(() => {
        if (isVisible) {
            AsyncStorage.getItem('isPro').then(val => setIsPro(val === 'true'));
        }
    }, [isVisible]);

    return (
        <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <BlurView intensity={isDark ? 40 : 80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={theme.textMuted} />
                    </TouchableOpacity>
                    
                    <Text style={[styles.title, { color: theme.text }]}>Choose Your AI Coach</Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                        How would you like Sattva to guide you on your fitness journey?
                    </Text>

                    <View style={styles.optionsList}>
                        {COACHES.map(coach => (
                                <TouchableOpacity
                                    key={coach.id}
                                    style={[styles.optionCard, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: theme.border }]}
                                    onPress={() => {
                                        if (coach.id !== 'Neutral' && !isPro) {
                                            onClose();
                                            router.push('/subscription');
                                        } else {
                                            onSelect(coach.id);
                                        }
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.emojiBox, { backgroundColor: coach.color + '20' }]}>
                                        <Text style={styles.emoji}>{coach.emoji}</Text>
                                    </View>
                                    <View style={styles.optionText}>
                                        <Text style={[styles.optionTitle, { color: theme.text }]}>{coach.title}</Text>
                                        <Text style={[styles.optionDesc, { color: theme.textMuted }]}>{coach.desc}</Text>
                                    </View>
                                    {coach.id !== 'Neutral' && !isPro ? (
                                        <Ionicons name="lock-closed" size={20} color={theme.textMuted} />
                                    ) : (
                                        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
                                    )}
                                </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    modalBox: {
        borderRadius: 24,
        padding: 24,
        paddingTop: 36,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
        position: 'relative',
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 4,
        zIndex: 10,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    optionsList: {
        gap: 12,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 16,
    },
    emojiBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emoji: {
        fontSize: 24,
    },
    optionText: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    optionDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
});
