import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';

interface WaterIntakeCardProps {
    drunkMl: number;
    targetMl: number;
    onEdit: () => void;
    onAddWater: () => void;
}

const WaterIntakeCard = ({
    drunkMl,
    targetMl,
    onEdit,
    onAddWater
}: WaterIntakeCardProps) => {
    const ML_PER_GLASS = 250;
    const maxGlasses = 9;

    const targetGlasses = Math.min(Math.ceil(targetMl / ML_PER_GLASS), maxGlasses);
    const currentGlassesFloat = drunkMl / ML_PER_GLASS;
    const fullGlasses = Math.floor(currentGlassesFloat);
    const partialAmount = currentGlassesFloat - fullGlasses;
    const hasHalfGlass = partialAmount >= 0.2 && partialAmount <= 0.8; 

    const glasses = [];
    for (let i = 0; i < targetGlasses; i++) {
        if (i < fullGlasses) {
            glasses.push('full');
        } else if (i === fullGlasses && partialAmount > 0) {
            if (partialAmount > 0.8) {
                glasses.push('full');
            } else if (partialAmount >= 0.2) {
                glasses.push('half');
            } else {
                glasses.push('empty');
            }
        } else {
            glasses.push('empty');
        }
    }

    const glassesLeft = Math.max(Math.ceil((targetMl - drunkMl) / ML_PER_GLASS), 0);

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.titleGroup}>
                    <Text style={styles.title}>Water Intake</Text>
                </View>
                <TouchableOpacity onPress={onEdit} style={styles.editButton}>
                    <Ionicons name="pencil" size={16} color={Colors.TEXT_MUTED} />
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                activeOpacity={0.6}
                onPress={onAddWater}
                style={styles.glassContainer}
            >
                <View style={styles.glassRow}>
                    {glasses.map((type, index) => (
                        <Image
                            key={index}
                            source={
                                type === 'full'
                                    ? require('../assets/images/full_glass.png')
                                    : type === 'half'
                                        ? require('../assets/images/half_glass.png')
                                        : require('../assets/images/empty_glass.png')
                            }
                            style={styles.glassIcon}
                            resizeMode="contain"
                        />
                    ))}
                    {targetGlasses < maxGlasses && (
                        <Ionicons name="add-circle-outline" size={24} color={Colors.PRIMARY} style={{ marginLeft: 4 }} />
                    )}
                </View>
            </TouchableOpacity>

            <View style={styles.footer}>
                <Text style={styles.statsText}>
                    {Math.round(drunkMl)}ml / {Math.round(targetMl)}ml
                </Text>
                <Text style={styles.leftText}>
                    {glassesLeft > 0 ? `${glassesLeft} ${glassesLeft === 1 ? 'glass' : 'glasses'} left` : 'Target reached! 🎉'}
                </Text>
            </View>
        </View>
    );
};

export default WaterIntakeCard;

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        marginVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    titleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.TEXT_MAIN,
    },
    editButton: {
        padding: 4,
    },
    glassContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    glassRow: {
        flexDirection: 'row',
        gap: 6,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    glassIcon: {
        width: 28,
        height: 38,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5',
        paddingTop: 15,
    },
    statsText: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.PRIMARY,
    },
    leftText: {
        fontSize: 14,
        color: Colors.TEXT_MUTED,
        fontWeight: '600',
    },
});
